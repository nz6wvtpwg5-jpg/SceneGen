const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('workspace genre suggestions come from MusicBrainz with a bounded fallback', () => {
  const route = read('src/app/api/genres/route.ts');
  assert.match(route, /musicbrainz\.org\/ws\/2\/genre\?query=/);
  assert.match(route, /User-Agent': 'SceneGen\/1\.0/);
  assert.match(route, /AbortSignal\.timeout\(5000\)/);
  assert.match(route, /session\?\.user\?\.id/);
  assert.match(route, /FALLBACK_GENRES/);
  assert.doesNotMatch(route, /Math\.random/);
});

test('settings only add selected canonical genre hashtags', () => {
  const settings = read('src/app/settings/page.tsx');
  const picker = read('src/components/settings/genre-tag-picker.tsx');
  assert.match(settings, /<GenreTagPicker tags=\{workspace\.tags \|\| \[\]\}/);
  assert.match(picker, /MusicBrainz genre catalogue/);
  assert.match(picker, /onClick=\{\(\) => add\(genre\)\}/);
  assert.match(picker, /onChange\(\[\.\.\.tags, genre\.hashtag\]\.slice\(0, 12\)\)/);
  assert.doesNotMatch(picker, /onKeyDown.*Enter/);
});

test('profile writes normalize, deduplicate and bound genre hashtags', () => {
  const server = read('backend/server.js');
  assert.match(server, /\[\.\.\.new Set\(req\.body\.tags\.slice\(0, 12\)/);
  assert.match(server, /replace\(\/\^#\//);
  assert.match(server, /replace\(\/\[\^a-z0-9\]\+\/g, ''\)/);
  assert.match(server, /return slug \? `#\$\{slug\}` : null/);
});
