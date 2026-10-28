const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('deployment migration removes invented locale defaults', () => {
  const migration = read('backend/migrations/013_remove_invented_locale_defaults.sql');
  assert.match(migration, /shows\s+ALTER COLUMN country DROP DEFAULT/i);
  assert.match(migration, /budgets\s+ALTER COLUMN currency DROP DEFAULT/i);
});

test('show and import writes do not silently substitute USA or USD', () => {
  const server = read('backend/server.js');
  const showRoute = read('src/app/api/shows/route.ts');
  const form = read('src/components/shows/CreateShowForm.tsx');

  assert.doesNotMatch(server, /show\.country\s*\|\|\s*['"]USA['"]/);
  assert.doesNotMatch(server, /budget\.currency\s*\|\|\s*['"]USD['"]/);
  assert.doesNotMatch(showRoute, /venueCountry\s*\|\|\s*['"]USA['"]/);
  assert.doesNotMatch(form, /currency:\s*['"]USD['"]/);
  assert.match(server, /valid three-letter currency code are required/);
});

test('tour totals are grouped by currency instead of added together', () => {
  const detail = read('src/app/tours/[id]/page.tsx');
  const listing = read('src/app/tours/page.tsx');

  assert.match(detail, /groupBudgetTotalsByCurrency/);
  assert.match(detail, /currencies\.map/);
  assert.match(listing, /currencyTotals/);
  assert.match(listing, /currencyTotals\.map/);
});

test('CSV currency detection has no USD fallback', () => {
  const validator = read('src/lib/csv/validator.ts');
  const validationStep = read('src/app/import/components/Step3Validation.tsx');

  assert.match(validator, /const currency = dominant\?\.\[0\] \|\| null/);
  assert.doesNotMatch(validator, /currency: string = ['"]USD['"]/);
  assert.match(validationStep, /I confirm that this import should be saved in/);
  assert.match(validationStep, /disabled=\{!effectiveCurrency\}/);
});

test('legacy missing currencies stay visibly unspecified', () => {
  const bookkeeping = read('src/app/bookkeeping/page.tsx');
  const showsTable = read('src/components/shows/ShowsTable.tsx');

  assert.doesNotMatch(bookkeeping, /budget\.currency \|\| ['"]USD['"]/);
  assert.match(bookkeeping, /currency not set/);
  assert.match(bookkeeping, /!selectedCurrency \|\| isCreating/);
  assert.doesNotMatch(showsTable, /show\.currency \? `\$\{show\.currency\} ` : ['"]\$['"]/);
  assert.match(showsTable, /currency not set/);
});

test('tour show cards render fees with persisted currency instead of dollars', () => {
  const page = read('src/app/tours/[id]/page.tsx');
  assert.match(page, /showBudget\?\.currency \|\| show\.currency \|\| tour\?\.currency/);
  assert.match(page, /\^\[A-Z\]\{3\}\$/);
  assert.match(page, /formatMoney\(Number\(show\.guarantee \|\| 0\), feeCurrency\)/);
  assert.doesNotMatch(page, /Fee: \$\{show\.guarantee/);
});

test('show writes and reads preserve authoritative budget or tour currency', () => {
  const server = read('backend/server.js');
  const showRoute = read('src/app/api/shows/route.ts');
  const external = read('backend/day-sheet-collaborators.js');
  assert.match(showRoute, /currency: body\.currency \|\| null/);
  assert.match(server, /effectiveShowCurrencySql/);
  assert.match(server, /min\(upper\(trim\(budget\.currency\)\)\)/);
  assert.match(server, /CASE WHEN upper\(trim\(\$\{showAlias\}\.currency\)\)/);
  assert.match(external, /min\(upper\(trim\(budget\.currency\)\)\)/);
});
