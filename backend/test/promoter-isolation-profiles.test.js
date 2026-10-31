'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {discoverPromoters,PROFILE_SQL}=require('../promoter-discovery');
const fixture=fs.readFileSync('backend/migrations/076_isolation_test_promoter_profiles.sql','utf8');
const viewer='11111111-1111-4111-8111-111111111111';
const profiles=[
 {id:'22222222-2222-4222-8222-222222222222',name:'SceneGen TEST Promoter - Birmingham',city:'Birmingham',country:'United Kingdom',tags:['#doom'],accepting_introductions:true},
 {id:'33333333-3333-4333-8333-333333333333',name:'SceneGen TEST Promoter - Bristol',city:'Bristol',country:'United Kingdom',tags:['#doom'],accepting_introductions:true},
];
test('fixture inserts only two clearly fictional promoters tied to a named isolation account',()=>{
 assert.match(fixture,/bandtest@scenegen\.io/);
 assert.match(fixture,/SceneGen Isolation Test Band/);
 assert.match(fixture,/SceneGen TEST Promoter - Birmingham/);
 assert.match(fixture,/SceneGen TEST Promoter - Bristol/);
 assert.match(fixture,/FICTIONAL TEST PROFILE/);
 assert.match(fixture,/WHERE NOT EXISTS/);
 assert.match(fixture,/ON CONFLICT\(promoter_entity_id\) DO NOTHING/);
 assert.doesNotMatch(fixture,/UPDATE\s+(?:private_contacts|promoter_claims|entities)/i);
 assert.doesNotMatch(fixture,/INSERT INTO private_contacts/i);
});
test('registered promoter profile cities and independent invitation flags are discoverable',()=>{
 assert.match(PROFILE_SQL,/e\.city, e\.country/);
 const rows=discoverPromoters(profiles,[],{viewerEntityId:viewer,genres:['#doom'],communityGenres:['#doom']});
 assert.equal(rows.length,2);
 assert.ok(rows.every(item=>item.registrationStatus==='registered'&&item.acceptingIntroductions));
 assert.ok(rows.some(item=>item.knownLocations.some(place=>place.city==='Birmingham')));
 assert.ok(rows.some(item=>item.knownLocations.some(place=>place.city==='Bristol')));
 const filtered=discoverPromoters(profiles,[],{viewerEntityId:viewer,genres:['#doom'],city:'Bristol'});
 assert.deepEqual(filtered.map(item=>item.name),['SceneGen TEST Promoter - Bristol']);
 const toggled=discoverPromoters([{...profiles[0],accepting_introductions:false},profiles[1]],[],{genres:['#doom']});
 assert.equal(toggled.find(item=>item.name.includes('Birmingham')).acceptingIntroductions,false);
 assert.equal(toggled.find(item=>item.name.includes('Bristol')).acceptingIntroductions,true);
});
