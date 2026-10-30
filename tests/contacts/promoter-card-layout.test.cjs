const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ui = fs.readFileSync('src/components/contacts/PromoterDiscovery.tsx', 'utf8');
test('discovery cards prioritize location and evidence', () => {
  assert.match(ui, /Promoter in \$\{mainLocation\.city\}/);
  assert.match(ui, /promoter\.matchingGenres\.map/);
  assert.match(ui, /Your promoter matches/);
  assert.match(ui, /Genre listed by another band/);
  assert.match(ui, /Contact details stay private until shared/);
});
test('only registered promoters get public profile links', () => {
  assert.match(ui, /promoter\.profileId && <Link/);
  assert.match(ui, /View public profile/);
});
