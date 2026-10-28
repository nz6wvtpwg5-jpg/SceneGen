const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('show PATCH uses an own-property allowlist and consistent serialization', () => {
  const server = read('backend/server.js');

  assert.match(server, /Object\.hasOwn\(allowedFields, key\)/);
  assert.match(server, /Unsupported show fields/);
  assert.match(server, /result\.rows\.map\(serializeShow\)/);
  assert.match(server, /show\.guaranteedFee \?\? show\.fee \?\? undefined/);
  assert.doesNotMatch(server, /setLength: '00:45:00'/);
});

test('tour markers open persisted day sheets without placeholder timings', () => {
  const map = read('src/components/maps/TourMap.tsx');

  assert.match(map, /router\.push\(`\/shows\/\$\{show\.id\}`\)/);
  assert.doesNotMatch(map, /doorsTime: '19:00'/);
  assert.doesNotMatch(map, /showTime: '20:00'/);
  assert.doesNotMatch(map, /setLength: '90 min'/);
});

test('day sheets preserve unknown currencies and persisted itinerary types', () => {
  const page = read('src/app/shows/[id]/page.tsx');

  assert.match(page, /currency not set/);
  assert.doesNotMatch(page, /currency = "USD"/);
  assert.match(page, /show\.showType === "off_day"/);
  assert.match(page, /show\.showType === "travel_day"/);
});

test('road-ready day sheets expose actions and block invalid schedules', () => {
  const page = read('src/app/shows/[id]/page.tsx');
  const styles = read('src/app/globals.css');

  assert.match(page, /google\.com\/maps\/dir\/\?api=1&destination=/);
  assert.match(page, /<ShareShowModal/);
  assert.match(page, /href=\{`mailto:/);
  assert.match(page, /href=\{`tel:/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /disabled=\{saving \|\| formTimingIssues\.length > 0\}/);
  assert.match(page, /label === "Finish" && previous\[1\] >= 18 \* 60 && current <= 6 \* 60/);
  assert.match(styles, /@media print/);
  assert.match(styles, /\.day-sheet-no-print \{ display: none !important; \}/);
});
