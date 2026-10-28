const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('touring uses switchable, touch-safe phone panes', () => {
  const layout = read('src/components/touring/TouringLayout.tsx');
  const filter = read('src/components/touring/TourFilter.tsx');
  const contacts = read('src/components/touring/PromoterContactsList.tsx');
  assert.match(layout, /h-\[100dvh\]/);
  assert.match(layout, /mobileView/);
  assert.match(layout, /aria-pressed=\{mobileView === 'map'\}/);
  assert.match(layout, /aria-pressed=\{mobileView === 'contacts'\}/);
  assert.match(layout, /min-h-0 flex-1/);
  assert.match(filter, /min-h-11/);
  assert.match(contacts, /text-base md:text-sm/);
});

test('conversations use a searchable mobile master-detail flow', () => {
  const page = read('src/app/conversations/page.tsx');
  const list = read('src/components/chat/conversation-list.tsx');
  assert.match(page, /h-\[100dvh\]/);
  assert.match(page, /All conversations/);
  assert.match(page, /md:hidden/);
  assert.match(list, /setQuery/);
  assert.match(list, /\.includes\(needle\)/);
  assert.match(list, /mobile-safe-top mobile-safe-bottom/);
  assert.match(list, /min-h-16/);
});

test('merch breakdown is accessible by tap and dismissible on phones', () => {
  const analytics = read('src/components/merch/MerchAnalytics.tsx');
  const breakdown = read('src/components/merch/ShowMerchBreakdown.tsx');
  assert.match(analytics, /onClick=\{\(event\)/);
  assert.match(analytics, /aria-expanded/);
  assert.match(analytics, /onClose=\{\(\) => setActiveShow\(null\)\}/);
  assert.match(breakdown, /mobile-safe-bottom fixed inset-x-0 bottom-0/);
  assert.match(breakdown, /75dvh/);
  assert.match(breakdown, /Close merch breakdown/);
});
