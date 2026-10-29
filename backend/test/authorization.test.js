const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { createPrivateIdentityMiddleware, createEntityAuthorizationMiddleware } = require('../authorization');

function response() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
function bearer(userId, secret) { const encoded = Buffer.from(userId).toString('base64url'); return `Bearer ${encoded}.${crypto.createHmac('sha256', secret).update(encoded).digest('base64url')}`; }

test('accepts a correctly signed private identity and ignores spoofed user header', async () => {
  process.env.BACKEND_SERVICE_TOKEN = 'test-secret'; const actual = '11111111-1111-4111-8111-111111111111';
  const req = { method: 'GET', path: '/shows', headers: { authorization: bearer(actual, 'test-secret'), 'x-user-id': 'spoofed' } }; const res = response(); let next = false;
  await createPrivateIdentityMiddleware()(req, res, () => { next = true; });
  assert.equal(next, true); assert.equal(req.userId, actual); assert.equal(req.headers['x-user-id'], actual);
});

test('rejects a forged private identity', async () => {
  process.env.BACKEND_SERVICE_TOKEN = 'test-secret'; const req = { method: 'GET', path: '/shows', headers: { authorization: bearer('11111111-1111-4111-8111-111111111111', 'wrong') } }; const res = response();
  await createPrivateIdentityMiddleware()(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 401);
});

test('rejects a malformed signature without throwing', async () => {
  process.env.BACKEND_SERVICE_TOKEN = 'test-secret';
  const encoded = Buffer.from('11111111-1111-4111-8111-111111111111').toString('base64url');
  const req = { method: 'GET', path: '/shows', headers: { authorization: `Bearer ${encoded}.${'é'.repeat(43)}` } }; const res = response();
  await createPrivateIdentityMiddleware()(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 401);
});

test('allows public read-only token lookups without private identity', async () => {
  process.env.BACKEND_SERVICE_TOKEN = 'test-secret';
  for (const path of ['/shared/show/token-value', '/invites/token-value']) {
    const req = { method: 'GET', path, headers: {} }; const res = response(); let next = false;
    await createPrivateIdentityMiddleware()(req, res, () => { next = true; });
    assert.equal(next, true);
  }
});

test('reconciles a stale collaborator UUID to the unique live account for its session email', async () => {
  process.env.BACKEND_SERVICE_TOKEN = 'test-secret';
  const stale = '11111111-1111-4111-8111-111111111111';
  const canonical = '22222222-2222-4222-8222-222222222222';
  const pool = { query: async (sql, values) => {
    assert.match(sql, /lower\(trim\(email\)\)=\$1/);
    assert.deepEqual(values, ['barrakusin@gmail.com']);
    return { rowCount: 1, rows: [{ id: canonical, email: 'barrakusin@gmail.com' }] };
  } };
  const req = { requestId: 'request-1', method: 'GET', path: '/my-day-sheets', headers: {
    authorization: bearer(stale, 'test-secret'), 'x-user-email': ' BARRAKUSIN@GMAIL.COM ',
  } };
  const res = response(); let next = false;
  await createPrivateIdentityMiddleware(pool)(req, res, () => { next = true; });
  assert.equal(next, true);
  assert.equal(req.userId, canonical);
  assert.equal(req.headers['x-user-id'], canonical);
  assert.equal(req.headers['x-user-email'], 'barrakusin@gmail.com');
});

test('rejects a collaborator session whose email no longer resolves to a live account', async () => {
  process.env.BACKEND_SERVICE_TOKEN = 'test-secret';
  const userId = '11111111-1111-4111-8111-111111111111';
  const pool = { query: async () => ({ rowCount: 0, rows: [] }) };
  const req = { method: 'GET', path: '/my-day-sheets', headers: {
    authorization: bearer(userId, 'test-secret'), 'x-user-email': 'removed@example.com',
  } };
  const res = response();
  await createPrivateIdentityMiddleware(pool)(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, 'SESSION_IDENTITY_INVALID');
});

test('rejects an entity the authenticated user cannot access', async () => {
  const pool = { query: async () => ({ rows: [] }) }; const req = { method: 'GET', headers: { 'x-entity-id': 'entity-a' }, query: {}, body: {}, userId: 'user-a' }; const res = response();
  await createEntityAuthorizationMiddleware(pool)(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 403);
});

test('rejects conflicting entity identifiers before querying', async () => {
  const pool = { query: async () => assert.fail('must not query') };
  const req = { method: 'POST', headers: { 'x-entity-id': 'entity-a' }, query: {}, body: { entityId: 'entity-b' }, userId: 'user-a' }; const res = response();
  await createEntityAuthorizationMiddleware(pool)(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 400); assert.equal(res.body.error.code, 'ENTITY_MISMATCH');
});

