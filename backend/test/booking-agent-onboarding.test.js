/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('booking agents are user personas and never artist workspace memberships', () => {
  const migration = read('backend/migrations/042_booking_agent_accounts.sql');
  const server = read('backend/server.js');
  assert.match(migration, /booking_agent_profiles/);
  assert.match(migration, /never grants access to an artist workspace/);
  const route = server.slice(server.indexOf("app.post('/api/booking-agent/profile'"), server.indexOf("app.get('/api/booking-agent/band-invitations'"));
  assert.match(route, /INSERT INTO booking_agent_profiles/);
  assert.doesNotMatch(route, /INSERT INTO entities|entity_memberships|day_sheet_access_grants/);
});

test('onboarding has an explicit agent endpoint and cannot fall through to promoter creation', () => {
  const onboarding = read('src/app/onboarding/page.tsx');
  const proxy = read('src/app/api/booking-agent/profile/route.ts');
  assert.match(onboarding, /'artist' \| 'promoter' \| 'booking_agent'/);
  assert.match(onboarding, /I'm a Booking Agent/);
  assert.match(onboarding, /entityType === 'promoter' \? '\/api\/promoter\/add' : '\/api\/booking-agent\/profile'/);
  assert.match(onboarding, /router\.push\('\/agent'\)/);
  assert.match(proxy, /Unable to reach the booking-agent profile service/);
  assert.doesNotMatch(proxy, /error instanceof Error \? error\.message/);
});

test('agent onboarding completes without a band and grants remain the only band data source', () => {
  const redirect = read('src/hooks/useOnboardingRedirect.ts');
  const agent = read('src/app/agent/page.tsx');
  const workspaces = read('src/app/api/agent/workspaces/route.ts');
  assert.match(redirect, /hasAgentProfile/);
  assert.match(agent, /No represented bands yet/);
  assert.match(workspaces, /my-represented-workspaces/);
  assert.match(agent, /Every band keeps independent permissions and commission rates/);
});

test('persisted workspaces are bound to one signed-in user before the shell renders', () => {
  const store = read('src/store/useProfileStore.ts');
  const provider = read('src/components/providers/session-provider-wrapper.tsx');
  const sidebar = read('src/components/sidenav/SidebarEntities.tsx');
  assert.match(store, /ownerUserId/);
  assert.match(store, /skipHydration: true/);
  assert.match(store, /version: 2/);
  assert.match(store, /localStorage\.removeItem\('scenegen-storage'\)/);
  assert.match(store, /localStorage\.removeItem\('entityId'\)/);
  assert.match(provider, /preparedIdentity !== currentIdentity/);
  assert.match(sidebar, /setActiveProfile\(null\)/);
});

test('onboarding and agent pages render without the band workspace shell', () => {
  const shell = read('src/components/layout/app-shell.tsx');
  assert.match(shell, /"\/onboarding"/);
  assert.match(shell, /isAgentRoute/);
});
