/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PASS_TYPES, csvCell, serialize } = require('../guest-lists');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('guest data is show scoped, minimised and never collects contact details', () => {
  const migration = read('backend/migrations/051_guest_lists.sql');
  const service = read('backend/guest-lists.js');
  assert.match(migration, /guest_requests/);
  assert.match(migration, /entity_id VARCHAR\(255\) NOT NULL/);
  assert.match(migration, /show_id UUID NOT NULL REFERENCES shows/);
  assert.doesNotMatch(migration, /guest_email|phone_number|guest_phone|address/);
  assert.match(service, /Guest lists are private to organisation members/);
  assert.match(service, /show_id=\$1::uuid AND entity_id::text=\$2::text/);
  assert.match(service, /router\.delete\('\/shows\/:id\/guest-list\/requests\/:requestId'/);
  assert.match(service, /DELETE FROM guest_requests request USING shows show_record/);
});

test('pass types, plus-ones and allowances are bounded in the database', () => {
  const migration = read('backend/migrations/051_guest_lists.sql');
  assert.deepEqual([...PASS_TYPES], ['guest','aftershow','all_access','photo','working']);
  assert.match(migration, /plus_ones BETWEEN 0 AND 10/);
  assert.match(migration, /allowance BETWEEN 0 AND 500/);
  assert.match(migration, /guest_limit IS NULL OR guest_limit BETWEEN 0 AND 5000/);
  assert.match(migration, /show_id, lower\(person_name\)/);
});

test('approval locks caps and checks both overall and personal headcount', () => {
  const service = read('backend/guest-lists.js');
  assert.match(service, /FOR UPDATE OF request/);
  assert.match(service, /guest_list_settings[\s\S]*FOR UPDATE/);
  assert.match(service, /ON CONFLICT\(show_id\) DO NOTHING/);
  assert.match(service, /guest_list_allocations[\s\S]*FOR UPDATE/);
  assert.match(service, /sum\(plus_ones \+ 1\)/);
  assert.match(service, /exceed the .*guest-list limit/);
  assert.match(service, /exceed .*allowance/);
  assert.match(service, /await client\.query\('BEGIN'\)/);
  assert.match(service, /await client\.query\('COMMIT'\)/);
});

test('door and promoter views return approved operational fields without private notes', () => {
  const service = read('backend/guest-lists.js');
  const record = serialize({ id:'1',guest_name:'Ada',requested_for:'Band',allocation_id:null,plus_ones:1,pass_type:'guest',status:'approved',checked_in_at:null,created_at:'now',private_note:'private',decision_note:'internal' }, false);
  assert.equal(record.partySize, 2);
  assert.equal('privateNote' in record, false);
  assert.equal('decisionNote' in record, false);
  assert.match(service, /view === 'door' \|\| req\.query\.view === 'promoter'/);
  assert.match(service, /AND status='approved'/);
  assert.match(service, /Cache-Control','private, no-store/);
});

test('CSV export prevents spreadsheet formulas and excludes private fields', () => {
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  const service = read('backend/guest-lists.js');
  assert.match(service, /text\/csv; charset=utf-8/);
  assert.match(service, /guest_name,plus_ones,pass_type,requested_for,checked_in_at/);
  const exportRoute = service.slice(service.indexOf("router.get('/shows/:id/guest-list/export.csv'"));
  assert.doesNotMatch(exportRoute, /private_note|decision_note|email/);
});

test('mobile door workflow and explicit decisions are present without browser dialogs', () => {
  const ui = read('src/components/shows/GuestList.tsx');
  const server = read('backend/server.js');
  assert.match(ui, /Door-ready guest management/);
  assert.match(ui, /min-h-24/);
  assert.match(ui, /check_in/);
  assert.match(ui, /Promoter list/);
  assert.match(ui, /Export CSV/);
  assert.match(ui, /useConfirmDialog/);
  assert.match(ui, /Permanently remove/);
  assert.doesNotMatch(ui, /window\.confirm|window\.prompt/);
  assert.match(server, /createGuestListRouter\(pool\)/);
});
