const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('day sheet has a dedicated mobile live-operations surface', () => {
  const page = read('src/app/shows/[id]/page.tsx');
  const mobile = read('src/components/shows/mobile-day-sheet.tsx');
  assert.match(page, /MobileDaySheet/);
  assert.match(page, /hidden.*sm:flex/);
  assert.match(mobile, /Live operations/);
  assert.match(mobile, /Load-in/);
  assert.match(mobile, /Soundcheck/);
  assert.match(mobile, /Directions/);
  assert.match(mobile, /href=\{`tel:/);
  assert.match(mobile, /Ready for the road/);
});

test('mobile day sheet keeps operational sections reachable and permissions intact', () => {
  const page = read('src/app/shows/[id]/page.tsx');
  const mobile = read('src/components/shows/mobile-day-sheet.tsx');
  assert.match(page, /id="day-sheet-advance"/);
  assert.match(page, /id="day-sheet-travel"/);
  assert.match(page, /id="day-sheet-documents"/);
  assert.match(mobile, /financialVisible/);
  assert.match(mobile, /canEdit &&/);
  assert.match(mobile, /canShare &&/);
  assert.match(mobile, /onPrint/);
  assert.match(mobile, /!itineraryDay/);
  assert.match(page, /financialAccess=\{financialEditable \? "edit"/);
  assert.match(page, /min-h-\[100dvh\]/);
});
