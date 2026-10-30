'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const http=require('node:http');
const {createPrivateIdentityMiddleware,createEntityAuthorizationMiddleware}=require('../authorization');

const firstUser='11111111-1111-4111-8111-111111111111';
const secondUser='22222222-2222-4222-8222-222222222222';
const firstBand='33333333-3333-4333-8333-333333333333';
const secondBand='44444444-4444-4444-8444-444444444444';
const bearer=user=>{
 const encoded=Buffer.from(user).toString('base64url');
 const signature=crypto.createHmac('sha256',process.env.BACKEND_SERVICE_TOKEN).update(encoded).digest('base64url');
 return 'Bearer '+encoded+'.'+signature;
};

test('actual SceneGen middleware prevents account A from selecting band B or deleting its shortlist item',async()=>{
 const previous=process.env.BACKEND_SERVICE_TOKEN;
 process.env.BACKEND_SERVICE_TOKEN='test-only-secret-for-isolated-local-http-tests';
 const fakePool={query:async(sql,args)=>{
  if (sql.includes('FROM entities e LEFT JOIN entity_memberships em')) {
   const [entity,user]=args;
   return {rows:entity===firstBand && user===firstUser || entity===secondBand && user===secondUser
    ? [{id:entity,role:'owner'}] : []};
  }
  if (sql.includes('FROM day_sheet_access_grants g')) return {rows:[]};
  throw new Error('Unexpected database query in isolation test');
 }};
 const identify=createPrivateIdentityMiddleware(fakePool);
 const authorize=createEntityAuthorizationMiddleware(fakePool);
 const server=http.createServer((req,res)=>{
  req.path=new URL(req.url,'http://localhost').pathname.replace(/^\/api/,'');
  req.query={};req.body={};
  res.status=function(status){res.statusCode=status;return res;};
  res.json=function(body){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));return res;};
  identify(req,res,()=>authorize(req,res,()=>res.json({authorizedWorkspace:req.entityId,deleted:req.method==='DELETE'})));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const base='http://127.0.0.1:'+server.address().port+'/api/contacts/promoter-shortlist';
  const request=async(user,band,method='GET')=>fetch(method==='DELETE'?base+'/'+crypto.randomUUID():base,{
   method,headers:{Authorization:bearer(user),'X-Entity-Id':band}
  });
  assert.equal((await request(firstUser,firstBand)).status,200);
  assert.equal((await request(firstUser,secondBand)).status,403);
  assert.equal((await request(firstUser,secondBand,'DELETE')).status,403);
  assert.equal((await request(secondUser,firstBand)).status,403);
  assert.equal((await request(secondUser,secondBand)).status,200);
  assert.equal((await request(secondUser,secondBand,'DELETE')).status,200);
  assert.equal((await fetch(base,{headers:{'X-Entity-Id':firstBand}})).status,401);
 } finally {
  await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
  if(previous===undefined) delete process.env.BACKEND_SERVICE_TOKEN;
  else process.env.BACKEND_SERVICE_TOKEN=previous;
 }
});
