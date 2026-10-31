const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const read=(file)=>fs.readFileSync(file,'utf8');
const schema=read('backend/migrations/075_promoter_message_read_status.sql');
const api=read('backend/promoter-outreach.js');
const center=read('src/components/contacts/MessagesCenter.tsx');
const conversation=read('src/components/contacts/PromoterConversation.tsx');
test('read records are scoped to introduction and participating workspace',()=>{
 assert.match(schema,/PRIMARY KEY\(introduction_id,entity_id\)/);
 assert.match(api,/i.status='accepted'/);
 assert.match(api,/INSERT INTO promoter_introduction_read_state/);
 assert.match(api,/ON CONFLICT\(introduction_id,entity_id\) DO UPDATE/);
});
test('message list shows accepted conversations and separates pending requests',()=>{
 assert.match(center,/item.status==='accepted'/);
 assert.match(center,/item.status!=='accepted'/);
 assert.match(center,/isPromoter\?'Message requests':'Sent requests'/);
 assert.match(center,/Message requests/);
 assert.match(center,/PromoterConversation/);
 assert.match(center,/Accept/);
 assert.match(center,/Decline/);
});
test('conversation acknowledges replies but does not restart polling on parent callback changes',()=>{
 assert.match(conversation,/onReadRef.current=onRead/);
 assert.match(conversation,/lastMarkedRef.current/);
 assert.match(conversation,/requests.*\/read/);
 assert.match(conversation,/isCurrent\(entityId,introductionId\)/);
 assert.doesNotMatch(conversation,/\[entityId,introductionId,url,isCurrent,onRead\]/);
});
test('inbox uses the latest message and unread state without exposing private contact fields',()=>{
 assert.match(api,/latest.body last_message/);
 assert.match(api,/read_state.last_read_at/);
 assert.doesNotMatch(api,/private_contacts|sendTransactionalEmail/);
 const sidebar=read('src/app/config.tsx');
 const mobile=read('src/components/layout/mobile-navigation.tsx');
 assert.match(sidebar,/name: 'Messages'/);
 assert.match(sidebar,/href: '\/messages'/);
 assert.match(mobile,/href: '\/messages'/);
});

test('messages center uses active workspace for async operations and discovery links to the central inbox',()=>{
 assert.match(center,/activeWorkspaceRef.current===workspaceId/);
 assert.match(center,/if\(activeWorkspaceRef.current!==workspaceId\)return/);
 const discover=read('src/components/contacts/PromoterDiscovery.tsx');
 assert.match(discover,/href="\/messages\?tab=requests"/);
 const promoterSettings=read('src/components/contacts/PromoterIntroductionsSettings.tsx');
 assert.match(promoterSettings,/Open Messages/);
});

test('unread state scans all incoming messages since last read, not only the newest message',()=>{
 assert.match(api,/SELECT EXISTS \(/);
 assert.match(api,/unread_message\.sender_entity_id<>\$1::uuid/);
 assert.match(api,/unread_message\.created_at>read_state\.last_read_at/);
 assert.match(api,/unread_state\.has_unread/);
 assert.doesNotMatch(api,/latest\.sender_entity_id<>\$1::uuid/);
});
test('read acknowledgements include the last displayed message and cannot clear newer unseen replies',()=>{
 assert.match(api,/seen\.id=\$3::uuid/);
 assert.match(api,/SELECT i\.id,\$2::uuid,seen\.created_at/);
 assert.match(api,/GREATEST\(promoter_introduction_read_state\.last_read_at,EXCLUDED\.last_read_at\)/);
 assert.match(conversation,/lastSeenMessageId:incoming\.at\(-1\)!\.id/);
});
