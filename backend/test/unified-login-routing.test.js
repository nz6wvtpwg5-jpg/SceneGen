const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('normal sign-in resolves member and collaborator destinations only after password validation', () => {
  const login = read('src/app/login/page.tsx');
  const route = read('src/app/api/account/access-options/route.ts');
  const authDb = read('src/lib/auth-db.ts');
  const server = read('backend/server.js');
  assert.match(login, /\/api\/account\/access-options/);
  assert.match(route, /resolvePasswordAccess/);
  assert.match(authDb, /password-access-options/);
  assert.match(server, /\/internal\/auth\/password-access-options/);
  assert.match(server, /passwordMatches\(row\.password_hash/);
  assert.match(server, /entity_memberships em/);
  assert.match(server, /day_sheet_access_grants g/);
  assert.match(server, /booking_agent_profiles bap/);
});

test('collaborator-only users enter the isolated portal from the normal login form', () => {
  const login = read('src/app/login/page.tsx');
  const collaboratorAuth = read('src/collaborator-auth.ts');
  assert.match(login, /\/api\/collaborator-auth/);
  assert.match(login, /callback\/collaborator-credentials/);
  assert.match(login, /\/external-day-sheets/);
  assert.match(collaboratorAuth, /id: 'collaborator-credentials'/);
  assert.doesNotMatch(collaboratorAuth, /next-auth\/providers\/google|Google\(/);
});

test('accounts with both access types are asked which view to open', () => {
  const login = read('src/app/login/page.tsx');
  assert.match(login, /access\.member && access\.collaborator/);
  assert.match(login, /Open my workspace/);
  assert.match(login, /Open assigned day sheets/);
});

test('public landing surfaces no longer expose a special collaborator login URL', () => {
  const mobileMenu = read('src/components/landing/landing-mobile-menu.tsx');
  const nativeLanding = read('src/components/landing/native-app-landing.tsx');
  const surfaces = [
    read('src/app/page.tsx'),
    mobileMenu,
    nativeLanding,
  ].join('\n');
  assert.doesNotMatch(surfaces, /href="\/collaborator-access"/);
  assert.match(surfaces, /href="\/login"/);
  assert.equal((mobileMenu.match(/href="\/login"/g) || []).length, 1);
  assert.equal((nativeLanding.match(/href="\/login"/g) || []).length, 1);
});

test('an expired collaborator session returns to normal sign-in with a hard reload', () => {
  const portal = read('src/app/external-day-sheets/page.tsx');
  assert.match(portal, /window\.location\.replace\('\/login'\)/);
});
