const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('shared dialogs become scrollable full-screen sheets on phones', () => {
  const source = read('src/components/ui/dialog.tsx');
  assert.match(source, /fixed inset-0/);
  assert.match(source, /max-h-\[100dvh\]/);
  assert.match(source, /overflow-y-auto/);
  assert.match(source, /sm:left-\[50%\]/);
  assert.match(source, /sm:inset-auto sm:left-\[50%\] sm:top-\[50%\]/);
  assert.match(source, /env\(safe-area-inset-top\)/);
});

test('dialog actions and close control remain thumb friendly', () => {
  const source = read('src/components/ui/dialog.tsx');
  assert.match(source, /grid grid-cols-2 gap-3/);
  assert.match(source, /h-12 w-12/);
  assert.match(source, /focus-visible:ring-2/);
});

test('shared form controls avoid mobile browser zoom and short targets', () => {
  const textarea = read('src/components/ui/textarea.tsx');
  const select = read('src/components/ui/select.tsx');
  assert.match(textarea, /text-base/);
  assert.match(textarea, /sm:text-sm/);
  assert.match(select, /min-h-12/);
  assert.match(select, /text-base/);
  assert.match(select, /70dvh/);
});

test('global accessibility respects keyboard focus and reduced motion', () => {
  const source = read('src/app/globals.css');
  assert.match(source, /:focus-visible/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /overflow-wrap: break-word/);
});
