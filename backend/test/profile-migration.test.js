const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('legacy promotional data remains durable for safe rollback', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '008_profile_and_user_data.sql'), 'utf8');
  assert.match(sql, /social_links JSONB NOT NULL DEFAULT '\{\}'::jsonb/i);
  assert.match(sql, /discography JSONB NOT NULL DEFAULT '\[\]'::jsonb/i);
  assert.match(sql, /preferences JSONB NOT NULL DEFAULT '\{\}'::jsonb/i);
  assert.match(sql, /timezone VARCHAR\(100\)/i);
});

test('workspace and account handlers bound stored input', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /socialLinks.*slice\(0, 10\)/s);
  assert.doesNotMatch(server, /req\.body\.discography/);
  assert.match(server, /tags.*slice\(0, 12\).*normalize\('NFKD'\).*`#\$\{slug\}`/s);
  assert.match(server, /emailNotifications: preferencesInput\.emailNotifications !== false/);
  assert.match(server, /calendarReminders: preferencesInput\.calendarReminders !== false/);
  assert.match(server, /new Intl\.DateTimeFormat\('en-US', \{ timeZone: timezone \}\)/);
});
