const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
for (const file of ['src/components/shows/AddToTourModal.tsx', 'src/components/tours/CreateTourModal.tsx']) {
  test(`${file} reuses created tours on attachment retry`, () => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /pendingCreatedTour/);
    assert.match(source, /if \(!pendingCreatedTour(?:Id)?\.current\)/);
    assert.match(source, /await addShowsToTour\(/);
    assert.match(source, /Retry to attach/);
  });
}
