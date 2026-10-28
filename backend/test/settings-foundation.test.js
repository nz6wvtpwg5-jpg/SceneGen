const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('settings replaces the legacy profile and manage destinations', () => {
  const nav = read('src', 'app', 'config.tsx');
  const profile = read('src', 'app', 'profile', 'page.tsx');
  const manage = read('src', 'app', 'manage', 'page.tsx');

  assert.match(nav, /name: 'Settings'[\s\S]*href: '\/settings'/);
  assert.doesNotMatch(nav, /name: 'Profile'/);
  assert.doesNotMatch(nav, /href: '\/manage'/);
  assert.match(profile, /redirect\('\/settings\?tab=workspace'\)/);
  assert.match(manage, /redirect\('\/settings\?tab=personal'\)/);
});

test('settings separates workspace, access and personal responsibilities', () => {
  const settings = read('src', 'app', 'settings', 'page.tsx');

  assert.match(settings, /id: 'workspace'/);
  assert.match(settings, /id: 'access'/);
  assert.match(settings, /id: 'personal'/);
  assert.match(settings, /<ContactLocationPicker/);
  assert.match(settings, /<DaySheetCollaborators/);
  assert.match(settings, /fetch\('\/api\/user'/);
  assert.match(settings, /\/api\/entities\/\$\{encodeURIComponent\(activeProfile\.id\)\}\/profile/);
  assert.match(settings, /bio: workspace\.bio/);
  assert.doesNotMatch(settings, /discograph/i);
  assert.match(settings, /locationDirty/);
});

test('workspace settings reads are constrained to the active entity', () => {
  for (const type of ['artist', 'promoter']) {
    const route = read('src', 'app', 'api', type, 'get', '[id]', 'route.ts');
    assert.match(route, /entityId !== id/);
    assert.match(route, /'X-Entity-Id': entityId/);
  }
});

test('personal settings proxy preserves the signed user identity', () => {
  const route = read('src', 'app', 'api', 'user', 'route.ts');
  assert.match(route, /request\.headers\.get\('x-user-id'\)/);
  assert.match(route, /'X-User-Id': userId/g);
});

test('workspace location updates require a valid coordinate pair', () => {
  const server = read('backend', 'server.js');
  assert.match(server, /Choose a valid confirmed workspace location/);
  assert.match(server, /latitude < -90 \|\| latitude > 90/);
  assert.match(server, /longitude < -180 \|\| longitude > 180/);
  assert.match(server, /latitude = CASE WHEN \$11::boolean THEN \$12::numeric ELSE latitude END/);
  assert.match(server, /longitude = CASE WHEN \$11::boolean THEN \$13::numeric ELSE longitude END/);
});

test('operational master documents have a settings home without widening collaborator access', () => {
  const settings = read('src', 'app', 'settings', 'page.tsx');
  const upload = read('src', 'components', 'profile', 'DocumentUpload.tsx');

  assert.match(settings, /id: 'documents'/);
  for (const key of ['techRider', 'hospitalityRider', 'stagePlot', 'inputList', 'pressKit']) {
    assert.ok(settings.includes(`['${key}',`));
  }
  assert.match(settings, /Day-sheet collaborators only receive documents deliberately assigned/);
  assert.match(upload, /onUploaded\?\./);
  assert.match(upload, /existingFileName/);
  assert.match(upload, /Replace/);
});

test('legacy promotional editing and discography are retired from active contracts', () => {
  const server = read('backend', 'server.js');
  const editor = read('src', 'app', 'profile', 'edit', 'page.tsx');
  const contactProfile = read('src', 'app', 'profile', '[id]', 'page.tsx');
  const artistProfile = read('src', 'app', 'artist', '[id]', 'page.tsx');
  const profileEditor = read('src', 'components', 'profile', 'ProfileEditor.tsx');

  assert.match(editor, /redirect\('\/settings\?tab=workspace'\)/);
  assert.doesNotMatch(server, /req\.body\.discography/);
  assert.doesNotMatch(contactProfile, /discograph/i);
  assert.doesNotMatch(artistProfile, /discograph/i);
  assert.doesNotMatch(profileEditor, /discograph/i);
});
