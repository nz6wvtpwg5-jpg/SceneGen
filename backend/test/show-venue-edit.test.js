const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareShowVenueEdit, resolveShowVenueEdit } = require('../show-venue-edit');

test('legacy venue identifiers on ordinary edits never trigger Google verification', async () => {
  const edit = prepareShowVenueEdit({ notes: 'New note', venueName:'TBD', venueId:'old-id', venuePlaceId:'stale-google-place' });
  let calls=0;
  const selected=await resolveShowVenueEdit(edit,{venue_id:null,venue_place_id:null},async()=>{calls++;throw Error('Venue verification is temporarily unavailable')});
  assert.equal(selected,false);
  assert.equal(calls,0);
  assert.deepEqual(edit.fields,{notes:'New note',venueName:'TBD'});
  assert.equal(edit.venueMetadata.venuePlaceId,undefined);
});
test('Google venue selection checks valid intent and verifies exactly once',async()=>{
  const edit=prepareShowVenueEdit({venueSelectionIntent:'google',venuePlaceId:'google_place_123',notes:'Ready'});
  let calls=0;
  const selected=await resolveShowVenueEdit(edit,{venue_place_id:null},async input=>{
    calls++; assert.equal(input.venuePlaceId,'google_place_123');
    return {venuePlaceId:'google_place_123',venueName:'Venue',city:'Liverpool'};
  });
  assert.equal(selected,true);assert.equal(calls,1);assert.equal(edit.fields.venuePlaceId,'google_place_123');
});
test('reselecting current venue does not contact Google',async()=>{
  const edit=prepareShowVenueEdit({venueSelectionIntent:'google',venuePlaceId:'same-google',notes:'Safe'});
  const selected=await resolveShowVenueEdit(edit,{venue_place_id:'same-google'},async()=>{throw Error('unexpected verification')});
  assert.equal(selected,false);assert.equal(edit.fields.venuePlaceId,undefined);
});
test('stored venue selection uses local ID not Google Places',async()=>{
  const edit=prepareShowVenueEdit({venueSelectionIntent:'stored',venueId:'existing-venue',venuePlaceId:'stale-google'});
  let calls=0;
  await resolveShowVenueEdit(edit,{venue_id:null},async input=>{calls++;assert.equal(input.venueId,'existing-venue');assert.equal(input.venuePlaceId,undefined);return {venueId:'existing-venue',city:'Liverpool'};});
  assert.equal(calls,1);
});
test('invalid explicit intent fails with actionable validation',()=>{
  assert.throws(()=>prepareShowVenueEdit({venueSelectionIntent:'google'}),/Choose a Google venue/);
  assert.throws(()=>prepareShowVenueEdit({venueSelectionIntent:'other'}),/Choose a venue/);
});
