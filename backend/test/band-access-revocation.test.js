/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('day-sheet and booking-agent relationships are revoked independently', () => {
  const backend = read('backend/day-sheet-collaborators.js');
  const route = read('src/app/api/day-sheet-collaborators/[kind]/[id]/route.ts');
  assert.doesNotMatch(route, /searchParams\.get\('mode'\)/);
  assert.doesNotMatch(backend, /req\.query\.mode === 'person'/);
  assert.match(backend, /res\.json\(\{ success: true, mode: 'permission' \}\)/);
  assert.match(backend, /router\.delete\('\/booking-agent-relationships\/:id'/);
});

test('access panel uses relationship-specific revocation language', () => {
  const component = read('src/components/manage/DaySheetCollaborators.tsx');
  assert.match(component, /Remove day-sheet access\?/);
  assert.match(component, /Revoke day-sheet access/);
  assert.match(component, /Remove booking-agent status\?/);
  assert.doesNotMatch(component, /Remove this person from the band/);
  assert.doesNotMatch(component, /mode=person/);
});

test('people with access is a compact expandable manager', () => {
  const component = read('src/components/manage/DaySheetCollaborators.tsx');
  const accessList = component.slice(component.indexOf('People with access'), component.indexOf('{editing && draft &&'));
  assert.match(accessList, /min-h-\[72px\]/);
  assert.match(accessList, /expandedAccess/);
  assert.match(accessList, /Copy invite/);
  assert.match(accessList, /Refresh link/);
  assert.match(accessList, /Search people/);
  assert.match(accessList, /Pending/);
  assert.match(accessList, /Active/);
  assert.doesNotMatch(accessList, /Private access link/);
  assert.doesNotMatch(accessList, /value=\{item\.access_link\}/);
});

test('artist can directly invite a day-sheet recipient as its booking agent', () => {
  const migration = read('backend/migrations/059_band_access_revocation.sql');
  const backend = read('backend/day-sheet-collaborators.js');
  const component = read('src/components/manage/DaySheetCollaborators.tsx');
  assert.match(migration, /invite_as_booking_agent BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(component, /Invite as this band’s booking agent/);
  assert.match(component, /inviteAsBookingAgent/);
  assert.match(backend, /invitation\.invite_as_booking_agent/);
  assert.match(backend, /RETURNING id/);
  assert.match(backend, /acceptedGrant\.rows\[0\]\.id/);
  assert.match(backend, /'approved'/);
  assert.match(backend, /ON CONFLICT \(entity_id,agent_user_id\)/);
});

test('an ended relationship is historical and cannot block a fresh request', () => {
  const migration = read('backend/migrations/058_booking_agent_activation.sql');
  const backend = read('backend/day-sheet-collaborators.js');
  const portal = read('src/app/external-day-sheets/page.tsx');
  assert.match(migration, /WHERE status IN \('requested', 'changes_requested', 'approved', 'active', 'paused'\)/);
  assert.match(portal, /\['requested', 'changes_requested', 'approved', 'active', 'paused'\]\.includes/);
  assert.doesNotMatch(portal, /\['requested', 'changes_requested', 'approved', 'active', 'paused', 'ended'\]/);
  const requestListing = backend.slice(backend.indexOf("router.get('/my-agent-upgrade-requests'"), backend.indexOf("router.post('/my-agent-upgrade-requests/:id/activate'"));
  assert.match(requestListing, /status IN \('requested','changes_requested','approved','active','paused'\)/);
  assert.doesNotMatch(requestListing, /'ended'/);
});

test('deployment repairs existing orphaned approvals and administrators can remove agent status directly', () => {
  const repair = read('backend/migrations/060_close_orphaned_agent_relationships.sql');
  const backend = read('backend/day-sheet-collaborators.js');
  const route = read('src/app/api/booking-agent/relationships/[id]/route.ts');
  const component = read('src/components/manage/DaySheetCollaborators.tsx');
  assert.match(repair, /UPDATE artist_agent_relationships relationship/);
  assert.match(repair, /NOT EXISTS[\s\S]*day_sheet_access_grants/);
  assert.match(repair, /status='ended'/);
  assert.match(backend, /router\.delete\('\/booking-agent-relationships\/:id'/);
  assert.match(route, /export async function DELETE/);
  assert.match(component, /Remove booking-agent status\?/);
  assert.match(component, /Remove booking agent/);
});

test('revoked recipients keep an isolated login but receive no day-sheet data', () => {
  const server = read('backend/server.js');
  const backend = read('backend/day-sheet-collaborators.js');
  const portal = read('src/app/external-day-sheets/page.tsx');
  const offline = read('src/lib/offline-road-pack.ts');
  assert.match(server, /historical_collaborator/);
  assert.match(server, /EXISTS \(SELECT 1 FROM day_sheet_access_grants g WHERE g\.user_id = u\.id\)/);
  assert.match(backend, /has_active_access/);
  assert.match(backend, /hasActiveAccess:/);
  assert.match(portal, /No day-sheet access/);
  assert.match(portal, /clearRevokedDaySheetData/);
  assert.match(portal, /setInterval\(\(\) => void revalidateAccess\(\), 30_000\)/);
  assert.match(offline, /startsWith\(`\$\{PREFIX\}:\$\{userId\}:`\)/);
  assert.match(offline, /pathname\.startsWith\('\/external-day-sheets'\)/);
});
