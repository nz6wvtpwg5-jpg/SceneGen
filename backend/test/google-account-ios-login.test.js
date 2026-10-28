/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('verified Google-only accounts can establish an iPhone password securely', () => {
  const forgot = read('src/app/api/account/forgot-password/route.ts');
  const reset = read('src/app/api/account/reset-password/route.ts');
  const authDb = read('src/lib/auth-db.ts');
  const backend = read('backend/server.js');

  assert.match(forgot, /if \(user\?\.emailVerifiedAt\)/);
  assert.doesNotMatch(forgot, /if \(user\?\.passwordHash\)/);
  assert.match(forgot, /issueToken\(user\.id, "reset_password", 120\)/);
  assert.match(reset, /resetPasswordWithToken\(body\.token, body\.password\)/);
  assert.match(authDb, /reset-password/);
  assert.match(backend, /purpose = 'reset_password'[\s\S]*FOR UPDATE[\s\S]*UPDATE users[\s\S]*DELETE FROM auth_tokens[\s\S]*COMMIT/);
});

test('the native login supports Google directly while preserving password recovery', () => {
  const login = read('src/app/login/page.tsx');
  const forgot = read('src/app/forgot-password/page.tsx');

  assert.match(login, /SocialLogin\.login\([\s\S]*provider/);
  assert.match(login, /Continue with Google/);
  assert.match(login, /Sign in with Apple/);
  assert.match(forgot, /accounts originally created with Google set a password for the iPhone app/);
  assert.match(forgot, /autoComplete="email"/);
});

test('password reset UI prevents duplicate submissions and preserves a successful result', () => {
  const page = read('src/app/reset-password/page.tsx');

  assert.match(page, /submissionInFlight\.current \|\| state === "success"/);
  assert.match(page, /state === "submitting" \|\| state === "success"/);
  assert.match(page, /Your link has not been used; please try again/);
  assert.match(page, /router\.replace\(collaborator \? "\/collaborator-access" : "\/login\?passwordReset=1"\)/);
});
