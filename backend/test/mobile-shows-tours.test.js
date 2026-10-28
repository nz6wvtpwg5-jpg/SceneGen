const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('shows have a dedicated mobile schedule without replacing desktop tools', () => {
  const page = read('src/app/shows/page.tsx');
  const mobile = read('src/components/shows/mobile-shows-schedule.tsx');
  assert.match(page, /MobileShowsSchedule/);
  assert.match(page, /hidden flex-col.*sm:flex/);
  assert.match(mobile, /Search venue or city/);
  assert.match(mobile, /Filter shows by status/);
  assert.match(mobile, /Filter shows by tour/);
  assert.match(mobile, /href=\{`\/shows\/\$\{show\.id\}`\}/);
  assert.match(mobile, /readinessPercentage/);
  assert.match(mobile, /min-h-12/);
  assert.match(mobile, /focus-visible:ring-2/);
});

test('tours have mobile route and financial summary cards', () => {
  const page = read('src/app/tours/page.tsx');
  const mobile = read('src/components/tours/mobile-tours-list.tsx');
  assert.match(page, /MobileToursList/);
  assert.match(page, /hidden sm:block/);
  assert.match(mobile, /Projected net/);
  assert.match(mobile, /Open route/);
  assert.match(mobile, /totalMiles/);
  assert.match(mobile, /currencyTotals/);
  assert.match(mobile, /aria-label=\{`Delete/);
});
