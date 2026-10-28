const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('bookkeeping uses mobile cards without removing its desktop ledger', () => {
  const page = read('src/app/bookkeeping/page.tsx');
  assert.match(page, /divide-y divide-white\/10 sm:hidden/);
  assert.match(page, /hidden overflow-x-auto sm:block/);
  for (const label of ['Revenue', 'Costs', 'Net', 'Margin']) assert.match(page, new RegExp(label));
});

test('budget creation is a touch-safe full-screen phone workflow', () => {
  const page = read('src/app/bookkeeping/page.tsx');
  assert.match(page, /mobile-safe-top mobile-safe-bottom panel-dark min-h-\[100dvh\]/);
  assert.match(page, /sticky top-0/);
  assert.match(page, /min-h-12 w-full/);
  assert.match(page, /text-base/);
});

test('agent commission excludes merchandise revenue', () => {
  const page = read('src/app/bookkeeping/page.tsx');
  assert.match(page, /commissionableIncome = parseFloat\(feePaid/);
  assert.match(page, /agentFeeAmount = commissionableIncome/);
  assert.match(page, /agentCommission = \(ticketSales \* agentPercent\)/);
  assert.match(page, /Merch sales are excluded/);
  assert.doesNotMatch(page, /agentCommission = \(totalSales \* agentPercent\)/);
});

test('merch dashboard prioritizes compact phone actions, stats and tabs', () => {
  const page = read('src/app/merch/page.tsx');
  assert.match(page, /grid grid-cols-2 gap-2 sm:flex/);
  assert.match(page, /grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6/);
  assert.match(page, /overflow-x-auto/);
  assert.match(page, /mobile-safe-top mobile-safe-bottom h-\[100dvh\]/);
});

test('merch sales use expandable mobile cards and retain the desktop table', () => {
  const sales = read('src/components/merch/MerchSalesTable.tsx');
  assert.match(sales, /space-y-3 sm:hidden/);
  assert.match(sales, /hidden overflow-x-auto rounded-lg border sm:block/);
  assert.match(sales, /dateSales\.length.*transactions/);
  assert.match(sales, /toggleDate\(dateKey\)/);
  assert.match(sales, /toggleSale\(sale\.id\)/);
  assert.match(sales, /Order ID: \{sale\.squareOrderId\}/);
  assert.match(sales, /sale\.items\.map/);
  assert.match(sales, /min-w-\[900px\]/);
});
