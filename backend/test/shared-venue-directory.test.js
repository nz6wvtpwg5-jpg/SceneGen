/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { fingerprint, venueDetails } = require('../venue-directory');
const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');

test('venue fingerprints normalize casing and whitespace', () => {
  assert.equal(fingerprint({name:' The Cavern ',city:'Liverpool',country:'UK',address:'10  Mathew St'}), fingerprint({name:'the cavern',city:'liverpool',country:'uk',address:'10 Mathew St'}));
});
test('missing coordinates remain null rather than becoming zero', () => {
  assert.equal(venueDetails({venueName:'Venue',city:'Leeds'}).latitude,null);
  assert.equal(venueDetails({venueName:'Venue',city:'Leeds'}).capacity,null);
  assert.equal(venueDetails({venueName:'Venue',city:'Leeds',latitude:51,longitude:999}).latitude,null);
  assert.equal(venueDetails({venueName:'Venue',city:'Leeds',capacity:-1}).capacity,null);
});
test('migration creates and backfills a canonical shared directory', () => {
  const sql=read('backend/migrations/046_shared_venue_directory.sql');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS venues/);
  assert.match(sql,/google_place_id/);
  assert.match(sql,/ALTER TABLE shows ADD COLUMN IF NOT EXISTS venue_id/);
  assert.match(sql,/INSERT INTO venues/);
  assert.match(sql,/COALESCE\(show_type,'show'\)='show'/);
  assert.match(sql,/CASE WHEN COALESCE\(venue_lat,latitude\) BETWEEN -90 AND 90/);
});
test('all show ingestion paths link venues', () => {
  const server=read('backend/server.js'), proposals=read('backend/show-proposals.js');
  assert.match(server,/upsertVenue\(client/);
  assert.match(server,/source: 'tour_import'/);
  assert.match(proposals,/source:'agent_proposal'/);
});
test('public lookup returns factual fields only', () => {
  const server=read('backend/server.js');
  const start=server.indexOf("app.get('/api/venues'");
  const route=server.slice(start,server.indexOf('// GET /api/shows/:id',start));
  assert.match(route,/usageCount/);
  for(const privateField of ['promoter_email','fee','notes','entity_id']) assert.doesNotMatch(route,new RegExp(privateField));
});
test('show form searches SceneGen venues and preserves Google identity', () => {
  const form=read('src/components/shows/CreateShowForm.tsx'), picker=read('src/components/shows/VenueDirectoryAutocomplete.tsx');
  assert.match(form,/venuePlaceId: place\.place_id/);
  assert.match(form,/venueId: undefined/);
  assert.match(form,/onChange=\{handleVenueNameChange\}/);
  assert.match(form,/onStoredVenueSelect/);
  assert.match(picker,/\/api\/venues/);
});
test('shared Google venue facts are accepted only after server verification', () => {
  const server=read('backend/server.js'), directory=read('backend/venue-directory.js');
  assert.match(server,/await verifiedPlace\(String\(input\.venuePlaceId\)\)/);
  assert.match(server,/googleVerified: true/);
  assert.match(directory,/input\.googleVerified===true/);
  assert.match(directory,/capacity=COALESCE\(capacity,\$13\)/);
  assert.match(server,/const showVenue = venue \?/);
  assert.match(server,/External collaborators cannot change canonical venue identity/);
  assert.ok((server.match(/await trustedVenueInput\(/g) || []).length >= 3);
});
