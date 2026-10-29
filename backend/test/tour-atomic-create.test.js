const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const route = source.split("app.post('/api/tours', authMiddleware,")[1]?.split('// GET /api/tours/:id')[0];
test('tour with shows creates and attaches within the same locked transaction', () => {
  assert.ok(route);
  for (const step of ["client.query('BEGIN')", 'FOR UPDATE', 'INSERT INTO tours', 'UPDATE shows SET tour_id', "client.query('COMMIT')"]) assert.ok(route.includes(step), step);
  assert.ok(route.indexOf('INSERT INTO tours') < route.indexOf('UPDATE shows SET tour_id'));
  assert.ok(route.indexOf('UPDATE shows SET tour_id') < route.indexOf("client.query('COMMIT')"));
  assert.match(route, /client\.query\('ROLLBACK'\)/);
  assert.match(route, /client\.release\(\)/);
  assert.match(route, /owned\.rows\.length !== ids\.length/);
});
