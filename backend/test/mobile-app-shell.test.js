const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('authenticated mobile pages use a dedicated header and bottom navigation', () => {
  const shell = read('src/components/layout/app-shell.tsx');
  assert.match(shell, /<MobileHeader/);
  assert.match(shell, /<MobileNavigation/);
  assert.match(shell, /h-\[100dvh\]/);
});

test('mobile navigation exposes the four road-critical destinations and More', () => {
  const navigation = read('src/components/layout/mobile-navigation.tsx');
  for (const destination of ['Today', 'Shows', 'Tours', 'Contacts', 'More']) assert.match(navigation, new RegExp(`['>]${destination}`));
  assert.doesNotMatch(navigation, /Conversations/);
  assert.match(navigation, /min-h-\[62px\]/);
  assert.match(navigation, />\{signingOut \? 'Signing out…' : 'Sign out'\}<\/button>/);
});

test('mobile shell supports device safe areas without changing desktop navigation', () => {
  const css = read('src/app/globals.css');
  const header = read('src/components/header/app-header.tsx');
  const layout = read('src/app/layout.tsx');
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(header, /hidden h-\[72px\].*sm:flex/);
  assert.match(layout, /viewportFit: "cover"/);
});
