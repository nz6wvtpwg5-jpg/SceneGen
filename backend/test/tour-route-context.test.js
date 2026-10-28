/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('tour detail actions await Next route params and preserve the active band context', () => {
  const route = read('src/app/api/tours/[id]/route.ts');
  const distances = read('src/app/api/tours/[id]/calculate-distances/route.ts');

  assert.match(route, /type Context = \{ params: Promise<\{ id: string \}> \}/);
  assert.equal((route.match(/const \{ id \} = await params/g) || []).length, 3);
  assert.match(route, /'X-Entity-Id': entityId/);
  assert.match(route, /Choose a band workspace before opening this tour/);
  assert.doesNotMatch(route, /const \{ id \} = params/);
  assert.match(distances, /const \{ id: tourId \} = await params/);
});
