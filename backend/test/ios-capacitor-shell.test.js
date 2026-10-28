const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('iOS shell uses the HTTPS production application and stable identity', () => {
  const config = read('capacitor.config.ts');
  assert.match(config, /appId: 'io\.scenegen\.app'/);
  assert.match(config, /DEFAULT_NATIVE_SERVER_URL = 'https:\/\/scenegen-web\.onrender\.com\/app'/);
  assert.match(config, /process\.env\.SCENEGEN_NATIVE_SERVER_URL/);
  assert.match(config, /url\.protocol !== 'https:'/);
  assert.match(config, /allowNavigation: \[server\.hostname\]/);
  assert.match(config, /cleartext: false/);
  assert.match(config, /preferredContentMode: 'mobile'/);
  assert.match(config, /style: 'LIGHT'/);
});

test('Xcode target is an iPhone-only production identity with explicit versioning', () => {
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  const plist = read('ios/App/App/Info.plist');
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = io\.scenegen\.app;/);
  assert.match(project, /MARKETING_VERSION = 1\.1;/);
  assert.match(project, /CURRENT_PROJECT_VERSION = 1;/);
  assert.match(project, /TARGETED_DEVICE_FAMILY = 1;/);
  assert.match(plist, /<key>CFBundleDisplayName<\/key>\s*<string>SceneGen<\/string>/);
  assert.match(plist, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
});

test('native release preparation validates before syncing Xcode', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['ios:check'], /check-ios-release\.mjs/);
  assert.match(pkg.scripts['ios:check'], /release-readiness\.test\.js/);
  assert.match(pkg.scripts['ios:prepare'], /^pnpm ios:check && pnpm ios:assets && pnpm ios:sync$/);
});

test('native runtime keeps external navigation outside the embedded app', () => {
  const source = read('src/components/providers/native-runtime.tsx');
  assert.match(source, /Capacitor\.isNativePlatform\(\)/);
  assert.match(source, /Browser\.open/);
  assert.match(source, /url\.origin !== window\.location\.origin/);
  assert.match(source, /target\.target === '_blank'/);
  assert.match(source, /window\.location\.assign\(url\.toString\(\)\)/);
});

test('embedded login excludes unsupported Google OAuth', () => {
  const source = read('src/app/login/page.tsx');
  assert.match(source, /SocialLogin\.login/);
  assert.match(source, /nativeSocialSignIn\("apple"\)/);
  assert.match(source, /nativeSocialSignIn\("google"\)/);
  assert.match(source, /!nativePlatform[\s\S]*signIn\("google"/);
  assert.match(source, /signIn\("google"/);
});

test('native entry points avoid generic provider selection', () => {
  const header = read('src/components/header/app-header.tsx');
  const dashboard = read('src/app/dashboard/page.tsx');
  const calendar = read('src/app/calendar/page.tsx');
  const calendarModal = read('src/components/shows/GoogleCalendarConnectModal.tsx');
  assert.doesNotMatch(header + dashboard, /signIn\(\)|signIn\(undefined/);
  assert.match(calendar, /disabled=\{Capacitor\.isNativePlatform\(\)\}/);
  assert.match(calendarModal, /if \(Capacitor\.isNativePlatform\(\)\)/);
});

test('Xcode setup documents signing, privacy and real-device testing', () => {
  const guide = read('IOS_XCODE_SETUP.md');
  assert.match(guide, /Automatically manage signing/);
  assert.match(guide, /privacy manifests/);
  assert.match(guide, /real iPhone/);
  assert.match(guide, /Sign in with Apple/);
});
