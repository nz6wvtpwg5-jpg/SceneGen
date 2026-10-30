const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const ui=fs.readFileSync('src/components/contacts/PromoterDiscovery.tsx','utf8');
const map=fs.readFileSync('src/components/contacts/PromoterDiscoveryMap.tsx','utf8');
const tour=fs.readFileSync('src/lib/promoterTourCities.ts','utf8');
const locations=fs.readFileSync('src/lib/promoterDiscoveryLocations.ts','utf8');
test('map only resolves publicly listed city and country, not private coordinates',()=>{
 assert.match(map,/city:place\.city,country:place\.country/);
 assert.match(map,/Approximate city centre/);
 assert.match(map,/partialMatch/);
 assert.doesNotMatch(map,/promoterEmail|contactPhone|private_contacts|\.latitude|\.longitude/);
 assert.match(locations,/knownLocations/);
 assert.match(ui,/publicDiscoveryCities\(sortedResults\)/);
});
test('upcoming-show picker only uses workspace shows and filters cancelled, off-day, past dates',()=>{
 assert.match(ui,/fetch\('\/api\/shows'/);
 assert.match(ui,/'X-Entity-Id':activeProfile\.id/);
 assert.match(ui,/upcomingShowCities/);
 assert.match(tour,/date<today/);
 assert.match(tour,/cancelled/);
 assert.match(tour,/off_day/);
 assert.match(ui,/Nearby radius search is not yet available/);
});
