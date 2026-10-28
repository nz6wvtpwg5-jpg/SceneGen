const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('landing page sends every returning user through the normal sign-in entrance', () => {
  const landing = read('src/app/page.tsx');
  const access = read('src/app/collaborator-access/page.tsx');
  const middleware = read('src/middleware.ts');
  const shell = read('src/components/layout/app-shell.tsx');
  assert.match(landing, /href="\/login"/);
  assert.doesNotMatch(landing, /href="\/collaborator-access"/);
  assert.match(access, /SessionProvider basePath="\/api\/collaborator-auth"/);
  assert.match(access, /\/api\/collaborator-access\/request-link/);
  assert.match(access, /Email me a one-use link/);
  assert.match(access, /signIn\('collaborator-credentials'/);
  assert.doesNotMatch(access, /signIn\('google'|Continue with Google/);
  assert.match(access, /First time here\?/);
  assert.match(middleware, /"\/api\/collaborator-access\/"/);
  assert.match(shell, /pathname\.startsWith\('\/collaborator-access'\)/);
});

test('email login is generic, rate limited, short lived and one use', () => {
  const request = read('src/app/api/collaborator-access/request-link/route.ts');
  const server = read('backend/server.js');
  const migration = read('backend/migrations/036_collaborator_email_login.sql');
  const responseMessage = request.match(/const responseMessage = '([^']+)'/)?.[1];
  assert.ok(responseMessage);
  assert.equal((request.match(/NextResponse\.json\(\{ message: responseMessage \}/g) || []).length, 1);
  assert.match(request, /checkAuthRateLimit\('collaborator-login-email'/);
  assert.match(request, /checkAuthRateLimit\('collaborator-login-ip'/);
  assert.match(request, /issueToken\(user\.id, 'collaborator_login', 20\)/);
  assert.match(server, /DELETE FROM auth_tokens token/);
  assert.match(server, /token\.purpose = 'collaborator_login'/);
  assert.match(server, /EXISTS \(SELECT 1 FROM day_sheet_access_grants/);
  assert.match(migration, /collaborator_login/);
  assert.match(migration, /UNIQUE \(user_id, purpose\)/);
  assert.match(server, /ON CONFLICT \(user_id, purpose\) DO UPDATE/);
  assert.match(server, /crypto\.timingSafeEqual\(suppliedToken, expectedToken\)/);
});

test('returning password login uses the restricted collaborator session', () => {
  const auth = read('src/collaborator-auth.ts');
  const verify = read('src/app/collaborator-access/verify/page.tsx');
  const portal = read('src/app/external-day-sheets/page.tsx');
  assert.match(auth, /id: 'collaborator-link'/);
  assert.match(auth, /id: 'collaborator-credentials'/);
  assert.match(auth, /authenticateCollaboratorPassword/);
  assert.match(auth, /authenticateCollaboratorLogin/);
  assert.match(verify, /signIn\('collaborator-link'/);
  assert.match(verify, /SessionProvider basePath="\/api\/collaborator-auth"/);
  assert.match(portal, /window\.location\.replace\('\/login'\)/);
  assert.doesNotMatch(verify, /\/api\/auth/);
  assert.doesNotMatch(auth, /next-auth\/providers\/google|Google\(/);
});

test('collaborator password and fallback link both preserve authorized-email checks', () => {
  const access = read('src/app/collaborator-access/page.tsx');
  const auth = read('src/collaborator-auth.ts');
  const invite = read('src/app/day-sheet-invite/[token]/page.tsx');
  const portal = read('src/app/external-day-sheets/page.tsx');
  assert.match(access, /exact email address your invitation was sent to/);
  assert.match(access, /Email me a one-use link/);
  assert.match(access, /Set or reset password/);
  assert.match(invite, /signIn\('invitation'/);
  assert.doesNotMatch(access + invite, /signIn\('google'|Continue with Google|Or use Google/);
  assert.doesNotMatch(auth, /next-auth\/providers\/google|Google\(/);
  assert.match(portal, /signedInEmail !== expectedEmail/);
  assert.match(portal, /signOut\(\{ redirect: false \}\)/);
  assert.match(portal, /error=wrong-account/);
  assert.match(portal, /needsProfileConfirmation && \(data\.shows \|\| \[\]\)\.length/);
});

test('password login requires an active grant and a verified password account', () => {
  const server = read('backend/server.js');
  const authDb = read('src/lib/auth-db.ts');
  const migration = read('backend/migrations/056_collaborator_password_login.sql');
  const invitations = read('backend/day-sheet-collaborators.js');
  assert.match(server, /\/internal\/auth\/collaborator-password-login/);
  assert.match(server, /EXISTS \(SELECT 1 FROM day_sheet_access_grants/);
  assert.match(server, /!row\?\.password_hash \|\| !row\.email_verified_at/);
  assert.match(server, /passwordMatches\(row\.password_hash/);
  assert.match(authDb, /authenticateCollaboratorPassword/);
  assert.match(migration, /i\.status = 'accepted'/);
  assert.match(migration, /LOWER\(i\.email\) = LOWER\(u\.email\)/);
  assert.match(invitations, /email_verified_at=COALESCE\(email_verified_at, NOW\(\)\)/);
});

test('link verification confirms the collaborator cookie before leaving the page', () => {
  const verify = read('src/app/collaborator-access/verify/page.tsx');
  assert.match(verify, /waitForCollaboratorSession/);
  assert.match(verify, /\/api\/collaborator-auth\/session/);
  assert.match(verify, /browser did not save the session/);
});
