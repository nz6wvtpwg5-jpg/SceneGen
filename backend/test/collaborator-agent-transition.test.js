/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('first invitation acceptance requires password creation when credentials do not exist', () => {
  const backend = read('backend/day-sheet-collaborators.js');
  const page = read('src/app/day-sheet-invite/[token]/page.tsx');
  const passwordRoute = read('src/app/api/collaborator/account/password/route.ts');
  assert.match(backend, /requiresPassword: !user\.rows\[0\]\.password_hash/);
  assert.match(page, /Create your SceneGen password/);
  assert.match(page, /You will not need the invitation link again/);
  assert.match(passwordRoute, /validPassword/);
  assert.match(passwordRoute, /collaboratorAuth/);
  assert.match(read('backend/server.js'), /password_hash IS NULL/);
  assert.match(passwordRoute, /setInitialPassword/);
});

test('accepted invitations recover into the permanent portal instead of failing', () => {
  const backend = read('backend/day-sheet-collaborators.js');
  const page = read('src/app/day-sheet-invite/[token]/page.tsx');
  assert.match(backend, /\['pending', 'accepted'\]\.includes\(invitation\.status\)/);
  assert.match(page, /invitation\?\.status !== 'accepted'/);
  assert.match(page, /router\.replace\('\/external-day-sheets'\)/);
});

test('approval is detected in the portal and activation bridges into the main session', () => {
  const portal = read('src/app/external-day-sheets/page.tsx');
  const mainAuth = read('src/auth.ts');
  const migration = read('backend/migrations/058_booking_agent_activation.sql');
  assert.match(portal, /refreshAgentStatus/);
  assert.match(portal, /booking-agent-activate/);
  assert.match(portal, /callback\/booking-agent-activation/);
  assert.match(portal, /collaborator-auth\/signout/);
  assert.match(mainAuth, /id: 'booking-agent-activation'/);
  assert.match(migration, /booking_agent_activation/);
});

test('confirmation email is triggered only after the main session is confirmed', () => {
  const portal = read('src/app/external-day-sheets/page.tsx');
  const backend = read('backend/day-sheet-collaborators.js');
  const sessionCheck = portal.indexOf("fetch('/api/auth/session'");
  const emailConfirmation = portal.indexOf("fetch('/api/booking-agent/activation-confirmation'");
  assert.ok(sessionCheck > -1 && emailConfirmation > sessionCheck);
  assert.match(backend, /activation_email_sent_at/);
  assert.match(backend, /sendTransactionalEmail/);
  const approval = backend.slice(backend.indexOf("router.patch('/booking-agent-relationships/:id'"), backend.indexOf("router.get('/day-sheet-collaborators'"));
  assert.doesNotMatch(approval, /sendTransactionalEmail/);
});

test('activated booking agents no longer receive the collaborator-view choice at login', () => {
  const server = read('backend/server.js');
  assert.match(server, /AS booking_agent/);
  assert.match(server, /Boolean\(row\.collaborator\) && !Boolean\(row\.booking_agent\)/);
});

test('password setup provides professional, accessible password controls', () => {
  const page = read('src/app/day-sheet-invite/[token]/page.tsx');
  const route = read('src/app/api/collaborator/account/password/route.ts');
  assert.match(page, /Password strength/);
  assert.match(page, /Show passwords/);
  assert.match(page, /Caps Lock is on/);
  assert.match(page, /12–128 characters/);
  assert.match(page, /Password managers and pasted passwords are supported/);
  assert.match(page, /autoComplete="new-password"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(route, /between 12 and 128 characters/);
});
