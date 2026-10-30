'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const load=part=>fs.readFileSync(path.join(__dirname,'..',part),'utf8');
const schema=load('migrations/073_promoter_introductions.sql');
const api=load('promoter-outreach.js');
const discovery=load('promoter-discovery.js');
const server=load('server.js');
const ui=fs.readFileSync(path.join(__dirname,'../../src/components/contacts/PromoterDiscovery.tsx'),'utf8');
const settings=fs.readFileSync(path.join(__dirname,'../../src/components/contacts/PromoterIntroductionsSettings.tsx'),'utf8');
const composer=fs.readFileSync(path.join(__dirname,'../../src/components/contacts/PromoterIntroductionComposer.tsx'),'utf8');

test('promoter outreach is disabled by default and never exposes contact details',()=>{
 assert.match(schema,/accepting_introductions BOOLEAN NOT NULL DEFAULT FALSE/);
 assert.match(discovery,/COALESCE\(outreach\.accepting_introductions,FALSE\)/);
 assert.match(discovery,/acceptingIntroductions: Boolean\(entry\.profileId && entry\.acceptingIntroductions\)/);
 assert.match(ui,/isRegistered && promoter\.acceptingIntroductions && promoter\.profileId/);
 assert.doesNotMatch(api,/private_contacts|promoter_claims|sendTransactionalEmail/);
});
test('workspace authorisation checks owner/admin and server-side matching entity type',()=>{
 assert.match(api,/\['owner','admin'\]\.includes\(req\.entityRole\)/);
 assert.match(api,/req\.entityId/);
 assert.match(api,/artist\.entity_type='artist'/);
 assert.match(api,/promoter\.entity_type='promoter'/);
 assert.match(server,/createEntityAuthorizationMiddleware\(pool\)[\s\S]*createPromoterOutreachRouter\(pool, createEntityNotification\)/);
});
test('write is permitted only after explicit opt in, with atomic uniqueness and anti-spam',()=>{
 assert.match(api,/accepting_introductions=TRUE/);
 assert.match(api,/if\(!target\.recipient_valid \|\| !target\.opted_in\)/);
 assert.match(api,/maxAttempts:10,windowSeconds:86400/);
 assert.match(api,/ON CONFLICT DO NOTHING RETURNING id,status,created_at/);
 assert.match(schema,/UNIQUE INDEX IF NOT EXISTS promoter_introductions_pair_unique/);
 assert.match(api,/if\(prior\.rows\[0\]\)/);
 assert.match(schema,/CHECK \(char_length\(message\) BETWEEN 30 AND 1200\)/);
});
test('only the addressed promoter may accept or decline a pending request',()=>{
 assert.match(api,/promoter_entity_id=\$2::uuid AND status='pending'/);
 assert.match(api,/\['accepted','declined'\]\.includes\(req\.body\?\.status\)/);
 assert.match(api,/SELECT i\.id,i\.message,i\.status,i\.created_at,i\.responded_at/);
 assert.match(api,/WHERE i\.promoter_entity_id=\$1::uuid/);
 assert.match(api,/WHERE i\.artist_entity_id=\$1::uuid/);
});
test('notification goes to workspace owner, and never uses direct email',()=>{
 assert.match(api,/createEntityNotification\(promoterId,'promoter_introduction'/);
 assert.match(api,/createEntityNotification\(result\.rows\[0\]\.artist_entity_id/);
 assert.match(api,/In-app notification only/);
 assert.match(ui,/Request introduction/);
 assert.match(settings,/Accept new booking introductions/);
 assert.match(settings,/Introduction declined/);
 assert.match(composer,/This message is delivered to the promoter's private SceneGen inbox/);
});
test('new proxy endpoints use signed identity proxy',()=>{
 const root=path.join(__dirname,'../../src/app/api/promoter-outreach');
 for(const filename of ['preferences/route.ts','inbox/route.ts','sent/route.ts','requests/route.ts','requests/[id]/route.ts']){
  assert.match(fs.readFileSync(path.join(root,filename),'utf8'),/daySheetProxy/);
 }
});
