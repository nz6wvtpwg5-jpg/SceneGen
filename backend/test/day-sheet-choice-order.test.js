const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');

test('day-sheet choices are newest-first at the API boundary and UI boundary', () => {
  const backend = fs.readFileSync(path.join(root, 'backend/day-sheet-collaborators.js'), 'utf8');
  const component = fs.readFileSync(path.join(root, 'src/components/manage/DaySheetCollaborators.tsx'), 'utf8');

  assert.match(backend, /ORDER BY date DESC NULLS LAST, id/);
  assert.match(component, /setShows\(newestShowsFirst\(data\.shows \|\| \[\]\)\)/);
  assert.match(component, /function ShowChoicePicker/);
  assert.match(component, /Newest show first/);
  assert.match(component, /Search \$\{shows\.length\} day sheets/);
  assert.match(component, /if \(!\/\^\\S\+@\\S\+\\\.\\S\+\$\/\.test\(email\)\)/);
  assert.match(component, /scopeType === 'countries' && selectedCountries\.length === 0/);
  assert.match(component, /scopeType === 'tour' && !tourId/);
  assert.match(component, /scopeType === 'show' && !showId/);
});
