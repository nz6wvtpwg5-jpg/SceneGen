const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('native login exposes Apple and Google and verifies tokens server-side', () => {
  const login = read('src/app/login/page.tsx');
  const auth = read('src/auth.ts');
  const verifier = read('src/lib/native-social-auth.ts');
  assert.match(login, /nativeSocialSignIn\("apple"\)/);
  assert.match(login, /nativeSocialSignIn\("google"\)/);
  assert.match(auth, /id: "native-social"/);
  assert.match(verifier, /jwtVerify/);
  assert.match(verifier, /appleid\.apple\.com\/auth\/keys/);
  assert.match(verifier, /googleapis\.com\/oauth2\/v3\/certs/);
});

test('iOS project declares Sign in with Apple and Google callback settings', () => {
  assert.match(read('ios/App/App/App.entitlements'), /com\.apple\.developer\.applesignin/);
  assert.match(read('ios/App/App/Info.plist'), /GOOGLE_REVERSED_CLIENT_ID/);
  assert.match(read('package.json'), /@capgo\/capacitor-social-login/);
});
