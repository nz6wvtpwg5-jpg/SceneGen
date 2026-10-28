const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validServiceToken, serviceTokenMiddleware } = require('../service-token');
const { deploymentCapabilitiesHandler } = require('../deployment-capabilities');

const root = path.resolve(__dirname, '..');

test('every local JS import used by the server exists at deploy time', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  for (const [, , moduleName] of server.matchAll(/require\((['"])(\.[^'"]+)\1\)/g)) {
    const resolved = path.resolve(root, moduleName);
    assert.ok(fs.existsSync(resolved + '.js') || fs.existsSync(path.join(resolved, 'index.js')) || fs.existsSync(resolved + '.json'),
      'Missing local server dependency: ' + moduleName);
  }
});

function mockResponse() {
  return { code: 200, data: null, headers: {}, status(code) { this.code = code; return this; },
    json(data) { this.data = data; return this; }, set(key, value) { this.headers[key] = value; return this; } };
}

test('private service tokens are compared securely', () => {
  assert.equal(validServiceToken('good', 'good'), true);
  assert.equal(validServiceToken('good', 'good2'), false);
  assert.equal(validServiceToken('good', ''), false);
  assert.equal(validServiceToken('', 'good'), false);
  assert.equal(validServiceToken(undefined, undefined), false);
});

test('service-to-service authentication fails closed when token is missing or incorrect', () => {
  const previous = process.env.BACKEND_SERVICE_TOKEN;
  try {
    const next = { count: 0, invoke() { this.count++; } };
    delete process.env.BACKEND_SERVICE_TOKEN;
    let result = mockResponse();
    serviceTokenMiddleware({ headers: {} }, result, () => next.invoke());
    assert.equal(result.code, 503);
    process.env.BACKEND_SERVICE_TOKEN = 'test-secret';
    result = mockResponse();
    serviceTokenMiddleware({ headers: { 'x-scenegen-service-token': 'wrong-secret' } }, result, () => next.invoke());
    assert.equal(result.code, 401);
    result = mockResponse();
    serviceTokenMiddleware({ headers: { 'x-scenegen-service-token': 'test-secret' } }, result, () => next.invoke());
    assert.equal(result.code, 200);
    assert.equal(next.count, 1);
  } finally {
    if (previous === undefined) delete process.env.BACKEND_SERVICE_TOKEN;
    else process.env.BACKEND_SERVICE_TOKEN = previous;
  }
});

test('internal capability check responds with safe public deployment metadata', () => {
  const res = mockResponse();
  deploymentCapabilitiesHandler({}, res);
  assert.equal(res.data.service, 'scenegen-api');
  assert.equal(res.data.status, 'ready');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.doesNotMatch(JSON.stringify(res.data), /token|secret|database_url/i);
});
