/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const header = fs.readFileSync(path.resolve(__dirname, '../../src/components/header/app-header.tsx'), 'utf8');

test('the account avatar opens settings and an explicit sign-out action', () => {
  assert.match(header, /DropdownMenuTrigger asChild/);
  assert.match(header, /aria-label={`Open account menu for \$\{accountName\}`}/);
  assert.match(header, /href="\/settings\?tab=workspace"/);
  assert.match(header, /href="\/settings\?tab=personal"/);
  assert.match(header, /onSelect=\{\(\) => void signOut\(\{ callbackUrl: '\/' \}\)\}/);
  assert.doesNotMatch(header, /title="Sign out"/);
});