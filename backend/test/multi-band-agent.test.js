/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('workspace profiles are unique per agent and band with bounded commission', () => {
  const migration = read('backend/migrations/040_multi_band_agent_profiles.sql');
  assert.match(migration, /PRIMARY KEY \(user_id, entity_id\)/);
  assert.match(migration, /commission_percentage >= 0 AND commission_percentage <= 100/);
  assert.match(migration, /Rows never confer workspace access/);
});

test('day-sheet workspaces are derived only from the signed-in collaborator active grants', () => {
  const source = read('backend/day-sheet-collaborators.js');
  assert.match(source, /router\.get\('\/my-represented-workspaces'/);
  assert.match(source, /WHERE g\.user_id = \$1::uuid AND g\.revoked_at IS NULL/);
  assert.match(source, /g\.expires_at IS NULL OR g\.expires_at > NOW\(\)/);
});

test('band commission update requires both active access and active agent status', () => {
  const source = read('backend/day-sheet-collaborators.js');
  const route = source.slice(source.indexOf("router.patch('/my-represented-workspaces/:entityId'"));
  assert.match(route, /UUID\.test\(req\.params\.entityId\)/);
  assert.match(route, /WHERE EXISTS \(SELECT 1 FROM day_sheet_access_grants g/);
  assert.match(route, /g\.user_id = \$1::uuid AND g\.entity_id = \$2::uuid/);
  assert.match(route, /artist_agent_relationships relationship/);
  assert.match(route, /relationship\.status = 'active'/);
  assert.match(route, /CASE WHEN \$5::boolean THEN EXCLUDED\.agency_name ELSE collaborator_workspace_profiles\.agency_name END/);
  assert.doesNotMatch(route, /UPDATE day_sheet_access_grants/);
});

test('collaborator portal filters by band without exposing agent-only commission controls', () => {
  const source = read('src/app/external-day-sheets/page.tsx');
  assert.match(source, /All day-sheet workspaces/);
  assert.match(source, /show\.entityId === workspaceFilter/);
  assert.match(source, /This is day-sheet access only/);
  assert.doesNotMatch(source, /Private commission rate|Estimated commission|Edit rate|commissionTotals/);
});

test('patch two exposes real territory scopes and filters proposals with the selected band', () => {
  const backend = read('backend/day-sheet-collaborators.js');
  const portal = read('src/app/external-day-sheets/page.tsx');
  assert.match(backend, /jsonb_agg\(DISTINCT jsonb_build_object\(/);
  assert.match(backend, /'scopeType', g\.scope_type/);
  assert.match(portal, /territoryLabel\(workspace\)/);
  assert.match(portal, /proposal\.entityId === workspaceFilter/);
  assert.match(portal, /Switch between bands that have granted you day-sheet access/);
});
