const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const source=fs.readFileSync('src/components/shows/CreateShowForm.tsx','utf8');
const edit=source.split('const updates: Record<string, unknown> = {')[1].split('// Update tourId')[0];
test('show edit payload uses backend-recognized names',()=>{
 for(const key of ['date','city','state','country','capacity','doorTime','startTime','guaranteedFee','backendDeal','promoterName','promoterEmail','promoterPhone'])assert.match(edit,new RegExp('\\b'+key+': formData\\.'));
 for(const key of ['showDate','venueCity','venueState','venueCountry','venueCapacity','doorsTime','showTime','guarantee','dealType','contactName','contactEmail','contactPhone','advanceTicketPrice','doorTicketPrice','doorSplitPercentage'])assert.doesNotMatch(edit,new RegExp('\\b'+key+': formData\\.'));
});
