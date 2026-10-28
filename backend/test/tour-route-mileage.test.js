const test = require('node:test');
const assert = require('node:assert/strict');
const {routesKey,routeLocationKey,computeDrivingLeg,googleRouteFailure,summarizeRouteLegs} = require('../tour-route-mileage');
test('invalid provider key gets actionable error rather than missing venues',()=>{
 const e=googleRouteFailure(200,{status:'REQUEST_DENIED',error_message:'The provided API key is invalid'});
 assert.equal(e.code,'ROUTING_ACCESS_DENIED');
 assert.match(e.message,/Maps key/i);
});
test('route key is server-configured and never guessed',()=>{
 assert.throws(()=>routesKey({}),/GOOGLE_MAPS_API_KEY/);
 assert.throws(()=>routesKey({GOOGLE_ROUTES_API_KEY:'server-key'}),/GOOGLE_MAPS_API_KEY/);
 assert.equal(routesKey({GOOGLE_MAPS_API_KEY:'original-key',GOOGLE_ROUTES_API_KEY:'different-key'}),'original-key');
 assert.equal(routesKey({GOOGLE_MAPS_API_KEY:'original-key'}),'original-key');
});
test('driving leg calculates exact miles using Google metres',async()=>{
 const a={id:'a',city:'Glasgow',location:{latitude:55.86,longitude:-4.25,precision:'venue'}};
 const b={id:'b',city:'Nottingham',location:{address:'Nottingham, England',precision:'city'}};
 const r=await computeDrivingLeg(a,b,'test-key',async(url,request)=>{
  assert.match(url,/maps.googleapis.com\/maps\/api\/distancematrix/);
  assert.equal(new URL(url).searchParams.get('key'),'test-key');
  return {ok:true,status:200,json:async()=>({status:'OK',rows:[{elements:[{status:'OK',distance:{value:160934}}]}]})};
 });
 assert.equal(r.miles,100);
 assert.equal(r.approximate,true);
});
test('route mileage is not calculated until all expected legs match',()=>{
 const locations=[{id:'a',location:{address:'Glasgow'}},{id:'b',location:{address:'Leeds'}}];
 const none=summarizeRouteLegs(locations,[]);
 assert.equal(none.totalMiles,null);
 assert.equal(none.calculated,false);
 const valid=summarizeRouteLegs(locations,[{to_show_id:'b',from_show_id:'a',distance_miles:'251.3',from_location_key:'city:glasgow',to_location_key:'city:leeds',approximate:true}]);
 assert.equal(valid.totalMiles,251.3);
 assert.equal(valid.calculated,true);
 const stale=summarizeRouteLegs([{id:'a',location:{address:'Glasgow'}},{id:'b',location:{address:'Bristol'}}],[{to_show_id:'b',from_show_id:'a',distance_miles:'251.3',from_location_key:'city:glasgow',to_location_key:'city:leeds'}]);
 assert.equal(stale.stale,true);
 assert.equal(stale.totalMiles,null);
});
test('location identifiers are deterministic and reject missing coordinates',()=>{
 assert.equal(routeLocationKey({latitude:0,longitude:0}),'venue:0.000000,0.000000');
 assert.equal(routeLocationKey({latitude:null,longitude:0}),null);
});
