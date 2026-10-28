const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('account deletion is authenticated, irreversible and keyed only to the signed identity', () => {
  const server = read('backend/server.js');
  const route = read('src/app/api/user/delete-account/route.ts');
  const panel = read('src/components/settings/delete-account-panel.tsx');
  assert.match(server, /app\.post\('\/api\/user\/delete-account'/);
  assert.match(server, /confirmation !== 'DELETE'/);
  assert.match(server, /WHERE id=\$1::uuid AND deleted_at IS NULL FOR UPDATE/);
  assert.match(server, /email='?\$2|email=\$2/);
  assert.match(server, /deleted_at=NOW\(\)/);
  assert.match(server, /DELETE FROM native_push_devices WHERE user_id=\$1/);
  assert.doesNotMatch(route, /userId|email/);
  assert.match(panel, /clearOfflineDataForUser/);
  assert.match(panel, /signOut/);
});

test('deleted sessions are rejected before tenant authorization', () => {
  const server = read('backend/server.js');
  const identity = server.indexOf("app.use('/api', createPrivateIdentityMiddleware(pool))");
  const active = server.indexOf("SELECT 1 FROM users WHERE id=$1::uuid AND deleted_at IS NULL");
  const tenancy = server.indexOf("app.use('/api', createEntityAuthorizationMiddleware(pool))");
  assert.ok(identity >= 0 && active > identity && tenancy > active);
  assert.match(server, /ACCOUNT_UNAVAILABLE/);
});

test('crash reports are bounded, rate limited and never accept arbitrary tenant identity from JSON', () => {
  const server = read('backend/server.js');
  const route = read('src/app/api/client-errors/route.ts');
  const reporter = read('src/lib/report-client-error.ts');
  assert.match(server, /recent\.rows\[0\]\.count >= 20/);
  assert.match(server, /slice\(0, 500\)/);
  assert.match(server, /slice\(0, 4000\)/);
  assert.match(route, /request\.headers\.get\('x-entity-id'\)/);
  assert.doesNotMatch(route, /body.*entityId/);
  assert.match(reporter, /Reporting must never cause a second user-facing failure/);
});

test('release build declares privacy accurately and does not claim unused location access', () => {
  const privacy = read('ios/App/App/PrivacyInfo.xcprivacy');
  const plist = read('ios/App/App/Info.plist');
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.match(privacy, /NSPrivacyTracking[\s\S]*<false\/>/);
  assert.match(privacy, /NSPrivacyCollectedDataTypeCrashData/);
  assert.match(project, /PrivacyInfo\.xcprivacy in Resources/);
  assert.doesNotMatch(plist, /NSLocation(?:Always|WhenInUse)UsageDescription/);
});

test('release candidate has timeout, unavailable-server and review-account controls', () => {
  const server = read('backend/server.js');
  const fallback = read('native-web/index.html');
  const availability = read('src/components/providers/api-availability-provider.tsx');
  const seed = read('backend/seed-app-review.js');
  const submission = read('APP_STORE_SUBMISSION.md');
  assert.match(server, /res\.setTimeout\(15_000/);
  assert.match(server, /SERVICE_TIMEOUT/);
  assert.match(fallback, /12000/);
  assert.match(fallback, /Try again/);
  assert.match(availability, /API_TIMEOUT_MS = 20_000/);
  assert.match(availability, /\[502, 503, 504\]/);
  assert.match(seed, /ALLOW_APP_REVIEW_SEED !== 'true'/);
  assert.match(seed, /APP_REVIEW_PASSWORD/);
  assert.match(seed, /APP_REVIEW_PASSWORD \|\| ''/);
  assert.doesNotMatch(seed, /APP_REVIEW_PASSWORD\s*\|\|\s*['"][^'"]{1,}['"]/);
  assert.match(submission, /TestFlight and physical-iPhone acceptance/);
  assert.match(submission, /App Privacy questionnaire draft/);
});
