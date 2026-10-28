const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('tour overview calculates drive information from cities without venue coordinates', () => {
  const overview = read('src/components/maps/TourOverviewModal.tsx');
  assert.match(overview, /const cityLocation = \(show: Show\)/);
  assert.match(overview, /origin: google\.maps\.LatLngLiteral \| string/);
  assert.match(overview, /destination: google\.maps\.LatLngLiteral \| string/);
  assert.doesNotMatch(overview, /if \(!currentLat \|\| !currentLng \|\| !nextLat \|\| !nextLng\)/);
});

test('weather and map details remain available for a city-level stop', () => {
  const overview = read('src/components/maps/TourOverviewModal.tsx');
  const tooltip = read('src/components/maps/MarkerTooltip.tsx');
  const map = read('src/components/maps/TourMap.tsx');

  assert.match(overview, /if \(!nextShow\?\.venueCity\) return/);
  assert.match(tooltip, /Approximate city location/);
  assert.match(map, /locationPrecision=\{hoveredShow\.location_precision\}/);
  assert.match(map, /nextShow\.venue_name \|\| nextShow\.city/);
});

test('calendar and search use city data when the venue name is unknown', () => {
  const showsPage = read('src/app/shows/page.tsx');
  assert.match(showsPage, /summary: show\.venueName \|\| show\.venueCity/);
  assert.match(showsPage, /\[show\.venueAddress, show\.venueCity, show\.venueState, show\.venueCountry\]/);
  assert.match(showsPage, /\(show\.venueName \|\| ''\)\.toLowerCase\(\)/);
});

test('venue-only capacity is not presented as city-derived data', () => {
  const tooltip = read('src/components/maps/MarkerTooltip.tsx');
  assert.match(tooltip, /locationPrecision === 'venue'/);
  assert.match(tooltip, /Capacity belongs to a confirmed venue/);
});

test('city-ready map and show surfaces do not invent a currency', () => {
  const routeUtils = read('src/lib/maps/routeUtils.ts');
  const tooltip = read('src/components/maps/MarkerTooltip.tsx');
  const daySheet = read('src/components/maps/DaySheetModal.tsx');
  const showsTable = read('src/components/shows/ShowsTable.tsx');

  assert.match(routeUtils, /currency: show\.currency/);
  assert.match(tooltip, /currency not set/);
  assert.match(daySheet, /currency not set/);
  assert.doesNotMatch(showsTable, /show\.currency \? `\$\{show\.currency\} ` : ['"]\$['"]/);
});
