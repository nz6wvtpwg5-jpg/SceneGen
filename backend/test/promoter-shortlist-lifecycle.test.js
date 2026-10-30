const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {discoverPromoters}=require('../promoter-discovery');
const {revalidateShortlist}=require('../promoter-shortlist-lifecycle');
const viewer='22222222-2222-4222-8222-222222222222';
const owner='11111111-1111-4111-8111-111111111111';
const opts={viewerEntityId:viewer,signingSecret:'local-test-key',communityGenres:['#doommetal']};
const contact=(genres=['#doommetal'],location='Bristol')=>({
 internal_email_key:'private@example.test',promoter_name:'Private Promoter',
 source_entity_id:owner,contact_only:true,listed_genres:genres,
 known_locations:[{city:location,country:'United Kingdom'}],
});
const row=(discoveryKey,matchingGenres)=>({id:'33333333-3333-4333-8333-333333333333',
 discovery_key:discoveryKey,public_snapshot:{name:'Old private-derived snapshot',matchingGenres,
 knownLocations:[{city:'Old private city',country:'United Kingdom'}],bandsWorkedWith:['Old band']},created_at:'2026-10-30'});
function status(rows, evidence, extra={}) { return revalidateShortlist(rows,[],evidence,{...opts,...extra})[0]; }
test('anonymous bookmark refreshes location and matching genre from CURRENT evidence, never persisted snapshot',()=>{
 const original=contact();
 const key=discoverPromoters([],[original],{...opts,genres:['#doommetal']})[0].discoveryKey;
 const fresh=status([row(key,['#doommetal'])],[contact(['#doommetal'],'Liverpool')]);
 assert.equal(fresh.status,'available');
 assert.deepEqual(fresh.promoter.knownLocations,[{city:'Liverpool',country:'United Kingdom'}]);
 assert.equal(fresh.promoter.name,'Promoter');
 assert.doesNotMatch(JSON.stringify(fresh),/Old private|Old band|private@example/);
});
test('deleted or no-longer-matching community promoter becomes unavailable with no saved personal data',()=>{
 const key=discoverPromoters([],[contact()],{...opts,genres:['#doommetal']})[0].discoveryKey;
 for (const evidence of [[],[contact(['#jazz'])]]) {
  const stale=status([row(key,['#doommetal'])],evidence);
  assert.equal(stale.status,'unavailable');
  assert.deepEqual(stale.promoter.knownLocations,[]);
  assert.deepEqual(stale.promoter.matchingGenres,[]);
  assert.deepEqual(stale.promoter.bandsWorkedWith,[]);
  assert.doesNotMatch(JSON.stringify(stale),/Old private|Old band|private@example/);
 }
});
test('promoter claimed under a verified public profile does not preserve obsolete anonymous bookmark',()=>{
 const key=discoverPromoters([],[contact()],{...opts,genres:['#doommetal']})[0].discoveryKey;
 const claimed={...contact(),verified_profile_ids:['44444444-4444-4444-8444-444444444444']};
 const profile={id:'44444444-4444-4444-8444-444444444444',name:'Public Claimed Promoter',tags:['#doommetal']};
 const result=revalidateShortlist([row(key,['#doommetal'])],[profile],[claimed],opts)[0];
 assert.equal(result.status,'unavailable');
 assert.equal(result.promoter.profileId,null);
});
test('registered promoter bookmarks remain available when genres or public name change',()=>{
 const profileId='44444444-4444-4444-8444-444444444444';
 const updated={id:profileId,name:'New Public Name',tags:['#jazz']};
 const result=revalidateShortlist([row('profile:'+profileId,['#doommetal'])],[updated],[],opts)[0];
 assert.equal(result.status,'available');
 assert.equal(result.promoter.name,'New Public Name');
 assert.equal(result.promoter.profileId,profileId);
 assert.deepEqual(result.promoter.matchingGenres,[]);
});
test('own private contacts cannot be rediscovered through saved results',()=>{
 const key=discoverPromoters([],[contact()],{...opts,genres:['#doommetal']})[0].discoveryKey;
 assert.equal(status([row(key,['#doommetal'])],[contact()],{excludedEmails:['private@example.test']}).status,'unavailable');
 assert.equal(status([row(key,['#doommetal'])],[contact()],{viewerEntityId:owner}).status,'unavailable');
});
test('shortlist endpoint reads current discovery data before responding, not old stored snapshots',()=>{
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 const read=server.split("app.get('/api/contacts/promoter-shortlist'")[1].split("app.post('/api/contacts/promoter-shortlist'")[0];
 assert.match(read,/revalidateShortlist\(result\.rows, profiles\.rows/);
 assert.match(read,/excludedEmails:ownContacts\.rows/);
 assert.doesNotMatch(read,/promoter: row\.public_snapshot/);
});
