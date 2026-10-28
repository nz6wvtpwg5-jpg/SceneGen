const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('landing page exposes both public legal documents', () => {
  const landing = read('src/app/page.tsx');
  assert.match(landing, /href="\/terms"/);
  assert.match(landing, /href="\/privacy"/);
  assert.match(read('src/app/terms/page.tsx'), /Terms of Service/);
  assert.match(read('src/app/privacy/page.tsx'), /Privacy Policy/);
  assert.match(read('src/app/terms/page.tsx'), /canonical: '\/terms'/);
  assert.match(read('src/app/privacy/page.tsx'), /canonical: '\/privacy'/);
});

test('legal pages are public and render outside the authenticated app shell', () => {
  const middleware = read('src/middleware.ts');
  const shell = read('src/components/layout/app-shell.tsx');
  for (const route of ['/terms', '/privacy']) {
    assert.ok(middleware.includes(`"${route}"`));
    assert.ok(shell.includes(`"${route}"`));
  }
});
