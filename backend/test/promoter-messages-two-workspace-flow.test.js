'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
const BAND='11111111-1111-4111-8111-111111111111';
const PROMOTER='22222222-2222-4222-8222-222222222222';
const OUTSIDER='33333333-3333-4333-8333-333333333333';
const ID='44444444-4444-4444-8444-444444444444';
const USER='55555555-5555-4555-8555-555555555555';
const replyUser='66666666-6666-4666-8666-666666666666';

function testHarness(){
  const routes=new Map();const guards=[];const notices=[];
  const fakeExpress={Router(){return {
    use(fn){guards.push(fn);},
    get(path,handler){routes.set('GET '+path,handler);},
    post(path,handler){routes.set('POST '+path,handler);},
    put(path,handler){routes.set('PUT '+path,handler);},
    patch(path,handler){routes.set('PATCH '+path,handler);},
  };}};
  const state={optedIn:false,introduction:null,messages:[],read:{},attempts:0};
  const pool={query:async(sql,params=[])=>{
    if(sql.includes('COALESCE(p.accepting_introductions,FALSE) enabled'))return {rows:[{entity_type:'promoter',enabled:state.optedIn}]};
    if(sql.includes('INSERT INTO promoter_outreach_preferences')){
      state.optedIn=params[1];return {rows:[{accepting_introductions:state.optedIn}],rowCount:1};
    }
    if(sql.includes('AS sender_valid'))return {rows:[{sender_valid:params[0]===BAND,recipient_valid:params[1]===PROMOTER,opted_in:state.optedIn,artist_social_links:{spotify:'https://open.spotify.com/artist/test'}}]};
    if(sql.includes('INSERT INTO auth_rate_limits'))return {rows:[{attempts:++state.attempts}]};
    if(sql.includes('SELECT status FROM promoter_introductions'))return {rows:state.introduction?[{status:state.introduction.status}]:[]};
    if(sql.includes('INSERT INTO promoter_introductions(')){
      if(state.introduction || !state.optedIn)return {rowCount:0,rows:[]};
      state.introduction={id:ID,status:'pending',artist_entity_id:BAND,promoter_entity_id:PROMOTER,message:params[3]};
      return {rowCount:1,rows:[{id:ID,status:'pending',created_at:'2026-10-31T11:00:00Z'}]};
    }
    if(sql.includes('SELECT name FROM entities'))return {rows:[{name:'Isolation Band'}]};
    if(sql.includes('UPDATE promoter_introductions SET status=')){
      if(params[1]!==PROMOTER || params[0]!==ID || state.introduction?.status!=='pending')return {rowCount:0,rows:[]};
      state.introduction.status=params[2];return {rowCount:1,rows:[{id:ID,status:params[2],responded_at:'2026-10-31',artist_entity_id:BAND}]};
    }
    if(sql.includes('SELECT entity_type FROM entities'))return {rows:[{entity_type:params[0]===BAND?'artist':params[0]===PROMOTER?'promoter':'other'}]};
    if(sql.includes('SELECT i.id,i.message,i.status')){
      if(!state.introduction)return {rows:[]};
      const item=state.introduction;
      const id=params[0];const promoterInbox=sql.includes('WHERE i.promoter_entity_id=$1::uuid');
      if(id!==(promoterInbox?PROMOTER:BAND))return {rows:[]};
      const last=state.messages.at(-1);
      return {rows:[{id:ID,message:item.message,status:item.status,created_at:'2026-10-31',
        artist_name:'Isolation Band',artist_id:BAND,promoter_name:'Isolation Promoter',promoter_id:PROMOTER,
        last_message:last?.body||null,last_message_at:last?.created_at||null,
        unread:state.messages.some(m=>m.sender_entity_id!==id && (!state.read[id]||m.created_at>state.read[id]))}]};
    }
    if(sql.includes('COUNT(*) FILTER (WHERE i.status=')){
      const workspace=params[0];if(![BAND,PROMOTER].includes(workspace))return {rows:[{pending_requests:0,unread_conversations:0}]};
      const last=state.messages.at(-1);
      return {rows:[{pending_requests:state.introduction?.status==='pending'&&workspace===PROMOTER?1:0,
        unread_conversations:state.introduction?.status==='accepted'&&state.messages.some(m=>m.sender_entity_id!==workspace && (!state.read[workspace]||m.created_at>state.read[workspace]))?1:0}]};
    }
    if(sql.includes('SELECT id,artist_entity_id::text AS artist_id')||sql.includes('SELECT artist_entity_id::text artist_id')){
      const participant=[BAND,PROMOTER].includes(params[1]);
      const accepted=state.introduction?.status==='accepted';
      const valid=participant&&accepted&&params[0]===ID;
      return {rowCount:valid?1:0,rows:valid?[{id:ID,artist_id:BAND,promoter_id:PROMOTER,status:'accepted'}]:[]};
    }
    if(sql.includes('SELECT id,body,sender_entity_id::text sender_entity_id'))
      return {rows:[...state.messages].reverse().map(m=>({...m}))};
    if(sql.includes('INSERT INTO promoter_introduction_messages')){
      const valid=params[0]===ID&&[BAND,PROMOTER].includes(params[1])&&state.introduction?.status==='accepted';
      if(!valid)return {rowCount:0,rows:[]};
      const message={id:String(state.messages.length+1).padStart(8,'0')+'-7777-4777-8777-777777777777',
        body:params[3],sender_entity_id:params[1],created_at:new Date(Date.now()+state.messages.length*1000).toISOString()};
      state.messages.push(message);
      return {rowCount:1,rows:[message]};
    }
    if(sql.includes('INSERT INTO promoter_introduction_read_state')){
      const seen=state.messages.find(m=>m.id===params[2]);
      const valid=params[0]===ID&&[BAND,PROMOTER].includes(params[1])&&state.introduction?.status==='accepted'&&seen;
      if(!valid)return {rowCount:0,rows:[]};
      state.read[params[1]]=state.read[params[1]]&&state.read[params[1]]>seen.created_at?state.read[params[1]]:seen.created_at;
      return {rowCount:1,rows:[{introduction_id:ID}]};
    }
    throw new Error('Unexpected SQL: '+sql.slice(0,100));
  }};
  const original=Module._load;
  Module._load=function(request,...args){if(request==='express')return fakeExpress;return original.call(this,request,...args);};
  try{
    delete require.cache[require.resolve('../promoter-outreach')];
    require('../promoter-outreach').createPromoterOutreachRouter(pool,async(...args)=>notices.push(args));
  }finally{Module._load=original;}
  async function call(method,path,{entityId=BAND,userId=USER,role='owner',body={}}={}){
    const handler=routes.get(method+' '+path);assert.ok(handler,'Missing endpoint '+method+' '+path);
    const req={entityId,userId,entityRole:role,body,params:{id:ID}};
    const res={statusCode:200,headers:{},status(code){this.statusCode=code;return this;},setHeader(key,value){this.headers[key]=value;},json(payload){this.payload=payload;return this;}};
    let next=false;await guards[0](req,res,()=>{next=true;});if(next)await handler(req,res);
    return res;
  }
  return {call,state,notices};
}

