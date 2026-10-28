const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {normalizeEmail,normalizeGenres,tokenHash}=require('../promoter-claims');
test('invite ownership uses verified email and one-time hashed token',()=>{
  assert.equal(normalizeEmail('  Person@Example.COM '),'person@example.com');
  assert.equal(tokenHash('secret').length,64);
  const source=fs.readFileSync(path.join(__dirname,'../promoter-claims.js'),'utf8');
  assert.match(source,/email_verified_at/);
  assert.match(source,/token_hash=\$1/);
  assert.match(source,/pg_advisory_xact_lock/);
  assert.match(source,/ON CONFLICT\(email\)/);
  assert.match(source,/INTERVAL '7 days'/);
  assert.match(source,/req.userId/);
  assert.doesNotMatch(source,/UPDATE private_contacts SET.*email/);
});
test('public genres are capped and canonical',()=>{
 assert.deepEqual(normalizeGenres(['#doommetal','#doommetal','#sludgemetal','email@someone.test']),['#doommetal','#sludgemetal']);
});
test('new migration and separate promoter workspace prevent band data sharing',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../migrations/066_promoter_claim_invitations.sql'),'utf8');
 assert.match(sql,/UNIQUE REFERENCES entities/);
 const source=fs.readFileSync(path.join(__dirname,'../promoter-claims.js'),'utf8');
 assert.match(source,/INSERT INTO entities\(administrator_id,entity_type,name,tags\)/);
 assert.match(source,/entity_type='promoter'/);
 assert.match(source,/FROM entities WHERE entity_type='artist'/);
});

test('email copy names the inviting band and the specific recorded show',()=>{
 const {composePromoterInvitation}=require('../promoter-claims');
 const msg=composePromoterInvitation({
  band_name:'Conan',show_id:'00000000-0000-4000-8000-000000000001',
  venue_name:'The Foundry',city:'Houston',country:'USA',show_date:'2026-09-20'
 });
 assert.match(msg.subject,/Conan/);
 assert.match(msg.body,/Conan/);
 assert.match(msg.body,/The Foundry/);
 assert.match(msg.body,/Houston, USA/);
 assert.match(msg.body,/20 September 2026/);
 assert.doesNotMatch(msg.body,/private email|private notes/);
});
test('a contact without a show cannot generate an invitation',()=>{
 const {composePromoterInvitation}=require('../promoter-claims');
 assert.throws(()=>composePromoterInvitation({band_name:'Conan'}),/recorded band and show/);
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 assert.match(server,/sourceShowId:result\.rows\[0\]\.id/);
 assert.match(server,/sourceShowId:candidate\.show_id/);
 assert.doesNotMatch(server.slice(server.indexOf("app.post('\/api\/contacts\/private'"),server.indexOf("app.patch('\/api\/contacts\/private")),/invitePromoterByEmail\(/);
});