test('allows an owner to mutate an entity', async () => {
  const pool = { query: async (sql) => {
    assert.match(sql, /administrator_id = \$2::text/);
    assert.match(sql, /em\.user_id = \$2::uuid/);
    return { rows: [{ id: 'entity-a', role: 'owner' }] };
  } };
  const req = { method: 'DELETE', headers: { 'x-entity-id': 'entity-a' }, query: {}, body: {}, userId: 'user-a' }; const res = response(); let next = false;
  await createEntityAuthorizationMiddleware(pool)(req, res, () => { next = true; });
  assert.equal(next, true); assert.equal(req.entityRole, 'owner');
});

test('prevents a viewer from mutating an entity', async () => {
  const pool = { query: async () => ({ rows: [{ id: 'entity-a', role: 'viewer' }] }) };
  const req = { method: 'POST', headers: { 'x-entity-id': 'entity-a' }, query: {}, body: {}, userId: 'user-a' }; const res = response();
  await createEntityAuthorizationMiddleware(pool)(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 403);
});

test('prevents an editor from deleting an entity', async () => {
  const pool = { query: async () => ({ rows: [{ id: 'entity-a', role: 'editor' }] }) };
  const req = { method: 'DELETE', headers: { 'x-entity-id': 'entity-a' }, query: {}, body: {}, userId: 'user-a' }; const res = response();
  await createEntityAuthorizationMiddleware(pool)(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 403);
});

test('resolves a show ID to its entity before authorizing', async () => {
  const calls = [];
  const pool = { query: async (sql, values) => { calls.push({ sql, values }); if (sql.includes('FROM shows')) return { rows: [{ entity_id: 'entity-b' }] }; return { rows: [] }; } };
  const req = { method: 'PATCH', path: '/shows/22222222-2222-4222-8222-222222222222', headers: {}, query: {}, body: {}, userId: 'user-a' }; const res = response();
  await createEntityAuthorizationMiddleware(pool)(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 403); assert.equal(calls[1].values[0], 'entity-b');
});

test('requires entity context for an entity-owned collection', async () => {
  const pool = { query: async () => assert.fail('database should not be queried') };
  const req = { method: 'GET', path: '/shows', headers: {}, query: {}, body: {}, userId: 'user-a' }; const res = response();
  await createEntityAuthorizationMiddleware(pool)(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 400); assert.equal(res.body.error.code, 'ENTITY_REQUIRED');
});

test('allows an authorized owner to access a resource resolved by ID', async () => {
  const pool = { query: async (sql) => sql.includes('FROM tours') ? { rows: [{ entity_id: 'entity-a' }] } : { rows: [{ id: 'entity-a', role: 'owner' }] } };
  const req = { method: 'DELETE', path: '/tours/33333333-3333-4333-8333-333333333333', headers: {}, query: {}, body: {}, userId: 'user-a' }; const res = response(); let next = false;
  await createEntityAuthorizationMiddleware(pool)(req, res, () => { next = true; });
  assert.equal(next, true); assert.equal(req.entityId, 'entity-a');
});

test('resolves a budget ID to its entity before authorizing', async () => {
  const calls = [];
  const pool = { query: async (sql, values) => { calls.push({ sql, values }); if (sql.includes('FROM budgets')) return { rows: [{ entity_id: 'entity-c' }] }; return { rows: [] }; } };
  const req = { method: 'GET', path: '/budgets/55555555-5555-4555-8555-555555555555', headers: {}, query: {}, body: {}, userId: 'user-a' }; const res = response();
  await createEntityAuthorizationMiddleware(pool)(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 403); assert.equal(calls[1].values[0], 'entity-c');
});

test('rejects a nonexistent direct resource before its handler executes', async () => {
  const pool = { query: async (sql) => sql.includes('FROM shows') ? { rows: [] } : assert.fail('must not authorize') };
  const req = { method: 'GET', path: '/shows/66666666-6666-4666-8666-666666666666', headers: {}, query: {}, body: {}, userId: 'user-a' }; const res = response();
  await createEntityAuthorizationMiddleware(pool)(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 400); assert.equal(res.body.error.code, 'ENTITY_REQUIRED');
});

test('does not let an explicit entity header disguise another entity record', async () => {
  const pool = { query: async (sql, values) => {
    if (sql.includes('FROM shows')) return { rows: [{ entity_id: 'victim-entity' }] };
    assert.equal(values[0], 'victim-entity'); return { rows: [] };
  } };
  const req = { method: 'GET', path: '/shows/44444444-4444-4444-8444-444444444444', headers: { 'x-entity-id': 'attacker-entity' }, query: {}, body: {}, userId: 'attacker' }; const res = response();
  await createEntityAuthorizationMiddleware(pool)(req, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 403);
});


test('invite acceptance reads only verified req.userId', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const route = source.split("app.post('/api/invites/:token/accept',")[1]?.split('// =====================')[0];
  assert.ok(route);
  assert.match(route, /const userId = req\.userId;/);
  assert.doesNotMatch(route, /req\.headers\[['"]x-user-id['"]\]/);
  assert.match(source, /app\.use\('\/api', createPrivateIdentityMiddleware\(pool\)\)/);
});
