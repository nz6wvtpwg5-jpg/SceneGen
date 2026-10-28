'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRouteMileageHandler } = require('../tour-route-mileage');

const ENTITY = 'e123';
const TOUR = '2e5b4645-e26e-49b8-815c-a5d9378dd318';
const SHOWS = [
  {id:'00000000-0000-4000-8000-000000000001',date:'2026-12-02',city:'Glasgow',show_type:'show',venue_lat:55.86,venue_lng:-4.25},
  {id:'00000000-0000-4000-8000-000000000002',date:'2026-12-03',city:'Nottingham',show_type:'show',venue_lat:52.95,venue_lng:-1.15},
  {id:'00000000-0000-4000-8000-000000000003',date:'2026-12-04',city:'Leeds',show_type:'show',venue_lat:53.8,venue_lng:-1.55},
  {id:'00000000-0000-4000-8000-000000000004',date:'2026-12-05',city:'Birkenhead',show_type:'show',venue_lat:53.39,venue_lng:-3.02},
];
const locations = async s => s.venue_lat != null && s.venue_lng != null
  ? {latitude:s.venue_lat,longitude:s.venue_lng,precision:'venue'}
  : null;
function createFakeDb({existing=[],mutate=false,failInsert=false}={}){
  const log=[], state={rows:[...existing],committed:false,rolledBack:false};
  const query=async(sql,args=[])=>{
    log.push({sql,args});
    if(sql==='BEGIN') return {};
    if(sql==='COMMIT'){state.committed=true;return {};}
    if(sql==='ROLLBACK'){state.rolledBack=true;return {};}
    if(sql.includes('SELECT id FROM tours')) return {rows:[{id:TOUR}],rowCount:1};
    if(sql.includes('FROM shows WHERE tour_id')) return {rows:mutate&&log.some(x=>x.sql==='BEGIN')
      ? SHOWS.map((s,i)=>i===3?{...s,venue_lat:54.2}:s):SHOWS};
    if(sql.startsWith('DELETE FROM tour_route_legs')){state.rows=[];return {rowCount:existing.length};}
    if(sql.startsWith('INSERT INTO tour_route_legs')){
      if(failInsert) throw new Error('injected insert failure');
      state.rows.push({
        from_show_id:args[2],to_show_id:args[3],distance_miles:args[4],
        from_location_key:args[6],to_location_key:args[7],approximate:args[8]
      });
      return {rowCount:1};
    }
    if(sql.startsWith('SELECT from_show_id,to_show_id')) return {rows:state.rows};
    return {rows:[]};
  };
  return {pool:{query,async connect(){return {query,release(){}};}},log,state};
}
function response(){return {statusCode:200,body:null,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};}
const req={entityId:ENTITY,params:{id:TOUR}};
const googleOk=async()=>({ok:true,status:200,json:async()=>({status:'OK',rows:[{elements:[{status:'OK',distance:{value:200000}}]}]})});
function handler(pool,options={}){return createRouteMileageHandler({
  pool,resolveLocation:locations,fetchRoutes:options.fetchRoutes||googleOk,
  env:options.env===undefined?{GOOGLE_MAPS_API_KEY:'not-real-just-a-test'}:options.env
});}

test('four date routing writes three legs, no budget writes, returns persistent mileage',async()=>{
 const db=createFakeDb(),r=response();
 await handler(db.pool)(req,r);
 assert.equal(r.statusCode,200);
 assert.equal(r.body.success,true);
 assert.equal(r.body.distancesCalculated,3);
 assert.equal(r.body.routeMileage.legs.length,3);
 assert.equal(r.body.routeMileage.totalMiles,372.9);
 assert.equal(db.state.committed,true);
 assert.equal(db.log.filter(x=>x.sql.startsWith('INSERT INTO tour_route_legs')).length,3);
 assert.ok(db.log.every(x=>!/UPDATE budgets|INSERT INTO budgets|DELETE FROM budgets/i.test(x.sql)));
});

test('invalid Google Routes key leaves stored legs untouched and responds clearly',async()=>{
 const previous=[{from_show_id:SHOWS[0].id,to_show_id:SHOWS[1].id,distance_miles:'155',from_location_key:'venue:55.860000,-4.250000',to_location_key:'venue:52.950000,-1.150000'}];
 const db=createFakeDb({existing:previous}),r=response();
 const fail=async()=>({ok:false,status:400,json:async()=>({status:'REQUEST_DENIED',error_message:'API key not valid'})});
 await handler(db.pool,{fetchRoutes:fail})(req,r);
 assert.equal(r.statusCode,503);
 assert.equal(r.body.error.code,'ROUTING_ACCESS_DENIED');
 assert.deepEqual(db.state.rows,previous);
 assert.equal(db.log.some(x=>x.sql==='BEGIN'),false);
});

test('missing routing key is actionable without attempting any route calculations',async()=>{
 const db=createFakeDb(),r=response();
 await handler(db.pool,{env:{}})(req,r);
 assert.equal(r.statusCode,503);
 assert.equal(r.body.error.code,'ROUTING_KEY_NOT_CONFIGURED');
 assert.equal(db.log.filter(x=>x.sql==='BEGIN').length,0);
});

test('concurrent venue change returns conflict before touching saved legs',async()=>{
 const db=createFakeDb({mutate:true}),r=response();
 await handler(db.pool)(req,r);
 assert.equal(r.statusCode,409);
 assert.equal(r.body.error.code,'ROUTE_STOPS_CHANGED');
 assert.equal(db.state.rolledBack,true);
 assert.equal(db.log.some(x=>x.sql.startsWith('DELETE FROM tour_route_legs')),false);
});

test('database write error rolls back the route operation',async()=>{
 const db=createFakeDb({failInsert:true}),r=response();
 await handler(db.pool)(req,r);
 assert.equal(r.statusCode,500);
 assert.equal(db.state.rolledBack,true);
 assert.equal(db.state.committed,false);
});
