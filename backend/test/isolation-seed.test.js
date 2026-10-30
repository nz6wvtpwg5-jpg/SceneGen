const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../seed-isolation-test.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
test('synthetic seed is opt-in and does not expose a password', () => {
  assert.match(script, /SCENEGEN_ISOLATION_SEED !== 'enable'/);
  assert.match(script, /SCENEGEN_ISOLATION_PASSWORD/);
  assert.match(script, /ISOLATION_SEED_SUCCESS/);
  assert.doesNotMatch(script, /password666/);
});
test('seed includes exactly ten explicitly fictional promoters', () => {
  const names = script.match(/\['(?:Avery|Morgan|Jordan|Casey|Riley|Taylor|Quinn|Blair|Drew|Alex)','/g) || [];
  assert.equal(names.length, 10);
  assert.match(script, /Fictional test record/);
  assert.match(script, /other_workspace_contacts/);
});
test('private contact collection is scoped to verified workspace', () => {
  const contacts = server.split("app.get('/api/contacts', authMiddleware")[1].split("app.get('/api/contacts/search-profiles'")[0];
  assert.match(contacts, /FROM private_contacts private_contact WHERE private_contact.entity_id=\$1::uuid/);
  assert.match(contacts, /\[req.entityId\]/);
});
