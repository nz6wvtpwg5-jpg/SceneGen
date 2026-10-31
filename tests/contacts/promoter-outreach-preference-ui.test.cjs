'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=fs.readFileSync('src/components/contacts/PromoterIntroductionsSettings.tsx','utf8');
const settings=fs.readFileSync('src/app/settings/page.tsx','utf8');
const proxy=fs.readFileSync('src/app/api/promoter-outreach/preferences/route.ts','utf8');
test('promoter setting reads persisted server state on mount and after workspace changes',()=>{
 assert.match(ui,/fetch\('\/api\/promoter-outreach\/preferences',options\)/);
 assert.match(ui,/setEnabled\(settings\.acceptingIntroductions===true\)/);
 assert.match(ui,/useEffect\(\(\)=>\{[\s\S]*load\(controller\.signal\)/);
 assert.match(settings,/activeProfile\.entityType\?\.toLowerCase\(\)==='promoter'/);
 assert.match(settings,/key=\{activeProfile\.id\} entityId=\{activeProfile\.id\}/);
});
test('promoter switch supports both boolean values without optimistic success on error',()=>{
 assert.match(ui,/onChange=\{event=>void updatePreference\(event\.target\.checked\)\}/);
 assert.match(ui,/checked=\{enabled\} disabled=\{busy\|\|loading\}/);
 assert.match(ui,/JSON\.stringify\(\{acceptingIntroductions:next\}\)/);
 assert.match(ui,/if\(!response\.ok\)throw new Error/);
 assert.match(ui,/setEnabled\(data\.acceptingIntroductions===true\)/);
 assert.match(proxy,/daySheetProxy\(request,'\/promoter-outreach\/preferences',\{method:'PUT'/);
});
