const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('src/lib/publicCityMatch.ts','utf8');
const ui=fs.readFileSync('src/components/contacts/PromoterDiscoveryMap.tsx','utf8');
test('map rejects returned city or country that differs from the publicly requested location',()=>{
  assert.match(source,/normalize\(requested\.city\)===normalize\(returned\.city\)/);
  assert.match(source,/aliases\(requested\.country\)===aliases\(returned\.country\)/);
  assert.match(ui,/publicCityMatch\(requested, \{city:point\.city,country:point\.country\}\)/);
  assert.match(ui,/point\.partialMatch/);
});
