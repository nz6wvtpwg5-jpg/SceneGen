const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('conversations are absent from MVP navigation and dashboard', () => {
  const navigation = read('src/app/config.tsx');
  const dashboard = read('src/app/dashboard/page.tsx');
  assert.doesNotMatch(navigation, /href: '\/conversations'/);
  assert.doesNotMatch(dashboard, /get\('\/api\/conversations'\)/);
  assert.doesNotMatch(dashboard, /label: 'Conversations'/);
});

test('direct conversation page visits return to contacts without disabling its API', () => {
  const middleware = read('src/middleware.ts');
  assert.match(middleware, /pathname === "\/conversations"/);
  assert.match(middleware, /NextResponse\.redirect\(new URL\("\/contacts"/);
  assert.doesNotMatch(middleware, /pathname\.startsWith\("\/conversations"\)/);
  assert.doesNotMatch(middleware, /pathname === "\/api\/conversations"/);
});
