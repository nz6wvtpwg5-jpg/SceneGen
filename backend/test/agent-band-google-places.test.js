/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('agent-created bands use the shared Google Places city selector', () => {
  const agent = read('src/app/agent/page.tsx');
  const picker = read('src/components/contacts/ContactLocationPicker.tsx');

  assert.match(agent, /ContactLocationPicker/);
  assert.match(agent, /onPendingChange=\{setLocationPending\}/);
  assert.match(agent, /Choose the home city from the Google Places suggestions/);
  assert.doesNotMatch(agent, />Home city<input/);
  assert.doesNotMatch(agent, />Country<input/);
  assert.match(picker, /types=\{CITY_TYPES\}/);
  assert.match(picker, /const CITY_TYPES = \['\(cities\)'\]/);
  assert.match(picker, /contactLocationFromPlace/);
});

test('canonical coordinates survive invitation creation and artist acceptance', () => {
  const migration = read('backend/migrations/044_agent_band_invitation_coordinates.sql');
  const server = read('backend/server.js');

  assert.match(migration, /latitude DOUBLE PRECISION/);
  assert.match(migration, /longitude DOUBLE PRECISION/);
  assert.match(migration, /latitude BETWEEN -90 AND 90/);
  assert.match(server, /Choose the home city from the Google Places suggestions/);
  assert.match(server, /latitude, longitude, token_hash/);
  assert.match(server, /invitation\.latitude, invitation\.longitude/);
  assert.match(server, /name, bio, city, state, country, latitude, longitude/);
});