test('two distinct workspace actors: opt-in, send, inbox, accept, two-way replies, unread/read and outsider rejection',async()=>{
  const {call,state,notices}=testHarness();
  const requestBody={promoterId:PROMOTER,message:'We are a touring band enquiring about a support show in November.'};
  assert.equal((await call('POST','/requests',{body:requestBody})).statusCode,403,'Opt-in is required');
  assert.equal((await call('GET','/preferences',{entityId:PROMOTER})).payload.acceptingIntroductions,false);
  assert.equal((await call('PUT','/preferences',{entityId:PROMOTER,body:{acceptingIntroductions:true}})).statusCode,200);
  assert.equal((await call('POST','/requests',{body:requestBody,role:'viewer'})).statusCode,403);
  const sent=await call('POST','/requests',{body:requestBody});
  assert.equal(sent.statusCode,201);
  assert.equal((await call('POST','/requests',{body:requestBody})).statusCode,409,'No duplicate requests');
  assert.equal((await call('GET','/summary',{entityId:PROMOTER})).payload.pendingRequests,1);
  assert.equal((await call('GET','/inbox',{entityId:PROMOTER})).payload.requests[0].status,'pending');
  assert.equal((await call('GET','/sent')).payload.requests[0].status,'pending');
  for(const entityId of [BAND,PROMOTER,OUTSIDER]){
    assert.equal((await call('GET','/requests/:id/messages',{entityId})).statusCode,404,'Pending thread stays unreadable');
    assert.equal((await call('POST','/requests/:id/read',{entityId,body:{lastSeenMessageId:ID}})).statusCode,404,'Pending thread cannot be marked read');
  }
  assert.equal((await call('PATCH','/requests/:id',{entityId:BAND,body:{status:'accepted'}})).statusCode,404,'Sender cannot accept');
  assert.equal((await call('PATCH','/requests/:id',{entityId:OUTSIDER,body:{status:'accepted'}})).statusCode,404);
  assert.equal((await call('PATCH','/requests/:id',{entityId:PROMOTER,body:{status:'accepted'}})).statusCode,200);
  assert.equal((await call('GET','/summary',{entityId:PROMOTER})).payload.pendingRequests,0);
  assert.equal((await call('GET','/requests/:id/messages',{entityId:OUTSIDER})).statusCode,404);
  assert.equal((await call('POST','/requests/:id/messages',{entityId:OUTSIDER,body:{body:'unauthorized'}})).statusCode,404);
  assert.equal((await call('POST','/requests/:id/read',{entityId:OUTSIDER,body:{lastSeenMessageId:ID}})).statusCode,404);
  const first=await call('POST','/requests/:id/messages',{entityId:BAND,body:{body:'Can you confirm whether Friday is available?'}});
  assert.equal(first.statusCode,201);
  assert.equal((await call('GET','/summary',{entityId:PROMOTER})).payload.unreadConversations,1,'Promoter sees unread band reply');
  assert.equal((await call('GET','/summary',{entityId:BAND})).payload.unreadConversations,0);
  assert.equal((await call('GET','/requests/:id/messages',{entityId:PROMOTER})).payload.messages[0].body,'Can you confirm whether Friday is available?');
  assert.equal((await call('POST','/requests/:id/read',{entityId:PROMOTER,body:{lastSeenMessageId:first.payload.message.id}})).statusCode,200);
  assert.equal((await call('GET','/summary',{entityId:PROMOTER})).payload.unreadConversations,0);
  const second=await call('POST','/requests/:id/messages',{entityId:PROMOTER,userId:replyUser,body:{body:'Friday could work; please share your tour routing.'}});
  assert.equal(second.statusCode,201);
  assert.equal((await call('GET','/summary',{entityId:BAND})).payload.unreadConversations,1);
  const messages=(await call('GET','/requests/:id/messages',{entityId:BAND})).payload.messages;
  assert.equal(messages.length,2);
  assert.equal(messages[0].senderEntityId,BAND);
  assert.equal(messages[1].senderEntityId,PROMOTER);
  assert.equal((await call('POST','/requests/:id/read',{entityId:BAND,body:{lastSeenMessageId:second.payload.message.id}})).statusCode,200);
  assert.equal((await call('GET','/summary',{entityId:BAND})).payload.unreadConversations,0);
  assert.equal(state.messages.length,2);
  assert.equal(notices.length,4,'Initial request, acceptance, and two replies create notifications');
});

