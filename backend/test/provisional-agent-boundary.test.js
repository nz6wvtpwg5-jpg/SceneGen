/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('pending agent-created bands are planning workspaces, never artist ownership', () => {
  const authorization = read('backend/authorization.js');
  const server = read('backend/server.js');
  assert.match(authorization, /THEN 'provisional_agent'/);
  assert.match(authorization, /invitation\.status = 'pending'/);
  assert.match(authorization, /PROVISIONAL_AGENT_RESTRICTED/);
  assert.match(authorization, /\/shows[\s\S]*\/tours[\s\S]*\/show-proposals/);
  assert.match(server, /THEN 'provisional_agent'/);
});

test('workspace governance endpoints require owner or administrator authority', () => {
  const server = read('backend/server.js');
  for (const route of ["app.put('/api/entities/:id/profile'", "app.get('/api/invites'", "app.post('/api/invites'", "app.post('/api/assets'"]) {
    const start = server.indexOf(route);
    assert.notEqual(start, -1, `${route} exists`);
    assert.match(server.slice(start, start + 600), /\['owner', 'admin'\]\.includes\(req\.entityRole\)/, `${route} is privileged`);
  }
});

test('provisional planning role is preserved and privileged navigation is hidden', () => {
  const store = read('src/store/useProfileStore.ts');
  const agent = read('src/app/agent/page.tsx');
  const nav = read('src/app/config.tsx');
  const settings = read('src/app/settings/page.tsx');
  assert.match(store, /membershipRole\?:[\s\S]*provisional_agent/);
  assert.match(agent, /membershipRole: "provisional_agent"/);
  assert.match(nav, /provisionalAgent[\s\S]*items\.filter/);
  assert.match(settings, /\['owner', 'admin'\]\.includes\(activeProfile\.membershipRole\)/);
  assert.match(settings, /availableTabs = canManageWorkspace \? tabs : tabs\.filter/);
});
