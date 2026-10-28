const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('map data retains city and country when a venue is unconfirmed', () => {
  const routeUtils = read('src/lib/maps/routeUtils.ts');
  assert.match(routeUtils, /country: show\.venueCountry/);
  assert.match(routeUtils, /location_precision/);
});

test('tour map resolves city-level coordinates without promoting them to venues', () => {
  const map = read('src/components/maps/TourMap.tsx');
  assert.match(map, /findPlaceFromQuery/);
  assert.match(map, /Confirm the tour cities/);
  assert.match(map, /Confirm cities and build route/);
  assert.match(map, /formatted_address/);
  assert.match(map, /location_precision: 'city'/);
  assert.match(map, /Those markers are approximate until their venues are confirmed/);
  assert.doesNotMatch(map, /venueCountry: 'USA'/);
});

test('server mileage uses city addresses when venue coordinates are absent', () => {
  const server = read('backend/server.js');
  const routing = read('backend/tour-route-mileage.js');
  assert.match(server, /\{ address: query, precision: 'city' \}/);
  assert.match(server, /\[city, show\.state\]/);
  assert.match(routing, /prepareRouteStops/);
  assert.match(routing, /approximate/);
});

test('city fallback does not write approximate coordinates to shows', () => {
  const routing = read('backend/tour-route-mileage.js');
  assert.doesNotMatch(routing, /UPDATE shows/i);
  assert.match(routing, /INSERT INTO tour_route_legs/);
  assert.match(routing, /meters == null/);
});
