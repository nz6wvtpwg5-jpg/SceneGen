/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('agent-created bands get an operational workspace before acceptance', () => {
  const migration = read('backend/migrations/043_agent_created_band_invitations.sql');
  const custodyMigration = read('backend/migrations/045_pending_band_operational_custody.sql');
  const server = read('backend/server.js');

  assert.match(migration, /agent_created_band_invitations/);
  assert.match(migration, /agent_user_id UUID NOT NULL REFERENCES users/);
  assert.match(migration, /entity_id UUID REFERENCES entities/);
  assert.match(server, /app\.post\('\/api\/booking-agent\/band-invitations'/);
  const creation = server.slice(server.indexOf("app.post('/api/booking-agent/band-invitations'"), server.indexOf("app.get('/api/booking-agent/band-invitations/:token'"));
  assert.match(creation, /INSERT INTO entities/);
  assert.match(creation, /UPDATE agent_created_band_invitations SET entity_id/);
  assert.match(creation, /BEGIN/);
  assert.match(creation, /COMMIT/);
  assert.match(custodyMigration, /DROP CONSTRAINT IF EXISTS entities_administrator_id_key/);
  assert.match(custodyMigration, /INSERT INTO entities/);
  assert.match(custodyMigration, /status = 'pending'/);
  assert.match(custodyMigration, /SET entity_id = invitation\.id/);
  assert.match(creation, /crypto\.randomBytes\(32\)/);
  assert.match(creation, /hashOpaqueToken\(token\)/);
  assert.match(creation, /invitation_count[\s\S]*>= 10/);
});

test('acceptance transfers the working entity without losing shows or tours', () => {
  const server = read('backend/server.js');
  const acceptance = server.slice(server.indexOf("app.post('/api/booking-agent/band-invitations/:token/accept'"), server.indexOf('// POST /api/artist/add - Create artist entity', server.indexOf("app.post('/api/booking-agent/band-invitations/:token/accept'")));

  assert.match(acceptance, /authenticated_user\.email authenticated_email/);
  assert.match(acceptance, /normalizeEmail\(invitation\.recipient_email\).*normalizeEmail\(invitation\.authenticated_email\)/s);
  assert.doesNotMatch(acceptance, /req\.headers\['x-user-email'\]/);
  assert.match(acceptance, /FOR UPDATE OF invitation/);
  assert.match(acceptance, /UPDATE entities SET administrator_id=\$1::text/);
  assert.match(acceptance, /invitation\.entity_id/);
  assert.doesNotMatch(acceptance, /INSERT INTO entities/);
  assert.match(acceptance, /INSERT INTO day_sheet_access_grants/);
  assert.match(acceptance, /'editor','full','view',TRUE,TRUE,'all'/);
  assert.match(acceptance, /require_approval/);
  assert.match(acceptance, /ACCESS_OVERLAP/);
  assert.match(acceptance, /WHERE NOT EXISTS \(SELECT 1 FROM day_sheet_access_grants existing/);
  assert.match(acceptance, /status='accepted'/);
  assert.doesNotMatch(acceptance, /INSERT INTO entity_memberships/);
});

test('acceptance detects changed temporary custody', () => {
  const server = read('backend/server.js');
  const acceptance = server.slice(server.indexOf("app.post('/api/booking-agent/band-invitations/:token/accept'"), server.indexOf('// POST /api/artist/add - Create artist entity', server.indexOf("app.post('/api/booking-agent/band-invitations/:token/accept'")));

  assert.match(acceptance, /CUSTODY_CHANGED/);
  assert.doesNotMatch(acceptance, /confirmExistingEntity/);
});

test('the agent portal exposes create, invite and pending-roster states', () => {
  const agent = read('src/app/agent/page.tsx');
  const route = read('src/app/api/agent/band-invitations/route.ts');
  const acceptancePage = read('src/app/agent-band-invite/[token]/page.tsx');

  assert.match(agent, /Invite a band/);
  assert.match(agent, /Create profile and send invite/);
  assert.match(agent, /Pending ownership does not stop you planning/);
  assert.match(agent, /openBandWorkspace\(invitation, ["']\/shows["']\)/);
  assert.match(agent, /openBandWorkspace\(invitation, ["']\/tours["']\)/);
  assert.match(route, /sendAuthEmail/);
  assert.match(route, /emailDelivered/);
  assert.match(acceptancePage, /You remain in control/);
  assert.match(acceptancePage, /including any shows and tours already planned/);
  assert.doesNotMatch(acceptancePage, /confirmExistingEntity/);
  assert.match(acceptancePage, /callbackUrl/);
  assert.doesNotMatch(acceptancePage, /window\.location/);
});

test('workspace selector keeps every accessible band instead of truncating the roster', () => {
  const sidebar = read('src/components/sidenav/SidebarEntities.tsx');
  assert.match(sidebar, /setEntities\(accessibleEntities\)/);
  assert.doesNotMatch(sidebar, /singleEntity/);
  assert.doesNotMatch(sidebar, /filter\(\(e: Entity\) => e\.administratorId === userId\)/);
});
