/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('onboarding is enabled and accepts active workspace memberships', () => {
  const hook = read('src/hooks/useOnboardingRedirect.ts');
  const server = read('backend/server.js');
  assert.doesNotMatch(hook, /DISABLE_ENTITY_CHECK/);
  assert.match(hook, /Array\.isArray\(entities\) && entities\.length > 0/);
  assert.match(server, /LEFT JOIN entity_memberships/);
  assert.match(server, /em\.status = 'active'/);
  assert.match(server, /membership_role/);
});

test('calendar sync trusts the backend show and persists the supported field', () => {
  const route = read('src/app/api/calendar/sync/route.ts');
  assert.match(route, /backendJson\(`\$\{backend\}\/api\/shows\/\$\{encodeURIComponent\(showId\)\}`/);
  assert.doesNotMatch(route, /const \{ showId, show \}/);
  assert.match(route, /googleCalendarEventId: createdEventId/);
  assert.match(route, /calendar\.deleteEvent\(createdEventId\)/);
  assert.match(route, /googleCalendarEventId: null/);
  assert.match(route, /googleCalendarEventId: eventId/);
});

test('calendar UI sends workspace context and implements removal', () => {
  const button = read('src/components/shows/CalendarSyncButton.tsx');
  assert.match(button, /'X-Entity-Id': entityId/);
  assert.match(button, /method: 'DELETE'/);
  assert.match(button, /JSON\.stringify\(\{ showId: show\.id \}\)/);
  assert.doesNotMatch(button, /feature will be available soon/);
});

test('calendar events use show timing and a resolved timezone', () => {
  const service = read('src/services/google-calendar.ts');
  assert.match(service, /show\.showTime/);
  assert.match(service, /show\.endTime/);
  assert.doesNotMatch(service, /America\/New_York/);
  assert.match(service, /timeZone,/);
  assert.match(service, /parsedDate\.getUTCFullYear\(\) !== year/);
  assert.match(service, /providerStatus === 404/);
  assert.doesNotMatch(service, /console\.error\([^\n]+, error\)/);
});
