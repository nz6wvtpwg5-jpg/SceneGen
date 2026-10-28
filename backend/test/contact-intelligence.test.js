/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('contact intelligence keeps provenance workspace scoped', () => {
  const migration = read('migrations/038_contact_intelligence.sql');
  const server = read('server.js');
  assert.match(migration, /entity_id UUID NOT NULL/);
  assert.match(migration, /PRIMARY KEY \(contact_id, show_id\)/);
  assert.match(read('migrations/063_private_show_contact_capture.sql'), /private_contact_shows\(contact_id,show_id,entity_id,venue_location,band_genres\)/);
  assert.match(server, /pcs\.entity_id=\$1::uuid/);
  assert.match(server, /WHERE pc\.entity_id=\$1::uuid/);
});

test('heat maps exclude non-performances and never combine currencies', () => {
  const server = read('server.js');
  assert.match(server, /s\.date<CURRENT_DATE/);
  assert.match(server, /NOT IN \('off_day','travel_day'\)/);
  assert.match(server, /NOT IN \('cancelled','canceled'\)/);
  assert.match(server, /GROUP BY country,currency/);
  assert.match(server, /currency=\$2/);
});

test('every show-writing path uses transactional database capture', () => {
  const sql = read('migrations/063_private_show_contact_capture.sql');
  assert.match(sql, /AFTER INSERT OR UPDATE OF promoter_name/);
  assert.match(sql, /DELETE FROM private_contact_shows WHERE show_id=NEW.id/);
  assert.match(sql, /ON CONFLICT \(entity_id,lower\(email\)\)/);
  assert.match(sql, /band_genres/);
});
