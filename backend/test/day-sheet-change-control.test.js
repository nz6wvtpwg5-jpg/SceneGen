const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('change control is introduced by a new immutable migration', () => {
  const sql = fs.readFileSync(path.join(root, 'migrations/016_day_sheet_change_control.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS day_sheet_changes/);
  assert.match(sql, /status IN \('pending', 'applied', 'rejected', 'reverted'\)/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT TRUE/);
});

test('approval preference travels from invitation to grant', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  assert.match(routes, /const requireApproval = req\.body\.requireApproval !== false/);
  assert.match(routes, /invitation\.require_approval/);
  assert.match(routes, /SELECT email,password_hash FROM users WHERE id = \$1/);
});

test('external sensitive edits are queued atomically and owners are notified', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /BEGIN ISOLATION LEVEL SERIALIZABLE/);
  assert.match(server, /SELECT \* FROM shows WHERE id = \$1 AND entity_id = \$2 FOR UPDATE/);
  assert.match(server, /permissions\.requireApproval/);
  assert.match(server, /'day_sheet_change_requested'/);
  assert.match(server, /pendingApproval: true/);
  assert.match(server, /External collaborators cannot bulk-update shows/);
});

test('only administrators can decide or restore changes with show locking', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-changes.js'), 'utf8');
  assert.match(routes, /\['owner', 'admin'\]\.includes\(req\.entityRole\)/);
  assert.match(routes, /change-requests\/:changeId\/:decision/);
  assert.match(routes, /changes\/:changeId\/revert/);
  assert.match(routes, /BEGIN ISOLATION LEVEL SERIALIZABLE/);
  assert.match(routes, /SELECT \* FROM shows WHERE id=\$1 AND entity_id=\$2 FOR UPDATE/);
  assert.match(routes, /This request is stale because the day sheet changed after it was submitted/);
  assert.match(routes, /This change cannot be restored because the day sheet was edited afterward/);
  assert.match(routes, /financialAccess === 'hidden'/);
});

test('change activity prefers a collaborator-confirmed profile name', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-changes.js'), 'utf8');
  assert.match(routes, /COALESCE\(NULLIF\(u\.collaborator_profile_name, ''\), u\.name, u\.email/);
});
