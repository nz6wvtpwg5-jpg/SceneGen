const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('contact notifications are entity scoped and indexed', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '009_contact_notifications.sql'), 'utf8');
  assert.match(sql, /entity_id UUID REFERENCES entities\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /read_at TIMESTAMPTZ/i);
  assert.match(sql, /idx_notifications_user_unread_created/i);
});

test('contact and notification handlers enforce entity ownership boundaries', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /requested_by != \$2/);
  assert.match(server, /You cannot contact your active workspace/);
  assert.match(server, /A valid contactEntityId is required/);
  assert.match(server, /SELECT \* FROM notifications WHERE user_id = \$1 AND entity_id = \$2::uuid/);
  assert.match(server, /id = \$1::uuid AND user_id = \$2 AND entity_id = \$3::uuid/);
});
