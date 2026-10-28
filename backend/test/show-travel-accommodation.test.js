const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('travel and accommodation records match the legacy show entity key', () => {
  const sql = read('backend/migrations/031_show_travel_and_accommodation.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS show_travel_plans/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS show_accommodations/);
  assert.equal((sql.match(/show_id UUID PRIMARY KEY REFERENCES shows\(id\) ON DELETE CASCADE/g) || []).length, 2);
  assert.equal((sql.match(/entity_id VARCHAR\(255\) NOT NULL/g) || []).length, 2);
  assert.match(sql, /arrival_at >= departure_at/);
  assert.match(sql, /check_out_at > check_in_at/);
  assert.doesNotMatch(sql, /entity_id UUID NOT NULL REFERENCES entities/);
});

test('journey derives only unambiguous route data from the preceding tour stop', () => {
  const api = read('backend/show-logistics.js');
  assert.match(api, /lag\(id\) OVER \(ORDER BY date, start_time, id\)/);
  assert.match(api, /HAVING count\(DISTINCT distance\)=1/);
  assert.match(api, /distance \/ 50 \* 60/);
  assert.match(api, /suggested_departure_local/);
  assert.match(api, /origin: previous \?/);
  assert.match(api, /crosses_border: Boolean\(fromCountry && toCountry && fromCountry !== toCountry\)/);
});

test('derived journey preserves local scheduling and detects international travel', () => {
  const { derivedTravel } = require('../show-logistics');
  const travel = derivedTravel(
    { id: 'show', date: '2026-09-05', load_in_time: '18:00:00', city: 'Paris', country: 'France' },
    { id: 'previous', city: 'Berlin', country: 'Germany' },
    null,
    250,
  );
  assert.equal(travel.duration_minutes, 330);
  assert.equal(travel.suggested_departure_local, '2026-09-05T12:30');
  assert.equal(travel.crosses_border, true);
});

test('standalone shows do not manufacture an inbound travel plan', () => {
  const { hasRecordedJourney } = require('../show-logistics');
  assert.equal(hasRecordedJourney(null), false);
  assert.equal(hasRecordedJourney({ transport_mode: 'van' }), false);
  assert.equal(hasRecordedJourney({ departure_at: '2026-09-11T15:00:00Z' }), true);
  const api = read('backend/show-logistics.js');
  assert.match(api, /journeyAvailable: Boolean\(previous\.rows\[0\] \|\| hasRecordedJourney\(travel\.rows\[0\]\)\)/);
});

test('logistics API validates chronology, links, and collaborator finance permissions', () => {
  const api = read('backend/show-logistics.js');
  assert.match(api, /Arrival cannot be before departure/);
  assert.match(api, /Check-out must be after check-in/);
  assert.match(api, /\['http:', 'https:'\]\.includes/);
  assert.match(api, /delete accommodation\.payer/);
  assert.match(api, /delete accommodation\.outstanding_balance/);
  assert.match(api, /financialAccess !== 'edit'/);
  assert.match(api, /This invitation cannot edit accommodation finances/);
  assert.match(api, /with a timezone/);
});

test('logistics updates preserve omitted fields atomically', () => {
  const api = read('backend/show-logistics.js');
  assert.match(api, /\$15::jsonb \? 'transportMode'/);
  assert.match(api, /\$16::jsonb \? 'outstandingBalance'/);
  assert.match(api, /RETURNING show_id/);
  assert.match(api, /if \(!saved\.rowCount\) return res\.status\(404\)/);
});

test('timestamp and URL validation reject ambiguous or unsafe values', () => {
  const { instant, safeUrl } = require('../show-logistics');
  assert.equal(instant('2026-09-05T12:00').valid, false);
  assert.equal(instant('2026-09-05T12:00:00Z').valid, true);
  assert.equal(instant('2026-09-05T12:00:00+02:00').valid, true);
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('https://hotel.example/confirmation').startsWith('https://'), true);
});

test('internal and collaborator day sheets share logistics through isolated routes', () => {
  const component = read('src/components/shows/TravelAccommodation.tsx');
  const internalPage = read('src/app/shows/[id]/page.tsx');
  const externalPage = read('src/app/external-day-sheets/[id]/page.tsx');
  const internalProxy = read('src/app/api/shows/[id]/logistics/route.ts');
  const externalProxy = read('src/app/api/collaborator/shows/[id]/logistics/route.ts');
  assert.match(component, /Travel & accommodation/);
  assert.match(component, /<FlightBooking[\s\S]*\{showJourney && <article/);
  assert.doesNotMatch(component, /Tour origin|Not recorded|Not estimated/);
  assert.match(component, /This route crosses a border/);
  assert.match(component, /financialAccess !== 'hidden'/);
  assert.match(component, /if \(financialAccess !== 'edit'\)/);
  assert.match(component, /currency not set/);
  assert.match(component, /instantFromLocal/);
  assert.match(internalPage, /<TravelAccommodation/);
  assert.match(externalPage, /financialAccess=\{permissions\.financialAccess\}/);
  assert.match(internalProxy, /daySheetProxy/);
  assert.match(externalProxy, /collaboratorIdentityHeaders/);
  assert.match(externalProxy, /Collaborator sign-in required/);
});