test('declining locks the conversation without a reply or retry path',async()=>{
 const {call}=testHarness();
 await call('PUT','/preferences',{entityId:PROMOTER,body:{acceptingIntroductions:true}});
 assert.equal((await call('POST','/requests',{body:{promoterId:PROMOTER,message:'We would like to work with your venue this year.'}})).statusCode,201);
 assert.equal((await call('PATCH','/requests/:id',{entityId:PROMOTER,body:{status:'declined'}})).statusCode,200);
 assert.equal((await call('GET','/requests/:id/messages',{entityId:PROMOTER})).statusCode,404);
 assert.equal((await call('POST','/requests',{body:{promoterId:PROMOTER,message:'We would like to work with your venue this year.'}})).statusCode,403);
});

test('unread remains when sender replies after an incoming message without opening thread',async()=>{
 const {call}=testHarness();
 await call('PUT','/preferences',{entityId:PROMOTER,body:{acceptingIntroductions:true}});
 await call('POST','/requests',{body:{promoterId:PROMOTER,message:'We would like to discuss available concert dates next month.'}});
 await call('PATCH','/requests/:id',{entityId:PROMOTER,body:{status:'accepted'}});
 await call('POST','/requests/:id/messages',{entityId:PROMOTER,body:{body:'Please send us your tour dates.'}});
 assert.equal((await call('GET','/summary',{entityId:BAND})).payload.unreadConversations,1);
 await call('POST','/requests/:id/messages',{entityId:BAND,body:{body:'Our dates include November 15 and November 18.'}});
 assert.equal((await call('GET','/summary',{entityId:BAND})).payload.unreadConversations,1,
  'Sending a reply must not hide an unread earlier message from the promoter');
 assert.equal((await call('GET','/sent',{entityId:BAND})).payload.requests[0].unread,true);
});

test('read acknowledgement cannot clear a message that arrived after the last fetched message',async()=>{
 const {call}=testHarness();
 await call('PUT','/preferences',{entityId:PROMOTER,body:{acceptingIntroductions:true}});
 await call('POST','/requests',{body:{promoterId:PROMOTER,message:'We would like to discuss available concert dates next month.'}});
 await call('PATCH','/requests/:id',{entityId:PROMOTER,body:{status:'accepted'}});
 const earlier=await call('POST','/requests/:id/messages',{entityId:PROMOTER,body:{body:'Can we start a conversation?'}});
 const fetched=await call('GET','/requests/:id/messages',{entityId:BAND});
 assert.equal(fetched.payload.messages.at(-1).id,earlier.payload.message.id);
 await call('POST','/requests/:id/messages',{entityId:PROMOTER,body:{body:'Additional availability has opened up.'}});
 assert.equal((await call('POST','/requests/:id/read',{entityId:BAND,body:{lastSeenMessageId:earlier.payload.message.id}})).statusCode,200);
 assert.equal((await call('GET','/summary',{entityId:BAND})).payload.unreadConversations,1,
  'An unseen reply arriving between GET and read ACK must remain unread');
 const latest=(await call('GET','/requests/:id/messages',{entityId:BAND})).payload.messages.at(-1);
 await call('POST','/requests/:id/read',{entityId:BAND,body:{lastSeenMessageId:latest.id}});
 assert.equal((await call('GET','/summary',{entityId:BAND})).payload.unreadConversations,0);
 assert.equal((await call('POST','/requests/:id/read',{entityId:BAND,body:{lastSeenMessageId:earlier.payload.message.id}})).statusCode,200);
 assert.equal((await call('GET','/summary',{entityId:BAND})).payload.unreadConversations,0,
  'Out-of-order older acknowledgement must not roll back read state');
});
