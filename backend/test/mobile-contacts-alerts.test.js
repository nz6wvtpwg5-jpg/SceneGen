const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('mobile contacts prioritize search, compact filters and all three map choices', () => {
  const page = read('src/app/contacts/page.tsx');

  assert.match(page, /showMobileFilters/);
  assert.match(page, /Filters\{hasFilters \? " applied"/);
  assert.match(page, /grid min-h-12 grid-cols-3/);
  assert.match(page, />Contact map<\/span>/);
  assert.match(page, />Insights<\/span>/);
  assert.match(page, /min-h-12 w-full.*Add contact/);
});

test('mobile contact cards expose immediate call, email, map and edit actions', () => {
  const table = read('src/components/contacts/ContactsTable.tsx');

  assert.match(table, /p-4 md:hidden/);
  assert.match(table, /href=\{`tel:/);
  assert.match(table, /replace\(\/\[\^\\d\+\*#,;\]\/g, ''\)/);
  assert.match(table, /href=\{`mailto:/);
  assert.match(table, />Map<\/button>/);
  assert.match(table, /Edit \$\{contact\.contactName\}/);
});

test('contact creation and editing are safe full-screen phone workflows', () => {
  const add = read('src/app/contacts/add/page.tsx');
  const edit = read('src/components/contacts/EditContactDialog.tsx');
  const location = read('src/components/contacts/ContactLocationPicker.tsx');

  assert.match(add, /text-base.*sm:text-sm/);
  assert.match(add, /mobile-safe-bottom sticky bottom-0/);
  assert.match(edit, /h-\[100dvh\]/);
  assert.match(edit, /mobile-safe-bottom sticky bottom-0/);
  assert.match(location, /text-base.*sm:h-11 sm:text-sm/);
});

test('notifications offer unread triage, refresh and reachable actions', () => {
  const page = read('src/app/notifications/page.tsx');

  assert.match(page, /type NotificationView = 'unread' \| 'all'/);
  assert.match(page, /Unread \(\{unreadCount\}\)/);
  assert.match(page, /Mark all read/);
  assert.match(page, /min-h-12.*Mark read/);
  assert.match(page, /Today/);
  assert.match(page, /Earlier/);
});

test('notification mutations keep existing entity-scoped API contracts', () => {
  const hook = read('src/hooks/useNotifications.ts');

  assert.match(hook, /X-Entity-Id/);
  assert.match(hook, /notification\/markread/);
  assert.match(hook, /notificationId/);
  assert.match(hook, /markAllAsRead/);
});
