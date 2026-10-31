const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const migration=fs.readFileSync('backend/migrations/074_promoter_introduction_messages.sql','utf8');
const api=fs.readFileSync('backend/promoter-outreach.js','utf8');
const sent=fs.readFileSync('src/components/contacts/SentPromoterIntroductions.tsx','utf8');
const received=fs.readFileSync('src/components/contacts/PromoterIntroductionsSettings.tsx','utf8');
test('replies are scoped to a foreign-keyed introduction and have length limits',()=>{
 assert.match(migration,/introduction_id UUID NOT NULL REFERENCES promoter_introductions\(id\) ON DELETE CASCADE/);
 assert.match(migration,/sender_entity_id UUID NOT NULL REFERENCES entities/);
 assert.match(migration,/char_length\(body\) BETWEEN 1 AND 2000/);
});
test('only an accepted introduction enables replies and rate limits senders',()=>{
 assert.match(api,/WHERE id=\$1::uuid AND status='accepted'/);
 assert.match(api,/i.status='accepted'/);
 assert.match(api,/action:'outreach-reply',maxAttempts:30,windowSeconds:86400/);
 assert.match(api,/artist_entity_id=\$2::uuid OR promoter_entity_id=\$2::uuid/);
});
test('both workspace views only render conversations after acceptance',()=>{
 assert.match(sent,/item.status==='accepted'&&<PromoterConversation/);
 assert.match(received,/item.status==='accepted'&&<PromoterConversation/);
});
