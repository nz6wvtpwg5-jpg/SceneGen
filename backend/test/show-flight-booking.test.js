/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { normalizedDate, normalizedFlightNumber } = require('../flight-validation');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('flight booking migration is show-scoped and keeps a timetable snapshot', () => {
  const migration = read('backend/migrations/055_show_flight_bookings.sql');
  assert.match(migration, /show_id UUID PRIMARY KEY REFERENCES shows\(id\) ON DELETE CASCADE/);
  assert.match(migration, /booking_status IN \('not_booked', 'planned', 'booked'\)/);
  assert.match(migration, /provider_flight_id/);
  assert.match(migration, /booking_status <> 'booked'/);
});

test('manual flight entry validates the flight number and date', () => {
  assert.equal(normalizedFlightNumber(' ba 283 '), 'BA283');
  assert.equal(normalizedFlightNumber('not a flight'), null);
  assert.equal(normalizedDate('2026-09-12'), '2026-09-12');
  assert.equal(normalizedDate('2026-02-31'), null);
});

test('flight details use a provider-free manual workflow', () => {
  const server = read('backend/show-logistics.js');
  const component = read('src/components/shows/FlightBooking.tsx');
  const render = read('render.yaml');
  assert.doesNotMatch(render, /AVIATIONSTACK_API_KEY|AERODATABOX_API_KEY/);
  assert.doesNotMatch(server, /router\.get\('\/shows\/:id\/flights'/);
  assert.match(server, /body\.section === 'flight'/);
  assert.match(server, /Flight arrival cannot be before departure/);
  assert.match(server, /Airport codes must contain three letters/);
  assert.match(server, /String\(body\.departureIata \|\| ''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(component, /Is a flight booked\?/);
  assert.match(component, /Enter the details from the airline confirmation or booking email/);
  assert.doesNotMatch(component, /Find flight|Flight lookup|lookupEndpoint/);
  assert.match(component, /provider: '', providerFlightId: ''/);
  assert.match(component, /date\.getFullYear\(\)/);
  assert.match(component, /date\.getHours\(\)/);
  assert.doesNotMatch(component, /new Date\(value\)\.toISOString\(\)\.slice\(0, 16\)/);
});

test('show update proxy preserves structured backend errors', () => {
  const proxy = read('src/app/api/shows/[id]/route.ts');
  const page = read('src/app/shows/[id]/page.tsx');
  assert.match(proxy, /errorBody = JSON\.parse\(errorText\)/);
  assert.doesNotMatch(proxy.slice(proxy.indexOf('export async function PATCH'), proxy.indexOf('export async function DELETE')), /NextResponse\.json\(\{ error: errorText \}/);
  assert.match(page, /details && details !== error\.message/);
});
