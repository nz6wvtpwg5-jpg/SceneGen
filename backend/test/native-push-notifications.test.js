const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('native device registrations are user and workspace scoped', () => {
  const migration = read('backend/migrations/047_native_push_devices.sql');
  const server = read('backend/server.js');
  assert.match(migration, /user_id VARCHAR\(255\) NOT NULL/);
  assert.match(migration, /entity_id UUID NOT NULL REFERENCES entities\(id\) ON DELETE CASCADE/);
  assert.match(migration, /token VARCHAR\(255\) NOT NULL UNIQUE/);
  assert.match(server, /DELETE FROM native_push_devices WHERE token = \$1 AND \(user_id <> \$2 OR entity_id <> \$3::uuid\)/);
  assert.match(server, /token = \$1 AND user_id = \$2 AND entity_id = \$3::uuid/);
});

test('APNs delivery uses token auth, safe internal actions and invalid-token cleanup', () => {
  const sender = read('backend/apns-push.js');
  assert.match(sender, /APNS_KEY_ID/);
  assert.match(sender, /APPLE_DEVELOPER_TEAM_ID/);
  assert.match(sender, /dsaEncoding: 'ieee-p1363'/);
  assert.match(sender, /route\.startsWith\('\/'\) && !route\.startsWith\('\/\/'\)/);
  assert.match(sender, /response\.status === 410/);
});

test('iPhone permission is requested only from the settings action', () => {
  const provider = read('src/components/providers/native-push-provider.tsx');
  const settings = read('src/components/settings/native-push-settings.tsx');
  assert.match(provider, /const enable = useCallback/);
  assert.match(provider, /PushNotifications\.requestPermissions\(\)/);
  assert.match(provider, /PushNotifications\.checkPermissions\(\)/);
  assert.match(settings, /onClick=\{\(\) => void enable\(\)\}/);
  assert.match(settings, /Enable notifications/);
});

test('native project has push capability and Capacitor registration callbacks', () => {
  assert.match(read('package.json'), /@capacitor\/push-notifications/);
  assert.match(read('ios/App/App/App.entitlements'), /aps-environment/);
  assert.match(read('ios/App/App/AppDelegate.swift'), /capacitorDidRegisterForRemoteNotifications/);
  assert.match(read('ios/App/App.xcodeproj/project.pbxproj'), /com\.apple\.Push/);
});
