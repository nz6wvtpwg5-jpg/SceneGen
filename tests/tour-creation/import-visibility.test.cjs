const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('calendar import refreshes sidebar tour count when a tour is imported',()=>{const s=fs.readFileSync('src/app/shows/page.tsx','utf8');assert.match(s,/if \(result\.tour\?\.id\) refreshTours\(\)/);});
test('tour list reloads when tour refresh trigger changes',()=>{const s=fs.readFileSync('src/app/tours/page.tsx','utf8');assert.match(s,/tourRefreshTrigger = useCountRefreshStore/);assert.match(s,/session\?\.user\?\.id, tourRefreshTrigger\]/);});
