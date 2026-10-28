const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('promoter show cities are sourced only from past, non-cancelled shows in the selected workspace', () => {
  const server = source('backend/server.js');
  const start = server.indexOf("app.get('/api/contacts',");
  const end = server.indexOf("app.post('/api/contacts/private',", start);
  const query = server.slice(start, end);
  assert.ok(start >= 0 && end > start, 'contacts endpoint exists');
  assert.match(query, /as show_locations/);
  assert.match(query, /FROM private_contact_shows pcs JOIN shows s ON s.id=pcs.show_id/);
  assert.match(query, /pcs.entity_id=\$1::uuid/);
  assert.match(query, /s.entity_id::text=\$1::text/);
  assert.match(query, /s.date<CURRENT_DATE/);
  assert.match(query, /NOT IN \('off_day','travel_day'\)/);
  assert.match(query, /NOT IN \('cancelled','canceled'\)/);
  assert.match(query, /COALESCE\(s.venue_lat,s.latitude\)/);
  assert.match(query, /COALESCE\(s.venue_lng,s.longitude\)/);
  assert.match(query, /private_contact.city as contact_city/);
});

const ts = require('typescript');
const compiled = ts.transpileModule(source('src/lib/contactDirectory.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exportsForTest = {};
new Function('exports', compiled)(exportsForTest);
const { contactShowCities, contactPlaces, contactMapPoints, contactPosition } = exportsForTest;

const promoter = {
  id: 'contact-1',
  source: 'private',
  contactCity: undefined,
  contactCountry: undefined,
  showLocations: [
    { showId: 'one', city: 'Liverpool', state: 'England', country: 'United Kingdom', latitude: null, longitude: null },
    { showId: 'two', city: ' liverpool ', state: 'England', country: 'united kingdom', latitude: '53.4', longitude: '-3.0' },
    { showId: 'three', city: 'Manchester', state: 'England', country: 'United Kingdom', latitude: '53.48', longitude: '-2.24' },
    { showId: 'four', city: 'Paris', country: 'France', latitude: null, longitude: null },
    { showId: 'five', city: ' ', country: 'Germany', latitude: 50, longitude: 8 },
  ],
};

test('each previous show city appears once and picks valid coordinates without inventing a residence', () => {
  const cities = contactShowCities(promoter);
  assert.deepEqual(cities.map((place) => place.city), ['Liverpool', 'Manchester', 'Paris']);
  assert.equal(cities[0].showCount, 2);
  assert.equal(cities[0].latitude, 53.4);
  assert.equal(cities[0].longitude, -3);
  assert.equal(promoter.contactCity, undefined);
  assert.equal(promoter.contactCountry, undefined);
});

test('city/country filters can match historic cities together rather than mixing countries', () => {
  const places = contactPlaces(promoter);
  const matches = (country, city) => places.some((place) =>
    (!country || place.country.toLowerCase() === country.toLowerCase())
    && (!city || place.city.toLowerCase() === city.toLowerCase()));
  assert.equal(matches('France', 'Paris'), true);
  assert.equal(matches('United Kingdom', 'Manchester'), true);
  assert.equal(matches('France', 'Manchester'), false);
});

test('map points describe show locations, not the promoter home', () => {
  const points = contactMapPoints(promoter);
  assert.equal(points.length, 2);
  assert.ok(points.every((point) => point.source === 'show'));
  assert.deepEqual(contactPosition(promoter), [53.4, -3]);
  assert.deepEqual(contactMapPoints({ ...promoter, source: 'scenegen' }), []);
});

test('an explicit personal location remains a separately labelled map point', () => {
  const withLocation = { ...promoter, contactCity: 'Leeds', contactCountry: 'United Kingdom', contactLatitude: 53.8, contactLongitude: -1.55 };
  const points = contactMapPoints(withLocation);
  assert.equal(points.length, 3);
  assert.equal(points[2].source, 'contact');
  assert.equal(points[2].city, 'Leeds');
  assert.ok(contactPlaces(withLocation).some((place) => place.city === 'Leeds' && place.source === 'contact'));
});
