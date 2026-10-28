const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backend = path.join(__dirname, '..');
const app = path.join(backend, '..', 'src');

test('festival identity is stored separately from the operational venue', () => {
  const migration = fs.readFileSync(path.join(backend, 'migrations/054_festival_names.sql'), 'utf8');
  const server = fs.readFileSync(path.join(backend, 'server.js'), 'utf8');
  const types = fs.readFileSync(path.join(app, 'types/show.ts'), 'utf8');
  assert.match(migration, /festival_name VARCHAR\(255\)/);
  assert.match(server, /festivalName: 'festival_name'/);
  assert.match(server, /Festival name must be 255 characters or fewer/);
  assert.match(types, /festivalName\?: string/);
});

test('day-sheet venue editing searches SceneGen and Google and persists verified place data', () => {
  const page = fs.readFileSync(path.join(app, 'app/shows/[id]/page.tsx'), 'utf8');
  const server = fs.readFileSync(path.join(backend, 'server.js'), 'utf8');
  const styles = fs.readFileSync(path.join(app, 'app/globals.css'), 'utf8');
  assert.match(page, /VenueDirectoryAutocomplete/);
  assert.match(page, /className="block md:col-span-2"/);
  assert.match(page, /onPlaceSelect=\{selectGoogleVenue\}/);
  assert.match(page, /onStoredVenueSelect=\{selectStoredVenue\}/);
  assert.match(page, /venuePlaceId: place\.place_id/);
  assert.match(page, /SceneGen can show up to 50 saved matches/);
  assert.match(styles, /\.pac-container \.pac-item \{[\s\S]*white-space: normal !important/);
  assert.match(server, /app\.get\('\/api\/venues'[\s\S]*LIMIT 50/);
  assert.match(server, /if \(fields\.venuePlaceId\)[\s\S]*trustedVenueInput\(fields\)/);
});

test('festival name leads day-sheet titles while venue remains visible', () => {
  const page = fs.readFileSync(path.join(app, 'app/shows/[id]/page.tsx'), 'utf8');
  const mobile = fs.readFileSync(path.join(app, 'components/shows/mobile-day-sheet.tsx'), 'utf8');
  const external = fs.readFileSync(path.join(app, 'app/external-day-sheets/[id]/page.tsx'), 'utf8');
  assert.match(page, /show\.festivalName \|\| show\.venueName \|\| "Venue TBC"/);
  assert.match(page, /show\.festivalName && show\.venueName/);
  assert.match(mobile, /show\.festivalName \|\| show\.venueName \|\| 'Venue TBC'/);
  assert.match(external, /show\.festivalName \|\| show\.venueName \|\| show\.venueCity/);
});

test('collaborator approval and access surfaces preserve festival changes', () => {
  const changes = fs.readFileSync(path.join(backend, 'day-sheet-changes.js'), 'utf8');
  const collaborators = fs.readFileSync(path.join(backend, 'day-sheet-collaborators.js'), 'utf8');
  assert.match(changes, /festivalName: 'festival_name'/);
  assert.match(collaborators, /COALESCE\(s\.festival_name, s\.venue_name, s\.city\)/);
});
