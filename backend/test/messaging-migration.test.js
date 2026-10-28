const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('persistent messages belong to accepted contact conversations', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '006_persistent_messaging.sql'), 'utf8');
  assert.match(sql, /contact_id UUID NOT NULL REFERENCES contacts\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /sender_entity_id UUID NOT NULL REFERENCES entities\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /char_length\(content\) BETWEEN 1 AND 4000/i);
  assert.match(sql, /idx_messages_contact_created/i);
});

test('messaging handlers enforce accepted contacts with UUID-safe entity comparisons', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /c\.status = 'accepted'/);
  assert.match(server, /c\.entity_a_id = \$1::uuid OR c\.entity_b_id = \$1::uuid/);
  assert.match(server, /id = \$1::uuid AND status = 'accepted'/);
  assert.match(server, /entity_a_id = \$2::uuid OR entity_b_id = \$2::uuid/);
  assert.match(server, /ORDER BY created_at DESC, id DESC LIMIT 200/);
  assert.match(server, /recent ORDER BY sent_at ASC, message_id ASC/);
});
