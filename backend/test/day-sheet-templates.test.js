/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BUILT_INS, templateKindForShow, shifted } = require('../day-sheet-templates');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('built-in schedules cover each day type and recommend sensible defaults', () => {
  assert.deepEqual(BUILT_INS.map(template => template.templateKind), ['show_day', 'travel_day', 'festival_day', 'off_day']);
  assert.equal(templateKindForShow({ show_type: 'travel_day' }), 'travel_day');
  assert.equal(templateKindForShow({ show_type: 'off_day' }), 'off_day');
  assert.equal(templateKindForShow({ show_type: 'show', venue_name: 'Northside Festival' }), 'festival_day');
  assert.equal(templateKindForShow({ show_type: 'show', venue_name: 'The Forum' }), 'show_day');
});

test('bulk time shifts wrap across midnight and report day movement', () => {
  assert.deepEqual(shifted('23:45', 30), { value: '00:15', days: 1 });
  assert.deepEqual(shifted('00:15', -30), { value: '23:45', days: -1 });
  assert.deepEqual(shifted(null, 30), { value: null, days: 0 });
});

test('template storage is organisation scoped and excludes show-specific data', () => {
  const migration = read('backend/migrations/050_day_sheet_templates.sql');
  const service = read('backend/day-sheet-templates.js');
  assert.match(migration, /entity_id UUID NOT NULL REFERENCES entities/);
  assert.match(migration, /Organisation-owned reusable schedule templates/);
  assert.doesNotMatch(migration, /venue_name|promoter|guarantee|financial|contact_email/);
  assert.match(service, /WHERE id=\$1::uuid AND entity_id=\$2::uuid/);
  assert.match(service, /sourceShowId[\s\S]*sourceShowId === req\.params\.id/);
  assert.match(service, /Source show not found/);
});

test('safe application is the default and destructive replacement is explicit', () => {
  const service = read('backend/day-sheet-templates.js');
  const ui = read('src/components/shows/ScheduleTemplates.tsx');
  assert.match(service, /mode === 'replace' \? 'replace' : 'fill_empty'/);
  assert.match(service, /COALESCE\(load_in_time,\$4::time\)/);
  assert.match(service, /\$3 AND \$4::time IS NOT NULL/);
  assert.match(service, /existing\.entity_id::text|existing\.show_id=\$2::uuid/);
  assert.match(ui, /Keeps existing information and adds only missing times or events/);
  assert.match(ui, /Replace this schedule/);
  assert.doesNotMatch(ui, /window\.confirm|window\.prompt/);
});

test('schedule shifts are bounded, transactional, and preserve event day offsets', () => {
  const service = read('backend/day-sheet-templates.js');
  assert.match(service, /Math\.abs\(delta\) > 720/);
  assert.match(service, /SELECT \* FROM shows[\s\S]*FOR UPDATE/);
  assert.match(service, /Number\(event\.day_offset\) \+ start\.days/);
  assert.match(service, /dayOffset < -7 \|\| dayOffset > 7/);
  assert.match(service, /await client\.query\('COMMIT'\)/);
});
