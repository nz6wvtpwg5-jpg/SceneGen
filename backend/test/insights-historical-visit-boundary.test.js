const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const start = server.indexOf("app.get('/api/contact-intelligence'");
const end = server.indexOf("app.post('/api/contacts/private/:id/link'", start);
const route = server.slice(start, end);
const cteStart = route.indexOf('WITH eligible AS (');
const countriesStart = route.indexOf('), countries AS (');
const citiesStart = route.indexOf('), cities AS (');
const pointsStart = route.indexOf('), points AS (');
const eligibility = route.slice(cteStart, countriesStart);
const countries = route.slice(countriesStart, citiesStart);
const cities = route.slice(citiesStart, pointsStart);

test('visited map has one workspace-scoped historical show source', () => {
  assert.ok(cteStart >= 0 && countriesStart > cteStart && citiesStart > countriesStart);
  assert.match(eligibility, /s\.entity_id::text=\$1::text/);
  assert.match(eligibility, /s\.date\s*<\s*CURRENT_DATE/);
  assert.match(eligibility, /NOT IN \('off_day','travel_day'\)/);
  assert.match(eligibility, /NOT IN \('cancelled','canceled'\)/);
});

test('country counts and fee aggregates only use eligible historical shows', () => {
  assert.match(countries, /FROM eligible\s+WHERE/);
  assert.doesNotMatch(countries, /FROM shows/);
});

test('cities and resolved city locations never add an upcoming show', () => {
  assert.match(cities, /FROM eligible e/);
  assert.match(cities, /city_geocode_cache/);
  assert.doesNotMatch(cities, /FROM shows/);
  assert.match(route, /'countries',COALESCE/);
  assert.match(route, /'cities',COALESCE/);
});

test('historical date boundary excludes today as well as future dates', () => {
  const today = new Date('2026-10-13T12:00:00Z');
  const historical = (date) => date < today.toISOString().slice(0, 10);
  assert.equal(historical('2026-10-12'), true);
  assert.equal(historical('2026-10-13'), false);
  assert.equal(historical('2027-02-12'), false);
});
