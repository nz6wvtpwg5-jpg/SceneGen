const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('tour currency is authoritative in reads and persisted records', () => {
  const server = read('backend/server.js');
  const migration = read('backend/migrations/062_tour_currency_authority.sql');
  const resolver = server.slice(server.indexOf('const effectiveShowCurrencySql'), server.indexOf('const showReadinessSql'));
  assert.ok(resolver.indexOf('SELECT upper(trim(tour.currency))') < resolver.indexOf('WHERE budget.show_id'));
  assert.match(migration, /UPDATE shows[\s\S]*FROM tours/);
  assert.match(migration, /UPDATE budgets[\s\S]*upper\(trim\(tour\.currency\)\)/);
  assert.match(migration, /CREATE TRIGGER tours_currency_cascade/);
});

test('routing map receives tour currency and is locked by default', () => {
  const page = read('src/app/tours/[id]/page.tsx');
  const map = read('src/components/maps/TourMap.tsx');
  assert.match(page, /currency=\{tour\.currency\}/);
  assert.match(map, /currency: currency \|\| show\.currency/);
  assert.match(map, /draggable: exploreMode/);
  assert.match(map, /scrollwheel: exploreMode/);
  assert.match(map, /gestureHandling: exploreMode \? 'greedy' : 'none'/);
  assert.match(map, /Explore map/);
});

test('tour page relies on the application shell for scrolling', () => {
  const page = read('src/app/tours/[id]/page.tsx');
  assert.doesNotMatch(page, /h-\[92\.5vh\][^"']*overflow-y-scroll/);
  assert.match(page, /h-\[440px\]/);
});

test('map fee display uses a neutral money icon', () => {
  const tooltip = read('src/components/maps/MarkerTooltip.tsx');
  assert.match(tooltip, /Banknote/);
  assert.doesNotMatch(tooltip, /DollarSign/);
});
