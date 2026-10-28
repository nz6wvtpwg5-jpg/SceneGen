const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('daily itinerary migration stores custom operations with legacy entity compatibility', () => {
  const sql = read('backend/migrations/030_show_daily_itinerary.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS show_itinerary_events/);
  assert.match(sql, /entity_id VARCHAR\(255\) NOT NULL/);
  assert.match(sql, /show_id UUID NOT NULL REFERENCES shows\(id\) ON DELETE CASCADE/);
  assert.match(sql, /day_offset SMALLINT NOT NULL DEFAULT 0/);
  assert.match(sql, /archived_at TIMESTAMPTZ/);
  assert.match(sql, /'call', 'travel', 'border', 'flight', 'ferry', 'accommodation'/);
  assert.doesNotMatch(sql, /entity_id UUID NOT NULL REFERENCES entities/);
});

test('itinerary API merges authoritative run-of-show values and orders all events', () => {
  const api = read('backend/show-itinerary.js');
  assert.match(api, /\['load_in', 'Load-in', 'production', show\.load_in_time/);
  assert.match(api, /\['on_stage', 'On stage', 'performance', show\.start_time/);
  assert.match(api, /overnightFinish \? 1 : 0/);
  assert.match(api, /left\.day_offset - right\.day_offset/);
  assert.match(api, /event\.archived_at IS NULL/);
});

test('itinerary mutations enforce identity, tenant, scope, and partial updates', () => {
  const api = read('backend/show-itinerary.js');
  assert.match(api, /\['advance', 'full'\]\.includes\(req\.daySheetPermissions\?\.editScope\)/);
  assert.match(api, /show_record\.entity_id::text=\$1::text/);
  assert.match(api, /Invalid itinerary record/);
  assert.match(api, /Event time is invalid/);
  assert.match(api, /!Array\.isArray\(req\.body\) \? req\.body : \{\}/);
  assert.match(api, /title=CASE WHEN \$4::boolean THEN \$5 ELSE event\.title END/);
  assert.match(api, /responsible_person=CASE WHEN \$16::boolean THEN \$17 ELSE event\.responsible_person END/);
});

test('system events move overnight finishes to the following day', () => {
  const { systemEvents } = require('../show-itinerary');
  const events = systemEvents({ venue_name: 'Night Hall', start_time: '23:00:00', end_time: '01:15:00' });
  assert.equal(events.find((event) => event.id === 'system-on_stage').day_offset, 0);
  assert.equal(events.find((event) => event.id === 'system-finish').day_offset, 1);
});

test('internal and isolated collaborator proxies preserve their identity paths', () => {
  const internal = read('src/app/api/shows/[id]/itinerary/route.ts');
  const external = read('src/app/api/collaborator/shows/[id]/itinerary/route.ts');
  const externalEvent = read('src/app/api/collaborator/shows/[id]/itinerary/[eventId]/route.ts');
  assert.match(internal, /daySheetProxy/);
  assert.match(external, /collaboratorIdentityHeaders/);
  assert.match(external, /Collaborator sign-in required/);
  assert.doesNotMatch(externalEvent, /export async function DELETE/);
});

test('internal and external day sheets render the same chronological itinerary', () => {
  const component = read('src/components/shows/DailyItinerary.tsx');
  const internal = read('src/app/shows/[id]/page.tsx');
  const external = read('src/app/external-day-sheets/[id]/page.tsx');
  assert.match(component, /Complete itinerary/);
  assert.match(component, /Previous day/);
  assert.match(component, /Following day/);
  assert.match(component, /Responsible person/);
  assert.match(component, /await confirmDialog/);
  assert.match(internal, /<DailyItinerary/);
  assert.match(external, /api\/collaborator\/shows/);
});
