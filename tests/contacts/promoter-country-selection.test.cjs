const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const countries = fs.readFileSync('src/lib/countryOptions.ts','utf8');
const selector = fs.readFileSync('src/components/contacts/CountryFilter.tsx','utf8');
const discovery = fs.readFileSync('src/components/contacts/PromoterDiscovery.tsx','utf8');
test('country suggestions are derived from actual ISO region names only, not Google regions or cities',()=>{
  assert.match(countries,/Intl\.DisplayNames/);
  assert.match(countries,/startsWith\(needle\)/);
  assert.match(selector,/countrySuggestions\(query\)/);
  assert.doesNotMatch(selector,/google\.maps|PlacesAutocomplete/);
});
test('typing alone cannot commit a country filter; users select an option',()=>{
  assert.match(selector,/onClick=\{\(\) => commit\(country\)\}/);
  assert.match(selector,/onChange=\{event => \{ setQuery\(event\.target\.value\)/);
  assert.match(selector,/No countries match/);
  assert.match(selector,/role="combobox"/);
  assert.match(selector,/role="listbox"/);
  assert.match(discovery,/<CountryFilter value=\{selectedCountry\}/);
  assert.doesNotMatch(discovery,/value=\{countryInput\}|selectedCountryName/);
});
