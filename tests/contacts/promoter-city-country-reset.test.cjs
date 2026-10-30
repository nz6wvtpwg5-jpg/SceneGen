const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('src/components/contacts/PromoterDiscovery.tsx','utf8');
test('city-derived country is cleared when the city is edited',()=>{
  assert.match(s,/countrySource\.current === 'city'\) \{\s*countrySource\.current = null;\s*setSelectedCountry\(''\)/);
  assert.match(s,/onChange=\{value=>\{\s*setCityInput\(value\);\s*setSelectedCity\(''\)/);
});
test('explicit country choice remains distinguished from city-derived country',()=>{
  assert.match(s,/countrySource\.current=country \? 'manual' : null/);
  assert.match(s,/explicitlySelectedSameCountry/);
  assert.match(s,/countrySource\.current = explicitlySelectedSameCountry \? 'manual' : 'city'/);
});
test('clear city button also clears a city-derived country',()=>{
  assert.match(s,/setSelectedCity\(''\);setCityInput\(''\);\s*if \(countrySource\.current === 'city'\)/);
});
