/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('bulk show updates use fixed SQL identifiers and bounded UUID input', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const start = server.indexOf("app.put('/api/shows/bulk-update'");
  const route = server.slice(start, server.indexOf('// TOURS ENDPOINTS', start));
  assert.match(route, /const allowedBulkFields = \{/);
  assert.match(route, /Object\.hasOwn\(allowedBulkFields, key\)/);
  assert.match(route, /showIds\.length > 500/);
  assert.doesNotMatch(route, /replace\(\/\(\[A-Z\]\)\/g/);
});
