const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('updates migration is scoped and legacy-entity compatible', () => {
  const sql = read('backend/migrations/033_show_updates_and_acknowledgements.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS show_notices/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS show_notice_receipts/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS show_portal_visits/);
  assert.match(sql, /entity_id VARCHAR\(255\) NOT NULL/);
  assert.match(sql, /PRIMARY KEY \(notice_id, user_id\)/);
  assert.match(sql, /CHECK \(num_nonnulls\(tour_id, show_id\) = 1\)/);
  assert.doesNotMatch(sql, /entity_id UUID NOT NULL REFERENCES entities/);
});

test('feed covers operational changes and filters restricted information', () => {
  const api = read('backend/show-updates.js');
  assert.match(api, /day_sheet_changes/);
  assert.match(api, /show_itinerary_events/);
  assert.match(api, /show_advance_tasks/);
  assert.match(api, /show_travel_plans/);
  assert.match(api, /show_accommodations/);
  assert.match(api, /tour_documents/);
  assert.match(api, /FINANCIAL_FIELDS/);
  assert.match(api, /row\.visible_to_collaborators/);
  assert.match(api, /row\.permission_level !== 'financial'/);
  assert.match(api, /COALESCE\(reviewed_at,created_at\)/);
});

test('notices retain visibility, receipt and administrator boundaries', () => {
  const api = read('backend/show-updates.js');
  assert.match(api, /notice\.visible_to_collaborators=TRUE/);
  assert.match(api, /requires_acknowledgement/);
  assert.match(api, /INSERT INTO show_notice_receipts/);
  assert.match(api, /DO UPDATE SET acknowledged_at=NOW\(\)/);
  assert.match(api, /receipts: canManage\(req\)/);
  assert.match(api, /Administrator access is required/);
  assert.match(api, /notice\.entity_id::text=\$1::text/);
});

test('date parsing and finance classification reject unsafe values', () => {
  const { FINANCIAL_FIELDS, validDate } = require('../show-updates');
  assert.equal(validDate('not-a-date'), null);
  assert.equal(validDate('2026-08-29T10:00:00Z'), '2026-08-29T10:00:00.000Z');
  assert.equal(FINANCIAL_FIELDS.has('guaranteedFee'), true);
  assert.equal(FINANCIAL_FIELDS.has('venueName'), false);
});

test('viewer writes are limited to strict visit and acknowledgement paths', () => {
  const authorization = read('backend/authorization.js');
  const selfRecord = authorization.slice(authorization.indexOf('const selfRecord'), authorization.indexOf("if (req.method === 'DELETE'"));
  assert.match(selfRecord, /\\\/visit\$\/i/);
  assert.match(selfRecord, /\\\/acknowledge\$\/i/);
  assert.match(selfRecord, /!readOnly && !selfRecord && req\.entityRole === 'viewer'/);
  assert.doesNotMatch(selfRecord, /\[0-9a-f-\]\{36\}/);
});

test('updates router is registered with the private API', () => {
  assert.match(read('backend/server.js'), /createShowUpdatesRouter\(pool\)/);
});

test('day-sheet experiences use the shared alerts and isolated collaborator route', () => {
  const component = read('src/components/shows/ShowUpdates.tsx');
  const internal = read('src/app/shows/[id]/page.tsx');
  const collaborator = read('src/app/api/collaborator/shows/[id]/updates/route.ts');
  assert.match(component, /Changed since your last visit/);
  assert.match(component, /I have read and understood this/);
  assert.match(component, /Seen by/);
  assert.match(component, /DialogContent/);
  assert.match(internal, /<ShowUpdates showId=\{showId\}/);
  assert.match(collaborator, /collaboratorIdentityHeaders/);
  assert.match(read('src/app/external-day-sheets/[id]/page.tsx'), /<ShowUpdates showId=\{id\} endpoint=\{`\$\{apiBase\}\//);
});
