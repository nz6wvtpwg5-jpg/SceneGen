const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('mobile day-sheet edits survive an interrupted connection', () => {
  const draft = read('src/lib/day-sheet-draft.ts');
  const page = read('src/app/shows/[id]/page.tsx');
  assert.match(draft, /entityId.*showId/);
  assert.match(draft, /userId/);
  assert.match(draft, /baseUpdatedAt/);
  assert.match(draft, /localStorage\.setItem/);
  assert.match(page, /Unsaved day-sheet draft restored/);
  assert.match(page, /removeDaySheetDraft/);
  assert.match(page, /Waiting for connection/);
  assert.match(page, /draftChanges/);
  assert.match(page, /const payload = draftValues\(draftChanges/);
  assert.doesNotMatch(page, /const payload: Partial<EditableShow> = \{ \.\.\.form \}/);
  assert.match(page, /editorRef/);
  assert.match(page, /event\.key === 'Escape'/);
});

test('mobile editor has reachable actions and road-friendly fields', () => {
  const page = read('src/app/shows/[id]/page.tsx');
  assert.match(page, /sticky top-0/);
  assert.match(page, /sticky bottom-0/);
  assert.match(page, /mobile-safe-bottom/);
  assert.match(page, /Save changes/);
  assert.match(page, /EditorSection title="Run of show"/);
  assert.match(page, /text-base.*sm:text-sm/);
});
