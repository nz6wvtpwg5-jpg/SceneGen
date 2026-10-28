const test=require('node:test');
const assert=require('node:assert/strict');
const {userShowNotes,legacyCalendarImportTitle}=require('../calendar-import-notes');
test('removes machine metadata without removing user notes',()=>{
 const n='[Google Calendar event: abc123]\nImported calendar entry: Conan UK shows\n\nBring spare cables\nCall promoter';
 assert.equal(userShowNotes(n),'Bring spare cables\nCall promoter');
 assert.equal(legacyCalendarImportTitle(n),'Conan UK shows');
});
test('preserves ordinary notes',()=>{const n='Soundcheck 5pm\nImported calendar entry: handwritten note';assert.equal(userShowNotes(n),n);});
test('removes metadata-only notes',()=>assert.equal(userShowNotes('[Google Calendar event: x]\nImported calendar entry: UK dates'),''));
