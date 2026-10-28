const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('route mileage changes operational leg records, not financial budgets', () => {
  const server = read('backend/server.js');
  const routing = read('backend/tour-route-mileage.js');
  const start = server.indexOf("app.post('/api/tours/:id/calculate-distances'");
  const end = server.indexOf('// =====================\n// MERCH SALES ENDPOINTS', start);
  assert.ok(start >= 0 && end > start);
  const handler = server.slice(start, end);
  assert.match(handler, /createRouteMileageHandler/);
  assert.match(routing, /INSERT INTO tour_route_legs/);
  assert.doesNotMatch(routing, /UPDATE budgets|INSERT INTO budgets|DELETE FROM budgets/i);
});

test('failed routing preserves prior mileage before atomic writes', () => {
  const routing = read('backend/tour-route-mileage.js');
  assert.match(routing, /legs\.push\(await computeDrivingLeg/);
  assert.match(routing, /await client\.query\('BEGIN'\)/);
  assert.match(routing, /await client\.query\('COMMIT'\)/);
  assert.match(routing, /await client\.query\('ROLLBACK'\)/);
  assert.match(routing, /SELECT id FROM tours WHERE id=\$1 AND entity_id=\$2 FOR UPDATE/);
});

test('off and travel day classification preserves imported line items', () => {
  const validationStep = read('src/app/import/components/Step3Validation.tsx');
  const helperStart = validationStep.indexOf('function prepareBudgetsForImport');
  const helperEnd = validationStep.indexOf('interface SingleShowFormProps', helperStart);
  const helper = validationStep.slice(helperStart, helperEnd);

  assert.match(helper, /return calculateDistancesForImport/);
  assert.doesNotMatch(helper, /lineItems\.filter/);
});

test('a calculated zero distance is not discarded as falsy', () => {
  const routing = read('backend/tour-route-mileage.js');
  const validationStep = read('src/app/import/components/Step3Validation.tsx');
  assert.match(routing, /meters == null/);
  assert.match(routing, /Number\(meters\) < 0/);
  assert.match(validationStep, /address\?\.lat != null && item\.address\?\.lng != null/);
  assert.match(validationStep, /origin\?\.lat != null && origin\?\.lng != null/);
  assert.match(validationStep, /destination\?\.lat != null && destination\?\.lng != null/);
});
