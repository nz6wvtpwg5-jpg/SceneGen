const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { discoverPromoters } = require('../promoter-discovery');
const source = fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const schema = fs.readFileSync(path.join(__dirname,'../migrations/072_promoter_discovery_shortlists.sql'),'utf8');
const ui = fs.readFileSync(path.join(__dirname,'../../src/components/contacts/PromoterDiscovery.tsx'),'utf8');
const listing = [{internal_email_key:'personal.private@example.test',promoter_name:'Personal Name',source_entity_id:'11111111-1111-4111-8111-111111111111',contact_only:true,listed_genres:['#doom'],known_locations:[{city:'Bristol',country:'United Kingdom'}]}];
test('anonymous discovery keys are opaque, stable, and depend on a server secret',()=>{
 const options = {genres:['#doom'],viewerEntityId:'22222222-2222-4222-8222-222222222222',signingSecret:'test-secret-1'};
 const one=discoverPromoters([],listing,options)[0];
 const two=discoverPromoters([],listing,options)[0];
 assert.match(one.discoveryKey,/^anonymous:[0-9a-f]{64}$/);
 assert.equal(one.discoveryKey,two.discoveryKey);
 assert.notEqual(one.discoveryKey,discoverPromoters([],listing,{...options,signingSecret:'test-secret-2'})[0].discoveryKey);
 assert.doesNotMatch(JSON.stringify(one),/personal.private|Personal Name|11111111|example.test/i);
});
test('shortlist storage is uniquely scoped to workspace, without private contact reference',()=>{
 assert.match(schema,/entity_id UUID NOT NULL REFERENCES entities/);
 assert.match(schema,/UNIQUE\(entity_id, discovery_key\)/);
 assert.doesNotMatch(schema,/contact_id|contact_email/i);
 const section=source.split("app.get('/api/contacts/promoter-shortlist'")[1].split("app.post('/api/contacts/private'")[0];
 assert.match(section,/WHERE entity_id=\$1::uuid/);
 assert.match(section,/WHERE id=\$1::uuid AND entity_id=\$2::uuid/);
 assert.match(section,/public_snapshot/);
 assert.match(section,/const snapshot = \{/);
 assert.doesNotMatch(section,/snapshot = req\.body/);
 assert.match(section,/signingSecret:process\.env\.BACKEND_SERVICE_TOKEN/);
});
test('shortlist UI has save and unsave with workspace context and a separate view',()=>{
 assert.match(ui,/My shortlist/);
 assert.match(ui,/toggleSave\(promoter\)/);
 assert.match(ui,/method:prior \? 'DELETE' : 'POST'/);
 assert.match(ui,/'X-Entity-Id':workspaceId/);
});
