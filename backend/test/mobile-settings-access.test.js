const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('all four settings tabs fit the mobile width without horizontal scrolling', () => {
  const page = read('src/app/settings/page.tsx');
  assert.match(page, /sticky top-16/);
  assert.match(page, /overflow-hidden/);
  assert.match(page, /canManageWorkspace \? 'grid-cols-4' : 'grid-cols-1'/);
  assert.match(page, /min-w-0 flex-col/);
  assert.match(page, /text-\[10px\].*sm:text-sm/);
  assert.doesNotMatch(page, /overflow-x-auto.*Settings sections/);
  assert.doesNotMatch(page, /flex min-w-max/);
  for (const label of ['Workspace', 'Documents', 'Access', 'Personal']) assert.match(page, new RegExp(label));
});

test('workspace and personal forms avoid phone zoom and expose full-width saves', () => {
  const page = read('src/app/settings/page.tsx');
  assert.match(page, /text-base.*sm:text-sm/);
  assert.match(page, /Save workspace/);
  assert.match(page, /Save personal settings/);
  assert.match(page, /min-h-12 w-full items-center justify-center/);
});

test('external access creation is compact and thumb friendly', () => {
  const access = read('src/components/manage/DaySheetCollaborators.tsx');
  assert.match(access, /grid grid-cols-2 gap-2 sm:grid-cols-4/);
  assert.match(access, /Creating….*Create invitation/s);
  assert.match(access, /h-12 w-full items-center justify-center/);
  assert.match(access, /grid gap-2 sm:grid-cols-\[1fr_auto\]/);
});

test('existing collaborator records stack actions safely on phones', () => {
  const access = read('src/components/manage/DaySheetCollaborators.tsx');
  assert.match(access, /flex flex-col gap-3 py-4 sm:flex-row/);
  assert.match(access, /grid w-full grid-cols-2 gap-2 sm:flex/);
  assert.match(access, /Edit permissions for/);
  assert.match(access, /Revoke day-sheet access for/);
});

test('permission editing becomes a full-screen mobile workflow', () => {
  const access = read('src/components/manage/DaySheetCollaborators.tsx');
  assert.match(access, /mobile-safe-top mobile-safe-bottom min-h-\[100dvh\]/);
  assert.match(access, /sm:min-h-0 sm:max-w-2xl sm:rounded-3xl/);
  assert.match(access, /grid grid-cols-2 gap-3 sm:flex/);
  assert.match(access, /min-h-12 rounded-full/);
});
