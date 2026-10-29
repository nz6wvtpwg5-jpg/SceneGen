const test = require('node:test');
const assert = require('node:assert/strict');
const { createCalendarImportHandler, validateImport } = require('../calendar-import');

const ENTITY = '1f60064e-3dc6-4612-a5c4-2be834806277';
const TOUR = '02709e95-ca69-4f9d-b622-1546846666dc';
const SHOW = 'c9ad4c58-e45d-4ea0-84be-57d8cfc621c4';
const DATE = '2026-12-02';
const event = {sourceId:'calendar-123',date:DATE,summary:'CONAN December',venueName:'Venue TBC',city:'Liverpool',country:'United Kingdom',startTime:'20:00',showType:'show'};
const request=(body)=>({entityId:ENTITY,requestId:'test',body});
function response(){return {statusCode:null, body:null, status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;}};}
function fakePool(options={}){
 const queries=[], state={count:0,begin:false,committed:false,rolledBack:false}, client={
  async query(sql,args=[]){
   queries.push({sql,args});
   // Base migrations define shows.entity_id and tours.entity_id as VARCHAR.
   // Treat a comparison with a UUID-typed parameter as PostgreSQL 42883.
   if (/(?:^|[\s(])entity_id=\$\d+::uuid\b/.test(sql)) {
    const problem = new Error('operator does not exist: character varying = uuid');
    problem.code='42883'; throw problem;
   }
   if(sql==='BEGIN'){state.begin=true;return {};}
   if(sql==='COMMIT'){state.committed=true;return {};}
   if(sql==='ROLLBACK'){state.rolledBack=true;return {};}
   if(options.fail && sql.includes(options.fail))throw Error('injected failure');
   if(sql.includes('FROM calendar_import_sources cis'))return {rows:options.duplicate?[{id:SHOW,tour_id:TOUR}]:[],rowCount:options.duplicate?1:0};
   if(sql.includes('FROM shows WHERE entity_id')&&sql.includes('position('))return {rows:[],rowCount:0};
   if(sql.startsWith('INSERT INTO tours'))return {rows:[{id:TOUR,name:'December',start_date:DATE,end_date:'2026-12-05'}],rowCount:1};
   if(sql.startsWith('SELECT id,name,start_date,end_date FROM tours'))return {rows: options.missingTour?[]:[{id:TOUR,name:'Existing',start_date:'2026-10-01',end_date:'2026-11-01'}],rowCount:options.missingTour?0:1};
   if(sql.startsWith('INSERT INTO shows')){state.count++;return {rows:[{id:SHOW}],rowCount:1};}
   if(sql.startsWith('UPDATE tours'))return {rows:[{id:TOUR,name:'Existing',start_date:DATE,end_date:'2026-12-05'}],rowCount:1};
   if(sql.includes('count(*)::int'))return {rows:[{count: options.badReadback?0:state.count}]};
   return {rows:[],rowCount:0};
  },release(){}
 };
 return {pool:{async connect(){return client;}},queries,state};
}
const handler=(p)=>createCalendarImportHandler({pool:p,upsertVenue:async()=>null,canonicalCountry:x=>x,toCamelCase:x=>x});
test('validates real dates and rejects duplicates before opening a transaction',()=>{
 assert.throws(()=>validateImport({mode:'new',name:'X',events:[{...event,date:'2026-02-30'}]}),/Confirm/);
 assert.throws(()=>validateImport({mode:'new',name:'X',events:[event,event]}),/same performance/);
});
for(const mode of ['standalone','new','existing']){
 test(mode+' creates one selected date and verifies the committed record',async()=>{
  const {pool,queries,state}=fakePool();const res=response();
  await handler(pool)(request({mode,...mode==='new'?{name:'December'}:mode==='existing'?{tourId:TOUR}:{},events:[event]}),res);
  assert.equal(res.statusCode,201);assert.equal(res.body.showCount,1);
  assert.equal(state.committed,true);assert.equal(state.rolledBack,false);
  assert.equal(queries.filter(q=>q.sql.startsWith('INSERT INTO shows')).length,1);
  assert.ok(queries.some(q=>q.sql.includes('calendar_import_sources(entity_id')));
  assert.equal(queries.find(q=>q.sql.startsWith('INSERT INTO shows')).args[8],'tentative');
  assert.equal(Boolean(res.body.tour),mode!=='standalone');
 });
}
test('duplicate calendar sources cannot create extra tours',async()=>{
 const {pool,state}=fakePool({duplicate:true});const res=response();
 await handler(pool)(request({mode:'new',name:'December',events:[event]}),res);
 assert.equal(res.statusCode,409);assert.equal(state.rolledBack,true);assert.equal(state.committed,false);
});
test('tour belongs to the selected workspace',async()=>{
 const {pool,state}=fakePool({missingTour:true});const res=response();
 await handler(pool)(request({mode:'existing',tourId:TOUR,events:[event]}),res);
 assert.equal(res.statusCode,404);assert.equal(state.rolledBack,true);
});
test('failed second operation rolls back the whole tour',async()=>{
 const {pool,state}=fakePool({fail:'INSERT INTO calendar_import_sources'});const res=response();
 await handler(pool)(request({mode:'new',name:'December',events:[event]}),res);
 assert.equal(res.statusCode,500);assert.equal(state.rolledBack,true);assert.equal(state.committed,false);
});
test('failed read-back must roll back',async()=>{
 const {pool,state}=fakePool({badReadback:true});const res=response();
 await handler(pool)(request({mode:'new',name:'December',events:[event]}),res);
 assert.equal(res.statusCode,500);assert.equal(state.rolledBack,true);
});


test('calendar-to-tour dialog preserves summary and explicitly sends import mode', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../src/components/shows/CalendarTourImport.tsx'), 'utf8');
  assert.match(source, /JSON\.stringify\(\{mode,/);
  assert.match(source, /events:chosen\.map\(\(\{selected,\.\.\.event\}\)=>event\)/);
  assert.doesNotMatch(source, /\{selected,summary,\.\.\.rest\}/);
});


test('active calendar dialog verifies saved shows and tour before success', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../src/components/shows/CalendarConversion.tsx'), 'utf8');
  assert.match(source, /result\.showCount!==chosen\.length/);
  assert.match(source, /mode!==\x27standalone\x27&&!result\.tour\?\.id/);
});
