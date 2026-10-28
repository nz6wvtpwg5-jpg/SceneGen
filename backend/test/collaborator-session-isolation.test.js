const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const web = path.join(root, 'src');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('external invitations use a fully isolated email session and shell', () => {
  const auth = read('src/collaborator-auth.ts');
  const page = read('src/app/day-sheet-invite/[token]/page.tsx');
  const shell = read('src/components/layout/app-shell.tsx');
  const cookieNames = [...auth.matchAll(/cookieName\('([^']+)'/g)].map((match) => match[1]);

  assert.match(auth, /basePath: '\/api\/collaborator-auth'/);
  assert.doesNotMatch(auth, /next-auth\/providers\/google|Google\(/);
  assert.deepEqual(cookieNames, ['session', 'callback', 'csrf']);
  assert.equal(new Set(cookieNames).size, cookieNames.length);
  assert.match(page, /signIn\('invitation', \{ token, redirect: false \}\)/);
  assert.match(page, /SessionProvider basePath="\/api\/collaborator-auth"/);
  assert.match(page, /signOut\(\{ redirect: false \}\)/);
  assert.match(auth, /token\.email = user\.email/);
  assert.match(auth, /token\.name = user\.name/);
  assert.match(auth, /token\.picture = user\.image/);
  assert.match(shell, /isExternalRoute/);
});

test('production collaborator auth requires its own generated secret', () => {
  const auth = read('src/collaborator-auth.ts');
  const render = read('render.yaml');

  assert.match(auth, /COLLABORATOR_AUTH_SECRET/);
  assert.match(auth, /secureCookies \? undefined : process\.env\.NEXTAUTH_SECRET/);
  assert.match(render, /key: COLLABORATOR_AUTH_SECRET\s+generateValue: true/);
});

test('invite acceptance uses collaborator identity without the main session', () => {
  const route = read('src/app/api/day-sheet-invitations/[token]/accept/route.ts');
  const identity = read('src/lib/collaboratorIdentity.ts');
  const middleware = read('src/middleware.ts');
  const proxy = read('src/lib/daySheetProxy.ts');

  assert.match(route, /collaboratorIdentityHeaders/);
  assert.match(identity, /collaboratorAuth\(\)/);
  assert.match(identity, /createHmac/);
  assert.match(middleware, /req\.method === "POST".*day-sheet-invitations.*accept/);
  assert.match(proxy, /!headers\.has\('authorization'\) && authorization/);
  assert.match(proxy, /!headers\.has\('x-user-email'\) && userEmail/);
  assert.match(proxy, /non-JSON response/);
  assert.doesNotMatch(proxy, /message: text \|\|/);
  assert.doesNotMatch(proxy, /non-JSON response.*\$\{path\}/);
});

test('successful acceptance hands off to an isolated external day-sheet portal', () => {
  const invite = read('src/app/day-sheet-invite/[token]/page.tsx');
  const list = read('src/app/external-day-sheets/page.tsx');
  const show = read('src/app/external-day-sheets/[id]/page.tsx');
  const listRoute = read('src/app/api/collaborator/day-sheets/route.ts');
  const showRoute = read('src/app/api/collaborator/shows/[id]/route.ts');
  const middleware = read('src/middleware.ts');

  assert.match(invite, /router\.replace\('\/external-day-sheets'\)/);
  assert.match(invite, /invitation\?\.status === 'accepted'[\s\S]*day-sheet-invitations/);
  assert.match(invite, /Create your SceneGen password/);
  assert.match(invite, /You will not need the invitation link again/);
  assert.match(list, /\/api\/collaborator\/day-sheets/);
  assert.match(list, /venueCity/);
  assert.match(list, /profile\?\.email \|\| session\?\.user\?\.email/);
  assert.match(list, /SessionProvider basePath="\/api\/collaborator-auth"/);
  assert.match(show, /\/api\/collaborator\/shows/);
  assert.match(listRoute, /collaboratorIdentityHeaders/);
  assert.match(showRoute, /collaboratorIdentityHeaders/);
  assert.match(showRoute, /UUID\.test\(id\)/);
  assert.match(middleware, /"\/api\/collaborator\/"/);
});

test('non-Google collaborators authenticate with an active invitation token', () => {
  const server = read('backend/server.js');
  const auth = read('src/collaborator-auth.ts');
  const authDb = read('src/lib/auth-db.ts');
  const invite = read('src/app/day-sheet-invite/[token]/page.tsx');
  const invitationEndpoint = server.match(/app\.post\('\/internal\/auth\/day-sheet-invitation'[\s\S]*?(?=app\.post\('\/internal\/auth\/active-day-sheet-collaborator')/)?.[0] || '';

  assert.match(invitationEndpoint, /hashOpaqueToken\(suppliedToken\)/);
  assert.match(invitationEndpoint, /i\.status IN \('pending', 'accepted'\)/);
  assert.match(invitationEndpoint, /i\.revoked_at IS NULL AND i\.expires_at > NOW\(\)/);
  assert.match(invitationEndpoint, /FOR UPDATE OF i/);
  assert.doesNotMatch(invitationEndpoint, /email_verified_at/);
  assert.match(auth, /Credentials\(\{/);
  assert.match(auth, /id: 'invitation'/);
  assert.match(auth, /authenticateDaySheetInvitation/);
  assert.match(authDb, /day-sheet-invitation/);
  assert.match(invite, /signIn\('invitation', \{ token, redirect: false \}\)/);
  assert.doesNotMatch(invite, /signIn\('google'|Or use Google/);
});

test('external show updates use isolated collaborator identity', () => {
  const route = read('src/app/api/collaborator/shows/[id]/route.ts');
  const editor = read('src/app/external-day-sheets/[id]/page.tsx');
  assert.match(route, /export async function PATCH/);
  assert.match(route, /collaboratorIdentityHeaders\(\)/);
  assert.match(route, /UUID\.test\(id\)/);
  assert.match(route, /method: 'PATCH'/);
  assert.match(route, /headers: identity/);
  assert.match(route, /Invalid day-sheet update/);
  assert.match(editor, /permissions\.editScope === 'none' \? \[\] : operational/);
  assert.match(editor, /permissions\.financialAccess === 'edit' \? financial/);
  assert.match(editor, /permissions\.financialAccess !== 'hidden'/);
  assert.match(editor, /form\[field\.target\] !== original\[field\.target\]/);
  assert.match(editor, /field\.type === 'time'.*raw \|\| null/);
  assert.match(editor, /data\.pendingApproval/);
  assert.match(editor, /Changes submitted for approval/);
  assert.match(editor, /Day sheet saved/);
});
