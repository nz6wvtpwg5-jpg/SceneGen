const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('flexible intake supports spreadsheets, documents, text and screenshots', () => {
  const upload = read('src/app/import/components/Step1Upload.tsx');
  const extract = read('src/app/api/import/extract/route.ts');
  const intake = read('src/lib/import/intake.ts');
  assert.match(upload, /\.csv,\.tsv,\.xlsx,\.txt,\.docx,\.pdf,\.png,\.jpg,\.jpeg,\.webp/);
  assert.match(upload, /Extract pasted schedule/);
  assert.match(extract, /ExcelJS/);
  assert.match(extract, /mammoth\.extractRawText/);
  assert.match(extract, /PDFParse/);
  assert.match(extract, /recognize\(bytes, 'eng'/);
  assert.match(extract, /MAX_BYTES = 10 \* 1024 \* 1024/);
  assert.match(intake, /rows\.slice\(0, 500\)/);
});

test('column mapping recognises aliases and requires explicit date and city targets', () => {
  const mapper = read('src/lib/csv/mapper.ts');
  const mapping = read('src/app/import/components/Step2Mapping.tsx');
  const validator = read('src/lib/csv/validator.ts');
  assert.match(mapper, /showdate: 'date'/);
  assert.match(mapper, /market: 'city'/);
  assert.match(mapper, /guarantee: 'fee'/);
  assert.match(mapper, /return createMapping\(header, 'ignore'\)/);
  assert.match(mapping, /Change any that are wrong/);
  assert.match(mapping, /Master Tour layout detected/);
  assert.match(validator, /mapping\.scenegenField === 'date'/);
  assert.match(validator, /mapping\.scenegenField === 'city'/);
});

test('duplicate protection is tenant scoped, locked and non-destructive by default', () => {
  const server = read('backend/server.js');
  const validation = read('src/app/import/components/Step3Validation.tsx');
  assert.match(server, /app\.post\('\/api\/import\/preview'/);
  assert.match(server, /WHERE entity_id=\$1::uuid AND date::date = ANY/);
  assert.match(server, /pg_advisory_xact_lock/);
  assert.match(server, /duplicatePolicy === 'import_anyway'/);
  assert.match(server, /duplicatesSkipped/);
  assert.doesNotMatch(server, /UPDATE shows[\s\S]{0,120}duplicate/i);
  assert.match(validation, /Skip existing dates/);
});

test('concierge migrations retain owner-only audit history without source contents', () => {
  const migration = read('backend/migrations/049_import_migrations.sql');
  const server = read('backend/server.js');
  const playbook = read('CONCIERGE_MIGRATION_PLAYBOOK.md');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS import_batches/);
  assert.match(migration, /source_fingerprint TEXT NOT NULL/);
  assert.doesNotMatch(migration, /source_content|file_content|raw_text/);
  assert.match(server, /app\.get\('\/api\/import\/history'/);
  assert.match(server, /administrator_id::text=\$2::text/);
  assert.match(playbook, /Never borrow or request their password/);
});
