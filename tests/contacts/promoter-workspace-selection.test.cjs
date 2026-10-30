const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('src/components/contacts/PromoterDiscovery.tsx','utf8');
test('discovery search always uses selected artist workspace, never stale local storage',()=>{
  assert.doesNotMatch(source,/getEntityId/);
  assert.match(source,/if \(!artist \|\| !loaded \|\| !activeProfile\?\.id\) return;/);
  assert.match(source,/const workspaceId = activeProfile\.id;/);
  assert.match(source,/headers: \{ 'X-Entity-Id': workspaceId \}/);
});
test('late directory responses cannot overwrite a newly selected workspace',()=>{
  assert.match(source,/currentWorkspaceRef\.current === workspaceId\) setResults/);
  assert.match(source,/currentWorkspaceRef\.current === workspaceId\) setError/);
  assert.match(source,/currentWorkspaceRef\.current === workspaceId\) setBusy\(false\)/);
});
