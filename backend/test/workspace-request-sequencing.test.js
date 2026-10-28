/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('workspace counts wait for an active entity before requesting private collections', () => {
  const tours = read('src/hooks/useTourCount.ts');
  const shows = read('src/hooks/useShowCount.ts');
  assert.match(tours, /if \(!entityId\)[\s\S]*setCount\(0\);[\s\S]*return;/);
  assert.match(shows, /if \(!entityId\)[\s\S]*setCount\(0\);[\s\S]*setTotalCount\(0\);[\s\S]*return;/);
});

test('collection hooks never send unscoped show or tour requests', () => {
  const tours = read('src/hooks/useTours.ts');
  const shows = read('src/hooks/useShows.ts');
  assert.match(tours, /if \(!entityId\) return \[\];/);
  assert.match(shows, /if \(!entityId\) return \[\];/);
});

test('collection proxies reject missing workspace context locally and identify tour failures', () => {
  const tours = read('src/app/api/tours/route.ts');
  const shows = read('src/app/api/shows/route.ts');
  assert.match(tours, /Choose a workspace before loading tours/);
  assert.match(tours, /endpoint: '\/api\/tours'/);
  assert.match(shows, /Choose a workspace before loading shows/);
});
