const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the public mobile landing uses the actual iOS app landing component', () => {
  const landing = read('src/app/page.tsx');
  assert.match(landing, /import \{ NativeAppLanding \}/);
  assert.match(landing, /className="md:hidden"><NativeAppLanding \/>/);
  assert.match(landing, /className="hidden md:block"><main/);
  assert.doesNotMatch(landing, /Capacitor\.isNativePlatform|navigator\.userAgent|window\.location/);
});

test('the dedicated Capacitor entry continues to use the same landing', () => {
  const nativeEntry = read('src/app/app/page.tsx');
  const capacitor = read('capacitor.config.ts');
  assert.match(nativeEntry, /return <NativeAppLanding \/>/);
  assert.match(capacitor, /DEFAULT_NATIVE_SERVER_URL = 'https:\/\/scenegen-web\.onrender\.com\/app'/);
});

test('authenticated phone pages retain the shared iOS-style shell', () => {
  const shell = read('src/components/layout/app-shell.tsx');
  const header = read('src/components/layout/mobile-header.tsx');
  const navigation = read('src/components/layout/mobile-navigation.tsx');
  assert.match(shell, /<MobileHeader \/>/);
  assert.match(shell, /<MobileNavigation \/>/);
  assert.match(header, /sm:hidden/);
  assert.match(navigation, /sm:hidden/);
});

test('browser-safe rendering does not widen native-only capabilities', () => {
  const runtime = read('src/components/providers/native-runtime.tsx');
  const push = read('src/components/providers/native-push-provider.tsx');
  assert.match(runtime, /if \(!Capacitor\.isNativePlatform\(\)\) return/);
  assert.match(push, /!Capacitor\.isNativePlatform\(\) \|\| Capacitor\.getPlatform\(\) !== 'ios'/);
});
