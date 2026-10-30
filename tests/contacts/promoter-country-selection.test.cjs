const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = fs.readFileSync('src/lib/promoterLocationSelection.ts','utf8');
const ui = fs.readFileSync('src/components/contacts/PromoterDiscovery.tsx','utf8');
test('country selections require actual country-type Google places',()=>{
  assert.match(ts,/place\.types\?\.includes\('country'\)/);
  assert.match(ts,/part\.types\.includes\('country'\)/);
});
test('reject non-country result and explain why it cannot filter',()=>{
  assert.match(ui,/const country = selectedCountryName\(place\)/);
  assert.match(ui,/if \(!country\)/);
  assert.match(ui,/That is not a country/);
  assert.match(ui,/setCountryInput\(''\)/);
  assert.match(ui,/role="alert"/);
  assert.match(ui,/Select a country from the suggestions to apply the filter/);
});
