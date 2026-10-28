const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const { matches, overlaps, resolveShowCountry, territoryLabel } = require('../territories');

test('venue selection retains the Google country through tour import', () => {
  const places = source('src/components/maps/PlacesAutocomplete.tsx');
  const importer = source('src/app/import/components/Step3Validation.tsx');
  assert.match(places, /component\.types\.includes\('country'\)/);
  assert.match(places, /onChange\(address, lat, lng, name, city, state, country\)/);
  assert.match(importer, /handleAddressChange\(index, address, lat, lng, name, city, state, country\)/);
  assert.match(importer, /updatedShow\.country = addressData\.country/);
});

test('bulk venue repair writes API-supported coordinates and country', () => {
  const bulk = source('src/app/venues/bulk-update/page.tsx');
  assert.match(bulk, /latitude: addressData\.lat/);
  assert.match(bulk, /longitude: addressData\.lng/);
  assert.match(bulk, /country: addressData\.country \|\| currentShow\.country/);
  assert.doesNotMatch(bulk, /venueLat: addressData\.lat/);
});

test('country resolver recognizes canonical and exact full-address locations', () => {
  assert.equal(resolveShowCountry('UK', ''), 'United Kingdom');
  assert.equal(resolveShowCountry('', 'Ancienne Belgique, Brussels, Belgium'), 'Belgium');
  assert.equal(resolveShowCountry('', 'Manchester, England'), 'United Kingdom');
  assert.equal(resolveShowCountry('', 'Rock venue without a country'), '');
});

test('legacy and current continent values match the same countries', () => {
  const germany = resolveShowCountry('', 'Neusser Landstraße 2, 50735 Köln, Germany');
  assert.equal(matches(['Europe'], germany), true);
  assert.equal(matches(['@region:Europe'], germany), true);
  assert.equal(overlaps(['Europe'], ['Germany']), true);
  assert.equal(matches(['United Kingdom'], germany), false);
  assert.equal(territoryLabel('Europe'), 'Europe');
});

test('backend reads and writes reconcile country and coordinate representations', () => {
  const server = source('backend/server.js');
  assert.match(server, /const resolvedCountry = resolveShowCountry\(show\.country, show\.venueAddress\)/);
  assert.match(server, /show\.venueLat \?\? show\.latitude/);
  assert.match(server, /canonicalCountry\(show\.country\)/);
  assert.match(server, /venue_lat, venue_lng, latitude, longitude/);
});

test('deployment reconciles recoverable legacy location records', () => {
  const migration = source('backend/migrations/024_reconcile_show_locations.sql');
  assert.match(migration, /latitude = COALESCE\(latitude, venue_lat\)/);
  assert.match(migration, /venue_lat = COALESCE\(venue_lat, latitude\)/);
  assert.match(migration, /scenegen_territory_matches\(region\.name, candidate\.candidate\)/);
  assert.match(migration, /scenegen_country_key\(recognized\.candidate\) = 'GB'/);
  assert.match(migration, /'england', 'scotland', 'wales', 'northern ireland'/);
  assert.doesNotMatch(migration, /city.*grant access/i);
});

test('deployment canonicalizes legacy continent grants without pending collisions', () => {
  const migration = source('backend/migrations/025_normalize_legacy_continent_grants.sql');
  assert.match(migration, /row_number\(\) OVER/);
  assert.match(migration, /duplicate_rank > 1/);
  assert.match(migration, /array_agg\(CASE territory/);
  assert.match(migration, /WHEN 'Europe' THEN '@region:Europe'/);
  assert.match(migration, /WITH ORDINALITY/);
  assert.match(migration, /UPDATE day_sheet_access_grants/);
  assert.match(migration, /UPDATE day_sheet_access_invites/);
  assert.match(migration, /IS DISTINCT FROM normalized\.countries/);
});
