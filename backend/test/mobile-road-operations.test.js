const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('road-operation editors become full-screen mobile workspaces', () => {
  for (const file of ['DailyItinerary.tsx', 'TravelAccommodation.tsx', 'DocumentVault.tsx']) {
    const source = read(`src/components/shows/${file}`);
    assert.match(source, /min-h-\[100dvh\]/, file);
    assert.match(source, /mobile-safe-top sticky top-0/, file);
    assert.match(source, /mobile-safe-bottom sticky bottom-0/, file);
    assert.match(source, /sm:min-h-0/, file);
  }
});

test('road-operation controls meet mobile touch and text sizing requirements', () => {
  const advance = read('src/components/shows/AdvanceChecklist.tsx');
  const itinerary = read('src/components/shows/DailyItinerary.tsx');
  const travel = read('src/components/shows/TravelAccommodation.tsx');
  const vault = read('src/components/shows/DocumentVault.tsx');
  assert.match(advance, /h-11 w-11/);
  assert.match(advance, /text-base.*md:text-xs/);
  assert.match(itinerary, /\[&_input\]:text-base/);
  assert.match(travel, /text-base.*sm:text-sm/);
  assert.match(vault, /\[&_input\]:text-base/);
});

test('existing operation permissions remain wired into mobile controls', () => {
  const advance = read('src/components/shows/AdvanceChecklist.tsx');
  const itinerary = read('src/components/shows/DailyItinerary.tsx');
  const travel = read('src/components/shows/TravelAccommodation.tsx');
  const vault = read('src/components/shows/DocumentVault.tsx');
  assert.match(advance, /disabled=\{!canEdit\}/);
  assert.match(itinerary, /canEdit && !event\.system/);
  assert.match(travel, /financialAccess !== 'hidden'/);
  assert.match(vault, /financialUploadAllowed/);
});
