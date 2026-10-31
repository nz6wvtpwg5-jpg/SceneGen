const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const backend=fs.readFileSync('backend/promoter-outreach.js','utf8');
const ui=fs.readFileSync('src/components/contacts/PromoterConversation.tsx','utf8');
test('conversation fetches newest 200 messages in chronological display order',()=>{
 assert.match(backend,/ORDER BY created_at DESC,id DESC LIMIT 200/);
 assert.match(backend,/rows\.rows\.reverse\(\)\.map/);
});
test('conversation has manual and periodic refresh with no workspace-switch stale updates',()=>{
 assert.match(ui,/REFRESH_INTERVAL_MS=30000/);
 assert.match(ui,/Refresh replies/);
 assert.match(ui,/clearInterval\(interval\)/);
 assert.match(ui,/isCurrent\(entityId,introductionId\)/);
 assert.match(ui,/isCurrent\(requestEntity,requestIntroduction\)/);
 assert.match(ui,/busyRef\.current/);
 assert.match(ui,/\},\[load\]\)/);
});
