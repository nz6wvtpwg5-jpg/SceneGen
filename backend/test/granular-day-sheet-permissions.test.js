const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('granular collaborator permissions are migrated without changing an applied migration', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations/015_granular_day_sheet_permissions.sql'), 'utf8');
  assert.match(migration, /edit_scope IN \('none', 'advance', 'full'\)/);
  assert.match(migration, /financial_access IN \('hidden', 'view', 'edit'\)/);
  assert.match(migration, /day_sheet_access_grants[\s\S]*expires_at TIMESTAMPTZ/);
});

test('invites carry permissions and expiry into the accepted grant', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  assert.match(routes, /edit_scope,financial_access/);
  assert.match(routes, /invitation\.edit_scope, invitation\.financial_access/);
  assert.match(routes, /Math\.min\(365, Math\.max\(1/);
});

test('external show reads mask finances and writes enforce edit scope', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /financialAccess === 'hidden'/);
  assert.match(server, /This invitation does not allow financial changes/);
  assert.match(server, /This invitation only allows advance information to be edited/);
  assert.match(server, /External collaborators cannot move a show or change calendar ownership/);
});

test('expired grants are ignored during authorization', () => {
  const authorization = fs.readFileSync(path.join(root, 'authorization.js'), 'utf8');
  assert.match(authorization, /g\.expires_at IS NULL OR g\.expires_at > NOW\(\)/);
  assert.match(authorization, /financialAccess: grant\.financial_access/);
});
