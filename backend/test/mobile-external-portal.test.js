const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('external collaborator entry supports restricted password and email-link sessions', () => {
  const auth = read('src/collaborator-auth.ts');
  const access = read('src/app/collaborator-access/page.tsx');
  const invite = read('src/app/day-sheet-invite/[token]/page.tsx');
  const shell = read('src/components/layout/app-shell.tsx');
  assert.match(auth, /id: 'invitation'/);
  assert.match(auth, /id: 'collaborator-link'/);
  assert.match(auth, /id: 'collaborator-credentials'/);
  assert.doesNotMatch(auth, /next-auth\/providers\/google|Google\(/);
  assert.match(access, /\/api\/collaborator-access\/request-link/);
  assert.match(access, /Email me a one-use link/);
  assert.match(access, /Set or reset password/);
  assert.match(invite, /signIn\('invitation'/);
  assert.doesNotMatch(access + invite, /signIn\('google'|Continue with Google|Or use Google/);
  assert.match(shell, /!isExternalRoute && <span/);
});

test('external portal supplies compact mobile navigation and calendar agenda', () => {
  const portal = read('src/app/external-day-sheets/page.tsx');
  assert.match(portal, /mobile-safe-top sticky top-0/);
  assert.match(portal, /bg-\[#fffaf2\] md:hidden/);
  assert.match(portal, /hidden overflow-x-auto bg-\[#fffaf2\] md:block/);
  assert.match(portal, /showFirstMonth\(visibleShows\)/);
  assert.match(portal, /min-h-\[100dvh\]/);
});

test('external profile editor is touch-safe and full-screen on phones', () => {
  const portal = read('src/app/external-day-sheets/page.tsx');
  assert.match(portal, /mobile-safe-top mobile-safe-bottom flex min-h-\[100dvh\]/);
  assert.match(portal, /id="collaborator-name"[\s\S]*text-base/);
  assert.doesNotMatch(portal, /id="collaborator-commission"|Private commission rate|Edit rate/);
});

test('external day-sheet editor keeps operations readable and save controls reachable', () => {
  const editor = read('src/app/external-day-sheets/[id]/page.tsx');
  assert.match(editor, /mobile-safe-top sticky top-0/);
  assert.match(editor, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(editor, /text-base disabled:bg/);
  assert.match(editor, /fixed inset-x-0 bottom-0/);
  assert.match(editor, /\/api\/collaborator\/shows/);
  assert.match(editor, /permissions\.editScope/);
  assert.match(editor, /permissions\.financialAccess/);
});

test('invitation acceptance uses a phone-safe isolated surface', () => {
  const invite = read('src/app/day-sheet-invite/[token]/page.tsx');
  assert.match(invite, /min-h-\[100dvh\]/);
  assert.match(invite, /mobile-safe-top mobile-safe-bottom/);
  assert.match(invite, /min-h-12 w-full/);
  assert.match(invite, /SessionProvider basePath="\/api\/collaborator-auth"/);
});
