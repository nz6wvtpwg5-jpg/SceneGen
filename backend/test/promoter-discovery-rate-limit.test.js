const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {consumeDiscoveryAllowance}=require('../promoter-discovery-rate-limit');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';

test('rate-limit is keyed by user, workspace and action without revealing identifiers',async()=>{
 const attempts=new Map();
 const fakePool={query:async(sql,params)=>{
   assert.match(sql,/INSERT INTO auth_rate_limits/);
   assert.match(sql,/ON CONFLICT \(rate_key\)/);
   assert.equal(params[0].length,64);
   const n=(attempts.get(params[0])||0)+1;
   attempts.set(params[0],n);
   return {rows:[{attempts:n}]};
 }};
 const params={userId:a,entityId:b,maxAttempts:2};
 assert.equal(await consumeDiscoveryAllowance(fakePool,params),true);
 assert.equal(await consumeDiscoveryAllowance(fakePool,params),true);
 assert.equal(await consumeDiscoveryAllowance(fakePool,params),false);
 assert.equal(await consumeDiscoveryAllowance(fakePool,{...params,entityId:a}),true);
 assert.equal(await consumeDiscoveryAllowance(fakePool,{...params,userId:b}),true);
 assert.equal(await consumeDiscoveryAllowance(fakePool,{...params,action:'save'}),true);
 assert.equal(await consumeDiscoveryAllowance(fakePool,{...params,userId:'invalid'}),false);
});

test('promoter discovery rate-limits before private-contact queries and returns 429',()=>{
 const search=server.split("app.get('/api/contacts/discover-promoters'")[1].split("app.get('/api/contacts/promoter-shortlist'")[0];
 assert.ok(search.indexOf('consumeDiscoveryAllowance')<search.indexOf('pool.query(PROFILE_SQL)'));
 assert.match(search,/res.status\(429\)/);
 assert.match(search,/Retry-After/);
 const save=server.split("app.post('/api/contacts/promoter-shortlist'")[1].split("app.delete('/api/contacts/promoter-shortlist'")[0];
 assert.ok(save.indexOf('consumeDiscoveryAllowance')<save.indexOf('pool.query(PROFILE_SQL)'));
 assert.match(save,/maxAttempts:60/);
});

test('shortlist reads and deletes use active artist workspace only',()=>{
 const section=server.split("app.get('/api/contacts/promoter-shortlist'")[1].split("app.post('/api/contacts/private'")[0];
 assert.equal((section.match(/workspace\.rows\[0\]\?\.entity_type !== 'artist'/g)||[]).length,3);
 assert.match(section,/WHERE entity_id=\$1::uuid/);
 assert.match(section,/WHERE id=\$1::uuid AND entity_id=\$2::uuid RETURNING id/);
 const authorization=fs.readFileSync(path.join(__dirname,'../authorization.js'),'utf8');
 assert.match(authorization,/You do not have access to this workspace or day sheet/);
 assert.match(server,/app.use\('\/api', createEntityAuthorizationMiddleware\(pool\)\)/);
});
