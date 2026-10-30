const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('src/hooks/useShows.ts', 'utf8');
const create = source.split('const createShow = async')[1].split('const updateShow = async')[0];
test('show creation maps form fields to backend API contract', () => {
  for (const key of ['date','startTime','doorTime','venueName','city','state','country','capacity','guaranteedFee','backendDeal','promoterEmail']) {
    assert.match(create, new RegExp('\\b' + key + ': showData\\.'));
  }
  assert.match(create, /return data\.show as Show/);
  assert.match(create, /if \(!data\?\.show\?\.id\)/);
});
