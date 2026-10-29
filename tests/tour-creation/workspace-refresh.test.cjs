const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../src/app/tours/page.tsx'), 'utf8');
test('workspace changes invalidate old tour results and clear old lists', () => {
  assert.match(source, /activeProfile\?\.id, status, session\?\.user\?\.id/);
  assert.match(source, /setTours\(\[\]\)/);
  assert.match(source, /setTourStats\(\{\}\)/);
  assert.match(source, /generation !== loadGeneration\.current/);
});
test('tour stats query uses captured workspace identity', () => {
  assert.match(source, /fetchTourStats\(data, generation, activeProfile\?\.id \|\| ''\)/);
  assert.match(source, /'X-Entity-Id': workspaceId/);
});
