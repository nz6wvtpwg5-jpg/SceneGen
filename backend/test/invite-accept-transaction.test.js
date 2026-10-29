const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const route = source.split("app.post('/api/invites/:token/accept',")[1]?.split('// =====================')[0];

test('invitation acceptance uses a single transaction with locked invitation', () => {
  assert.ok(route);
  assert.match(route, /pool\.connect\(/);
  assert.match(route, /client\.query\('BEGIN'\)/);
  assert.match(route, /SELECT \* FROM invites WHERE token = \$1 FOR UPDATE/);
  assert.match(route, /client\.query\('COMMIT'\)/);
  assert.match(route, /client\.query\('ROLLBACK'\)/);
  assert.match(route, /client\.release\(\)/);
});

test('connection insert precedes invitation accepted state and requires recipient entity', () => {
  assert.match(route, /ENTITY_REQUIRED/);
  assert.ok(route.indexOf('INSERT INTO contacts') < route.indexOf('UPDATE invites SET status'));
  assert.ok(route.indexOf('UPDATE invites SET status') < route.indexOf("client.query('COMMIT')"));
  assert.match(route, /const userId = req\.userId/);
});
