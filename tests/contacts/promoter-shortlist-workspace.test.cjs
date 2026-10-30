const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=fs.readFileSync('src/components/contacts/PromoterDiscovery.tsx','utf8');
test('save response uses current workspace ref instead of stale closure when switching bands',()=>{
 assert.match(ui,/currentWorkspaceRef = useRef\(activeProfile\?\.id\)/);
 assert.match(ui,/currentWorkspaceRef\.current = activeProfile\?\.id/);
 assert.match(ui,/if \(currentWorkspaceRef\.current !== workspaceId\) return/);
 assert.match(ui,/if \(currentWorkspaceRef\.current === workspaceId\) setSaveError/);
 assert.match(ui,/if \(currentWorkspaceRef\.current === workspaceId\) setSavingKey\(null\)/);
});
