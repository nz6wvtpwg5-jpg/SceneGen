/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('day-sheet collaborators never receive agent commission UI', () => {
  const portal = read('src/app/external-day-sheets/page.tsx');
  assert.match(portal, /Day-sheet workspaces/);
  assert.match(portal, /Collaborator profile/);
  assert.doesNotMatch(portal, /Private commission rate|Estimated commission|Edit rate|collaborator-commission/);
});

test('commission writes require an active artist-agent relationship', () => {
  const backend = read('backend/day-sheet-collaborators.js');
  const route = backend.slice(backend.indexOf("router.patch('/my-represented-workspaces/:entityId'"), backend.indexOf("router.patch('/my-day-sheet-profile'"));
  assert.match(route, /artist_agent_relationships relationship/);
  assert.match(route, /relationship\.agent_user_id = \$1::uuid/);
  assert.match(route, /relationship\.entity_id = \$2::uuid/);
  assert.match(route, /relationship\.status = 'active'/);
  assert.match(route, /Active booking-agent status is required to edit commission/);
});

test('collaborator identity editing cannot create or change commission data', () => {
  const backend = read('backend/day-sheet-collaborators.js');
  const route = backend.slice(backend.indexOf("router.patch('/my-day-sheet-profile'"), backend.indexOf('\n  return router;'));
  assert.match(route, /collaborator_profile_name=\$1/);
  assert.doesNotMatch(route, /collaborator_commission_percentage/);
});

test('workspace administration fails closed when a membership role is missing', () => {
  const sidebar = read('src/components/sidenav/SidebarEntities.tsx');
  const header = read('src/components/header/app-header.tsx');
  const navigation = read('src/app/config.tsx');
  const settings = read('src/app/settings/page.tsx');

  assert.match(sidebar, /membershipRole: entity\.membership_role \|\| entity\.membershipRole/);
  for (const source of [header, navigation, settings]) {
    assert.doesNotMatch(source, /!activeProfile\?\.membershipRole\s*\|\|/);
    assert.match(source, /activeProfile\?\.membershipRole && \['owner', 'admin'\]\.includes\(activeProfile\.membershipRole\)/);
  }
});
