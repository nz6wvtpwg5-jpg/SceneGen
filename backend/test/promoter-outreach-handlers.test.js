'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
const artist='11111111-1111-4111-8111-111111111111';
const promoter='22222222-2222-4222-8222-222222222222';
const user='33333333-3333-4333-8333-333333333333';
const requestId='44444444-4444-4444-8444-444444444444';
function routerFor(pool,notify=async()=>{}){
 const routes=new Map(), guards=[];
 const fakeExpress={Router(){return {
  use(fn){guards.push(fn);},
  get(path,fn){routes.set('GET '+path,fn);},
  put(path,fn){routes.set('PUT '+path,fn);},
  post(path,fn){routes.set('POST '+path,fn);},
  patch(path,fn){routes.set('PATCH '+path,fn);},
 };}};
 const original=Module._load;
 Module._load=function(id,...args){if(id==='express')return fakeExpress;return original.call(this,id,...args);};
 let make;
 try{delete require.cache[require.resolve('../promoter-outreach')];make=require('../promoter-outreach').createPromoterOutreachRouter;}
 finally{Module._load=original;}
 make(pool,notify);
 return async(method,path,body={},entityId=artist,entityRole='owner')=>{
  const fn=routes.get(method+' '+path);assert.ok(fn,'missing route '+path);
  const req={entityId,entityRole,userId:user,body,params:{id:requestId}};
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(payload){this.payload=payload;return this;}};
  let permitted=false;
  await guards[0](req,res,()=>{permitted=true;});
  if(permitted)await fn(req,res);
  return res;
 };
}

test('non-opted-in promoters cannot receive a request even with their public profile ID',async()=>{
 const pool={query:async(sql)=>{
  if(sql.includes('AS sender_valid'))return {rows:[{sender_valid:true,recipient_valid:true,opted_in:false}]};
  throw Error('no additional query should be made');
 }};
 const call=routerFor(pool);
 const response=await call('POST','/requests',{promoterId:promoter,message:'We would like to book a show with you next year.'});
 assert.equal(response.statusCode,403);
 assert.match(response.payload.error.message,/not accepting introductions/);
});

test('only owner/admin and valid message may create a request',async()=>{
 const call=routerFor({query:async()=>{throw Error('unexpected DB call');}});
 const nonOwner=await call('POST','/requests',{promoterId:promoter,message:'A useful introduction with a valid explanation.'},artist,'viewer');
 assert.equal(nonOwner.statusCode,403);
 const short=await call('POST','/requests',{promoterId:promoter,message:'Hi'});
 assert.equal(short.statusCode,422);
 const anonymous=await call('POST','/requests',{promoterId:'anonymous:abc',message:'A useful introduction with a valid explanation.'});
 assert.equal(anonymous.statusCode,422);
});

test('a single opted-in introduction is persisted and notified in-app, duplicate is rejected',async()=>{
 let inserted=false,notifications=[];
 const pool={query:async(sql)=>{
  if(sql.includes('AS sender_valid'))return {rows:[{sender_valid:true,recipient_valid:true,opted_in:true}]};
  if(sql.includes('INSERT INTO auth_rate_limits'))return {rows:[{attempts:1}]};
  if(sql.includes('SELECT status FROM promoter_introductions'))return {rows:inserted?[{status:'pending'}]:[]};
  if(sql.includes('INSERT INTO promoter_introductions')){inserted=true;return {rowCount:1,rows:[{id:requestId,status:'pending',created_at:'2026-10-30'}]};}
  if(sql.includes('SELECT name FROM entities'))return {rows:[{name:'Test Band'}]};
  throw Error('unexpected query');
 }};
 const call=routerFor(pool,async(...args)=>notifications.push(args));
 const body={promoterId:promoter,message:'We would like to discuss supporting your next event.'};
 const first=await call('POST','/requests',body);
 assert.equal(first.statusCode,201);
 assert.equal(notifications.length,1);
 assert.equal(notifications[0][0],promoter);
 assert.match(notifications[0][3],/Test Band/);
 const second=await call('POST','/requests',body);
 assert.equal(second.statusCode,409);
 assert.equal(notifications.length,1);
});

test('promoter acceptance is constrained to a pending item in its own workspace',async()=>{
 let observed=[];
 const pool={query:async(sql,params)=>{
  observed.push({sql,params});
  if(sql.includes('UPDATE promoter_introductions'))return {rowCount:0,rows:[]};
  throw Error('unexpected query');
 }};
 const call=routerFor(pool);
 const invalid=await call('PATCH','/requests/:id',{status:'pending'},promoter);
 assert.equal(invalid.statusCode,422);
 const foreign=await call('PATCH','/requests/:id',{status:'accepted'},promoter);
 assert.equal(foreign.statusCode,404);
 assert.match(observed[0].sql,/promoter_entity_id=\$2::uuid AND status='pending'/);
 assert.equal(observed[0].params[1],promoter);
});

