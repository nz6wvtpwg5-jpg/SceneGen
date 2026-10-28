const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('tour currency migration repairs only unambiguous legacy data', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations/020_tour_currency_integrity.sql'), 'utf8');
  assert.match(migration, /CHECK \(currency IS NULL OR currency ~ '\^\[A-Z\]\{3\}\$'\)/);
  assert.match(migration, /HAVING count\(DISTINCT currency\) = 1/);
  assert.match(migration, /show_record\.currency IS DISTINCT FROM show_currency\.currency/);
  assert.match(migration, /tour_record\.currency IS NULL/);
});

test('a later reconciliation repairs stale show values from authoritative currency', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations/021_reconcile_show_currencies.sql'), 'utf8');
  assert.match(migration, /budget\.show_id = show_record\.id/);
  assert.match(migration, /budget\.tour_id = show_record\.tour_id/);
  assert.match(migration, /HAVING count\(DISTINCT upper\(trim\(budget\.currency\)\)\) = 1/);
  assert.match(migration, /CASE WHEN upper\(trim\(show_record\.currency\)\)/);
  assert.match(migration, /show_record\.currency IS DISTINCT FROM resolved\.currency/);
});

test('show and tour creation preserve explicit currency integrity', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /let showCurrency = normalizeCurrencyCode\(currency\)/);
  assert.match(server, /SELECT currency FROM tours WHERE id::text = \$1 AND entity_id::text = \$2/);
  assert.match(server, /promoter_email, promoter_phone, currency/);
  assert.match(server, /const normalizedCurrency = currency \? normalizeCurrencyCode\(currency\) : null/);
  assert.match(server, /INSERT INTO tours[\s\S]*status, currency/);
  assert.match(server, /totalRevenue: row\.total_revenue,[\s\S]*currency: row\.currency/);
});

test('imports require and propagate one confirmed tour currency', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const validation = fs.readFileSync(path.join(root, '../src/app/import/components/Step3Validation.tsx'), 'utf8');
  const importTypes = fs.readFileSync(path.join(root, '../src/types/import.ts'), 'utf8');
  assert.match(server, /budgetCurrencies\.length > 1/);
  assert.match(server, /All imported budgets must use the confirmed tour currency/);
  assert.match(server, /Confirm one three-letter tour currency before importing/);
  assert.match(server, /SELECT id, start_date, end_date, currency FROM tours WHERE id::text = \$1 AND entity_id::text = \$2/);
  assert.match(server, /CURRENCY_CONFLICT/);
  assert.match(server, /UPDATE tours SET currency = \$1 WHERE id = \$2/);
  assert.match(server, /show_type, currency[\s\S]*importCurrency/);
  assert.match(validation, /endDate: dateRange\?\.endDate,[\s\S]*currency: effectiveCurrency/);
  assert.match(validation, /id: selectedTourId,[\s\S]*currency: effectiveCurrency/);
  assert.match(importTypes, /tour\?:[\s\S]*currency\?: string/);
});
