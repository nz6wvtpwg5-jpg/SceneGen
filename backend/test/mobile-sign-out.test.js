const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../../src/components/layout/mobile-navigation.tsx'), 'utf8');

test('the iPhone More sheet exposes an explicit guarded sign-out action', () => {
  assert.match(source, /title: 'Sign out of SceneGen\?'/);
  assert.match(source, /confirmLabel: 'Sign out'/);
  assert.match(source, /tone: 'destructive'/);
  assert.match(source, /onClick=\{\(\) => void logout\(\)\}/);
  assert.match(source, /Signing out…/);
});

test('mobile sign-out clears user-bound device state before ending the session', () => {
  const offlineIndex = source.indexOf('await clearOfflineDataForUser');
  const profileIndex = source.indexOf('setActiveProfile(null)');
  const entityIndex = source.indexOf('clearEntityId()');
  const signOutIndex = source.indexOf("await signOut({ redirect: false })");
  assert.ok(offlineIndex >= 0 && profileIndex > offlineIndex && entityIndex > profileIndex && signOutIndex > entityIndex);
});

test('mobile sign-out returns to the native-style app landing', () => {
  assert.match(source, /signOut\(\{ redirect: false \}\)/);
  assert.match(source, /window\.location\.replace\('\/app'\)/);
  assert.match(source, /window\.location\.assign\('\/api\/auth\/signout\?callbackUrl=%2Fapp'\)/);
  assert.doesNotMatch(source, /localStorage\.clear\(\)/);
});