test('promoter opt-in starts disabled and can be explicitly enabled',async()=>{
 let state=false;
 const pool={query:async(sql,params)=>{
  if(sql.includes('COALESCE(p.accepting_introductions,FALSE) enabled'))return {rows:[{entity_type:'promoter',enabled:state}]};
  if(sql.includes('INSERT INTO promoter_outreach_preferences')){state=params[1];return {rows:[{accepting_introductions:state}],rowCount:1};}
  throw Error('unexpected query');
 }};
 const call=routerFor(pool);
 const initial=await call('GET','/preferences',{},promoter);
 assert.equal(initial.payload.acceptingIntroductions,false);
 const updated=await call('PUT','/preferences',{acceptingIntroductions:true},promoter);
 assert.equal(updated.statusCode,200);
 assert.equal(updated.payload.acceptingIntroductions,true);
});

test('messages are inaccessible to a foreign workspace and to unaccepted threads',async()=>{
 const pool={query:async(sql)=>{
  if(sql.includes('FROM promoter_introductions'))return {rowCount:0,rows:[]};
  throw Error('must not query messages without an accepted, authorized thread');
 }};
 const call=routerFor(pool);
 const denied=await call('GET','/requests/:id/messages',{},'55555555-5555-4555-8555-555555555555');
 assert.equal(denied.statusCode,404);
 const rejected=await call('POST','/requests/:id/messages',{body:'Please let us know about availability.'},artist);
 assert.equal(rejected.statusCode,404);
});

test('accepted thread replies are scoped at read and atomic insert to a member workspace',async()=>{
 const inserts=[],alerts=[];
 const pool={query:async(sql,params)=>{
   if(sql.includes('SELECT id,artist_entity_id::text AS artist_id'))return {rowCount:1,rows:[{id:requestId,artist_id:artist,promoter_id:promoter,status:'accepted'}]};
   if(sql.includes('SELECT artist_entity_id::text artist_id'))return {rowCount:1,rows:[{artist_id:artist,promoter_id:promoter}]};
   if(sql.includes('SELECT id,body,sender_entity_id::text sender_entity_id,created_at'))return {rows:[{id:'66666666-6666-4666-8666-666666666666',body:'Hello',sender_entity_id:artist,created_at:'2026-10-31'}]};
   if(sql.includes('INSERT INTO auth_rate_limits'))return {rows:[{attempts:1}]};
   if(sql.includes('INSERT INTO promoter_introduction_messages')){
     inserts.push({sql,params});
     return {rowCount:1,rows:[{id:'77777777-7777-4777-8777-777777777777',body:params[3],sender_entity_id:params[1],created_at:'2026-10-31'}]};
   }
   throw Error('Unexpected query');
 }};
 const call=routerFor(pool,async(...args)=>alerts.push(args));
 const read=await call('GET','/requests/:id/messages',{},artist);
 assert.equal(read.statusCode,200);
 assert.equal(read.payload.messages.length,1);
 const sent=await call('POST','/requests/:id/messages',{body:'Our band would be available next month.'},artist);
 assert.equal(sent.statusCode,201);
 assert.equal(sent.payload.message.senderEntityId,artist);
 assert.equal(inserts[0].params[1],artist);
 assert.match(inserts[0].sql,/i.status='accepted'/);
 assert.match(inserts[0].sql,/i.artist_entity_id=\$2::uuid OR i.promoter_entity_id=\$2::uuid/);
 assert.equal(alerts[0][0],promoter);
});

test('replies reject empty and oversized messages before accessing database',async()=>{
 const call=routerFor({query:async()=>{throw Error('unexpected query')}});
 assert.equal((await call('POST','/requests/:id/messages',{body:'  '})).statusCode,422);
 assert.equal((await call('POST','/requests/:id/messages',{body:'x'.repeat(2001)})).statusCode,422);
});

test('read marker cannot be set for a foreign or pending introduction',async()=>{
 const pool={query:async(sql,params)=>{
   assert.match(sql,/WHERE i.id=\$1::uuid AND i.status='accepted'/);
   assert.match(sql,/i.artist_entity_id=\$2::uuid OR i.promoter_entity_id=\$2::uuid/);
   return {rowCount:0,rows:[]};
 }};
 const call=routerFor(pool);
 const response=await call('POST','/requests/:id/read',{},'55555555-5555-4555-8555-555555555555');
 assert.equal(response.statusCode,404);
});

test('read state is only set for authorized accepted conversations',async()=>{
 let checked=false;
 const pool={query:async(sql,params)=>{
   assert.match(sql,/INSERT INTO promoter_introduction_read_state/);
   assert.equal(params[1],artist);
   checked=true;
   return {rowCount:1,rows:[{introduction_id:requestId}]};
 }};
 const call=routerFor(pool);
 const response=await call('POST','/requests/:id/read',{},artist);
 assert.equal(response.statusCode,200);
 assert.equal(response.payload.read,true);
 assert.equal(checked,true);
});

test('message summary only counts introductions involving the selected workspace',async()=>{
 const pool={query:async(sql,params)=>{
   assert.match(sql,/i.artist_entity_id=\$1::uuid OR i.promoter_entity_id=\$1::uuid/);
   assert.match(sql,/read_state.last_read_at/);
   assert.equal(params[0],promoter);
   return {rows:[{pending_requests:2,unread_conversations:3}]};
 }};
 const call=routerFor(pool);
 const response=await call('GET','/summary',{},promoter);
 assert.equal(response.statusCode,200);
 assert.deepEqual(response.payload,{pendingRequests:2,unreadConversations:3});
});
