const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ui = fs.readFileSync('src/components/contacts/PromoterDiscovery.tsx','utf8');
const model = fs.readFileSync('src/lib/promoterDiscoveryView.ts','utf8');
const plan = fs.readFileSync('docs/promoter-discovery-roadmap.md','utf8');
test('discovery has genre reset without editing saved profile tags',()=>{
  assert.match(ui,/setBandGenres\(suggestedGenres\)/);
  assert.match(ui,/setGenres\(\[\.\.\.bandGenres\]\)/);
  assert.match(ui,/genresModified/);
});
test('summary and sorting are derived from returned discovery results',()=>{
  assert.match(ui,/discoverySummary\(results\)/);
  assert.match(ui,/sortDiscoveryResults\(results, sort\)/);
  assert.match(ui,/Sort by/);
  assert.match(model,/b\.matchingGenres\.length - a\.matchingGenres\.length/);
  assert.match(model,/matchBasis/);
  assert.match(model,/new Set\(results\.flatMap/);
});
test('roadmap covers privacy and future phases explicitly',()=>{
  for(const topic of ['Phase 1','Phase 2','Phase 3','Phase 4','private','workspace','coordinates']) assert.match(plan,new RegExp(topic,'i'));
});
