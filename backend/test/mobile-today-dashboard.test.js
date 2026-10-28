const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('mobile dashboard provides a road-ready Today view', () => {
  const dashboard = read('src/app/dashboard/page.tsx');
  const mobile = read('src/components/dashboard/mobile-today-dashboard.tsx');

  assert.match(dashboard, /MobileTodayDashboard/);
  assert.match(dashboard, /hidden max-w-\[1560px\].*sm:block/);
  assert.match(mobile, />Today</);
  assert.match(mobile, /Today’s show/);
  assert.match(mobile, /Open day sheet/);
  assert.match(mobile, /Directions/);
  assert.match(mobile, /Call contact/);
  assert.match(mobile, /Complete today’s timings/);
  assert.match(mobile, /href=\{`\/shows\/\$\{focusShow\.id\}`\}/);
});

test('mobile Today view uses local calendar dates and road-safe actions', () => {
  const mobile = read('src/components/dashboard/mobile-today-dashboard.tsx');

  assert.match(mobile, /now\.getFullYear\(\)/);
  assert.match(mobile, /google\.com\/maps\/search/);
  assert.match(mobile, /href=\{`tel:/);
  assert.match(mobile, /min-h-12/);
  assert.match(mobile, /sm:hidden/);
});
