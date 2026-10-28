const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const migratedFiles = [
  'src/app/bookkeeping/page.tsx',
  'src/app/import/components/Step3Validation.tsx',
  'src/app/shows/page.tsx',
  'src/app/tours/[id]/page.tsx',
  'src/app/tours/page.tsx',
  'src/components/contacts/ContactsTable.tsx',
  'src/components/manage/DaySheetCollaborators.tsx',
  'src/components/shows/CalendarEventModal.tsx',
];

test('platform confirmation provider resolves confirm and cancellation paths', () => {
  const provider = read('src/components/ui/confirm-dialog-provider.tsx');
  const layout = read('src/app/layout.tsx');

  assert.match(provider, /new Promise\(\(resolve\)/);
  assert.match(provider, /finish\(false\)/);
  assert.match(provider, /finish\(true\)/);
  assert.match(provider, /onOpenChange=\{\(open\) => \{ if \(!open\) finish\(false\); \}\}/);
  assert.match(provider, /tone\?: 'default' \| 'destructive'/);
  assert.match(layout, /<ConfirmDialogProvider>[\s\S]*<AppShell>\{children\}<\/AppShell>[\s\S]*<\/ConfirmDialogProvider>/);
});

test('targeted workflows do not use blocking browser dialogs', () => {
  for (const file of migratedFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /\b(?:window\.)?(?:alert|confirm)\s*\(/, file);
  }
});

test('destructive workflows use explicit platform confirmation copy', () => {
  for (const file of [
    'src/app/bookkeeping/page.tsx',
    'src/app/shows/page.tsx',
    'src/app/tours/[id]/page.tsx',
    'src/app/tours/page.tsx',
    'src/components/manage/DaySheetCollaborators.tsx',
    'src/components/shows/CalendarEventModal.tsx',
  ]) {
    const source = read(file);
    assert.match(source, /await confirmDialog\(\{/i, file);
    assert.match(source, /tone: ['"]destructive['"]/, file);
    assert.match(source, /confirmLabel:/, file);
  }
});
