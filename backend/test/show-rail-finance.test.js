const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../../src/app/shows/page.tsx'), 'utf8');

test('show rail uses the contractual guarantee rather than sales as its fee', () => {
  assert.match(source, /show\.guarantee/);
  assert.match(source, />Show fee /);
  assert.doesNotMatch(source, /const fees = budget\.totalSales/);
});

test('off and travel days cannot display performance fees', () => {
  assert.match(source, /\['off_day', 'travel_day'\]\.includes\(show\.showType/);
  assert.match(source, /isPerformanceDate && show\.guarantee/);
});

test('show fees and budget costs keep their authoritative currencies', () => {
  assert.match(source, /showCurrencySymbol = show\.currency/);
  assert.match(source, /costCurrencySymbol = budget\?\.currency/);
  assert.match(source, /Number\.isFinite\(showFee\)/);
  assert.match(source, /Number\.isFinite\(costs\)/);
});
