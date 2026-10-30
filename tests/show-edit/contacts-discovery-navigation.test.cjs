const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('Contacts page makes promoter discovery directly accessible', () => {
  const contacts = fs.readFileSync('src/app/contacts/page.tsx','utf8');
  assert.match(contacts, /href="\/contacts\/discover"/);
  assert.match(contacts, />Discover promoters<\/Link>/);
});
test('Discovery page uses the existing private authenticated discovery component', () => {
  const page = fs.readFileSync('src/app/contacts/discover/page.tsx','utf8');
  assert.match(page, /<PromoterDiscovery\s*\/>/);
  assert.match(page, /href="\/contacts"/);
});
