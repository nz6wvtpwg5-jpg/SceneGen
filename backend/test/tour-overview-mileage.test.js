'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=(name)=>fs.readFileSync(path.resolve(__dirname,'../../',name),'utf8');
test('tour overview fetches saved route mileage rather than relying on financial budgets',()=>{
 const page=read('src/app/tours/page.tsx');
 assert.match(page,/tourRecord\.tour\?\.routeMileage/);
 assert.match(page,/mileage\?\.calculated/);
 assert.match(page,/totalMiles = mileage\.totalMiles/);
 assert.match(page,/hasBudgetMileage \? legacyBudgetMiles : null/);
 assert.match(page,/distance > 0/);
 assert.match(page,/stats\.totalMiles == null \? 'Not calculated'/);
});
test('mobile overview also shows unknown distances without fabricating zero miles',()=>{
 const mobile=read('src/components/tours/mobile-tours-list.tsx');
 assert.match(mobile,/totalMiles: number \| null/);
 assert.match(mobile,/totalMiles == null \? 'Not calculated'/);
});
