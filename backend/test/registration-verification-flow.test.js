/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('registration status uses an opaque HttpOnly single-purpose token', () => {
  const migration = read('backend/migrations/041_registration_verification_status.sql');
  const registration = read('src/app/api/account/register/route.ts');
  const server = read('backend/server.js');
  assert.match(migration, /'registration_status'/);
  assert.match(registration, /httpOnly: true/);
  assert.match(registration, /sameSite: "strict"/);
  assert.match(registration, /Registration status handoff could not be created/);
  assert.match(server, /token\.purpose = 'registration_status'/);
  assert.match(server, /hashOpaqueToken\(suppliedToken\)/);
  assert.doesNotMatch(server, /registration-status[\s\S]*WHERE u\.email =/);
});

test('desktop waits, polls on focus, and moves verified accounts to sign in', () => {
  const login = read('src/app/login/page.tsx');
  assert.match(login, /Waiting for verification…/);
  assert.match(login, /setInterval\(check, 3000\)/);
  assert.match(login, /addEventListener\("focus", check\)/);
  assert.match(login, /setMode\("login"\)/);
  assert.match(login, /Email verified\. Sign in with the password you created\./);
  assert.match(login, /data\.status === "unavailable"/);
  assert.match(login, /Verification status is unavailable/);
  assert.match(login, /value=\{emailDraft\}/);
});
