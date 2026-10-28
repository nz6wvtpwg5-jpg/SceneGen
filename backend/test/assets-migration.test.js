const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('persistent assets are entity-scoped and size-limited', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '007_persistent_assets.sql'), 'utf8');
  assert.match(sql, /entity_id UUID NOT NULL REFERENCES entities\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /CHECK \(byte_size > 0 AND byte_size <= 10485760\)/i);
  assert.match(sql, /UNIQUE \(entity_id, file_key\)/i);
  assert.match(sql, /content BYTEA NOT NULL/i);
});

test('asset handlers enforce ownership, membership, contact access, and private caching', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /content\.length > 10 \* 1024 \* 1024/);
  assert.match(server, /own\.administrator_id = \$2/);
  assert.match(server, /em\.user_id = \$2::uuid AND em\.status = 'active'/);
  assert.match(server, /c\.status = 'accepted'/);
  assert.match(server, /Cache-Control', 'private, max-age=300'/);
  assert.match(server, /jsonb_agg\(jsonb_build_object\('fileId', a\.file_key/);
});
