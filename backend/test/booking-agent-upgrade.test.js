/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('artist representation is explicit, approval based, and independent of access grants', () => {
  const migration = read('backend/migrations/057_artist_agent_relationships.sql');
  assert.match(migration, /artist_agent_relationships/);
  assert.match(migration, /'requested'.*'active'.*'declined'/s);
  assert.match(migration, /profile_snapshot JSONB/);
  assert.match(migration, /Operational access remains governed by day_sheet_access_grants/);
});

test('upgrade requests require current artist access and notify artist administrators', () => {
  const source = read('backend/day-sheet-collaborators.js');
  const route = source.slice(source.indexOf("router.post('/booking-agent-upgrade-requests/:entityId'"), source.indexOf("router.get('/booking-agent-relationships'"));
  assert.match(route, /day_sheet_access_grants/);
  assert.match(route, /revoked_at IS NULL/);
  assert.match(route, /INSERT INTO notifications/);
  assert.match(route, /'booking_agent_request'/);
  assert.doesNotMatch(route, /INSERT INTO booking_agent_profiles/);
  assert.doesNotMatch(route, /INSERT INTO entity_memberships/);
});

test('artist approval waits for the agent to activate and never widens day-sheet permissions', () => {
  const source = read('backend/day-sheet-collaborators.js');
  const route = source.slice(source.indexOf("router.patch('/booking-agent-relationships/:id'"), source.indexOf("router.get('/day-sheet-collaborators'"));
  assert.match(route, /\['owner', 'admin'\]/);
  assert.match(route, /nextStatus = decision === 'approve' \? 'approved'/);
  assert.doesNotMatch(route, /INSERT INTO booking_agent_profiles/);
  assert.doesNotMatch(route, /INSERT INTO entity_memberships/);
  assert.doesNotMatch(route, /UPDATE day_sheet_access_grants/);
});

test('agent activation is explicit, retry safe, and creates the professional profile', () => {
  const source = read('backend/day-sheet-collaborators.js');
  const route = source.slice(source.indexOf("router.post('/my-agent-upgrade-requests/:id/activate'"), source.indexOf("router.post('/booking-agent-upgrade-requests/:entityId'"));
  assert.match(route, /relationship\.status IN \('approved','active'\)/);
  assert.match(route, /INSERT INTO booking_agent_profiles/);
  assert.match(route, /INSERT INTO collaborator_workspace_profiles/);
  assert.doesNotMatch(route, /INSERT INTO entity_memberships/);
  assert.doesNotMatch(route, /UPDATE day_sheet_access_grants/);
});

test('both mobile-friendly request and artist decision interfaces are present', () => {
  const portal = read('src/app/external-day-sheets/page.tsx');
  const access = read('src/components/manage/DaySheetCollaborators.tsx');
  assert.match(portal, /Request artist approval/);
  assert.match(portal, /Enter booking-agent view/);
  assert.match(portal, /setInterval\(\(\) => void refreshAgentStatus\(\), 5_000\)/);
  assert.match(portal, /Your current day-sheet permissions will not change/);
  assert.match(portal, /mobile-safe-top mobile-safe-bottom/);
  assert.match(access, /Booking-agent relationships/);
  assert.match(access, /Existing day-sheet permissions stay unchanged/);
});
