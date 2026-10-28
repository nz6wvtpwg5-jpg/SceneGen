const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const { verifiedPlace, proposalGrant } = require('../show-proposal-policy');
const { attachProposalEvents, validDate } = require('../show-proposals');

test('show proposals have an explicit opt-in capability and immutable event history', () => {
  const migration = read('migrations/037_agent_show_proposals.sql');
  assert.equal((migration.match(/can_propose_shows BOOLEAN NOT NULL DEFAULT FALSE/g) || []).length, 2);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS show_proposals/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS show_proposal_events/);
  assert.match(migration, /idx_show_proposals_active_venue_date/);
  assert.match(migration, /accepted_show_id UUID REFERENCES shows\(id\)/);
});

test('territory proposal permission defaults on, survives acceptance and can be edited', () => {
  const collaborator = read('day-sheet-collaborators.js');
  assert.equal((collaborator.match(/\['all', 'countries'\]\.includes\(scopeType\) && req\.body\.canProposeShows !== false/g) || []).length, 2);
  assert.match(collaborator, /can_propose_shows=EXCLUDED\.can_propose_shows/);
  assert.match(collaborator, /invitation\.can_propose_shows/);
  const management = read('../src/components/manage/DaySheetCollaborators.tsx');
  assert.match(management, /Can propose new shows/);
  assert.match(management, /canProposeShows,/);
  assert.match(management, /canProposeShows: Boolean\(item\.can_propose_shows\)/);
});

test('migration enables pending proposal day sheets and repairs existing territory access', () => {
  const migration = read('migrations/052_pending_proposal_day_sheets.sql');
  assert.match(migration, /'pending_acceptance'/);
  assert.match(migration, /proposed_show_id UUID REFERENCES shows\(id\) ON DELETE SET NULL/);
  assert.match(migration, /idx_show_proposals_proposed_show/);
  assert.equal((migration.match(/scope_type IN \('all','countries'\)/g) || []).length, 2);
  assert.equal((migration.match(/SET can_propose_shows=TRUE/g) || []).length, 2);
});

test('proposal submission verifies Google place data and enforces active territory grants', () => {
  const routes = read('show-proposals.js');
  const policy = read('show-proposal-policy.js');
  assert.match(policy, /places\.googleapis\.com\/v1\/places/);
  assert.match(policy, /can_propose_shows=TRUE/);
  assert.match(policy, /territoryMatches\(grant\.countries, country\)/);
  assert.match(routes, /OUTSIDE_ASSIGNED_TERRITORY/);
  assert.match(routes, /pg_advisory_xact_lock/);
  assert.doesNotMatch(routes, /canonicalCountry\(req\.body\.country\)/);
});

test('submission creates one pending day sheet and links it atomically', () => {
  const routes = read('show-proposals.js');
  assert.match(routes, /'20:00','pending_acceptance'/);
  assert.match(routes, /proposed_show_id\)/);
  assert.match(routes, /provisional\.rows\[0\]\.id/);
  assert.match(routes, /INSERT INTO show_proposal_events/);
  assert.match(routes, /await client\.query\('COMMIT'\)/);
});

test('acceptance promotes the pending day sheet while decline removes only that provisional record', () => {
  const routes = read('show-proposals.js');
  assert.match(routes, /SELECT \* FROM show_proposals WHERE id=\$1::uuid FOR UPDATE/);
  assert.match(routes, /status='tentative'/);
  assert.match(routes, /status='pending_acceptance' RETURNING id/);
  assert.match(routes, /DELETE FROM shows WHERE id=\$1::uuid AND entity_id::text=\$2::text AND status='pending_acceptance'/);
  assert.match(routes, /UPDATE show_proposals SET status=\$1/);
  assert.match(routes, /Owner or administrator approval is required/);
});

test('verified place data is taken from Google rather than collaborator input', async () => {
  const previousKey = process.env.GOOGLE_MAPS_API_KEY;
  const previousFetch = global.fetch;
  process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  global.fetch = async () => ({ ok: true, json: async () => ({
    id: 'google-place-123', displayName: { text: 'Die Kantine' }, formattedAddress: 'Neusser Landstrasse 2, Cologne, Germany',
    addressComponents: [{ longText: 'Cologne', shortText: 'Cologne', types: ['locality'] }, { longText: 'North Rhine-Westphalia', shortText: 'NRW', types: ['administrative_area_level_1'] }, { longText: 'Germany', shortText: 'DE', types: ['country'] }],
    location: { latitude: 50.998, longitude: 6.963 },
  }) });
  try {
    const place = await verifiedPlace('google-place-123');
    assert.deepEqual(place, { placeId: 'google-place-123', name: 'Die Kantine', address: 'Neusser Landstrasse 2, Cologne, Germany', city: 'Cologne', region: 'North Rhine-Westphalia', country: 'Germany', countryCode: 'DE', latitude: 50.998, longitude: 6.963 });
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY; else process.env.GOOGLE_MAPS_API_KEY = previousKey;
  }
});

test('proposal capability grants only their assigned country or region', async () => {
  const database = { query: async () => ({ rows: [{ id: 'eu', scope_type: 'countries', countries: ['@region:Europe'] }, { id: 'uk', scope_type: 'countries', countries: ['United Kingdom'] }] }) };
  assert.equal((await proposalGrant(database, 'entity', 'user', 'Germany')).id, 'eu');
  assert.equal((await proposalGrant(database, 'entity', 'user', 'United Kingdom')).id, 'uk');
  assert.equal(await proposalGrant(database, 'entity', 'user', 'United States'), null);
});

test('proposal dates reject impossible calendar values', () => {
  assert.equal(validDate('2026-02-28'), true);
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('not-a-date'), false);
});

test('Next routes preserve member review and isolated collaborator identities', () => {
  const collection = read('../src/app/api/show-proposals/route.ts');
  const mine = read('../src/app/api/my-show-proposals/route.ts');
  const decision = read('../src/app/api/show-proposals/[id]/decision/route.ts');
  const collaborator = read('../src/app/api/collaborator/show-proposals/route.ts');
  assert.match(collection, /daySheetProxy\(request, '\/show-proposals'/);
  assert.match(collection, /show-proposals\?entityId=/);
  assert.match(mine, /daySheetProxy\(request, '\/my-show-proposals'/);
  assert.match(decision, /daySheetProxy\(request, `\/show-proposals\/\$\{encodeURIComponent\(id\)\}\/decision`/);
  assert.match(collaborator, /collaboratorIdentityHeaders/);
  assert.match(collaborator, /Collaborator sign-in required/);
  assert.match(collaborator, /headers: identity/);
});

test('proposal interfaces expose submission, status and member decisions', () => {
  const portal = read('../src/app/external-day-sheets/page.tsx');
  const form = read('../src/components/proposals/show-proposal-form.tsx');
  const inbox = read('../src/app/show-proposals/page.tsx');
  const navigation = read('../src/app/config.tsx');
  assert.match(portal, /Propose a show/);
  assert.match(portal, /My proposals/);
  assert.match(form, /Choose a venue from the Google Places results/);
  assert.match(form, /Send to band for approval/);
  assert.match(inbox, /Accept offer/);
  assert.match(inbox, /Request changes/);
  assert.match(inbox, /Decline/);
  assert.match(navigation, /href: '\/show-proposals'/);
});

test('collaborator proposal listing includes every active proposal-capable workspace', () => {
  const routes = read('show-proposals.js');
  assert.match(routes, /g\.can_propose_shows=TRUE/);
  assert.match(routes, /g\.scope_type IN \('all','countries'\)/);
  assert.match(routes, /res\.json\(\{ proposals: await attachProposalEvents\(pool, result\.rows, \{ includeActorEmail: false \}\), workspaces: workspaces\.rows \}\)/);
});

test('requested changes can only be revised by the original collaborator under a current territory grant', () => {
  const routes = read('show-proposals.js');
  assert.match(routes, /router\.post\('\/show-proposals\/:id\/revise'/);
  assert.match(routes, /String\(proposal\.proposed_by\) !== String\(req\.userId\)/);
  assert.match(routes, /proposal\.status !== 'changes_requested'/);
  assert.match(routes, /proposalGrant\(client, proposal\.entity_id, req\.userId, place\.country\)/);
  assert.match(routes, /revision=revision\+1/);
  assert.match(routes, /id<>\$6::uuid/);
  assert.match(routes, /proposed_show_id=\$20::uuid/);
  assert.match(routes, /decided_at=NULL, decided_by=NULL, decision_note=NULL/);
  assert.match(routes, /'Revised offer submitted'/);
});

test('proposal decisions notify the collaborator and every listing carries immutable history', async () => {
  const routes = read('show-proposals.js');
  assert.match(routes, /INSERT INTO notifications\(user_id,entity_id,type,title,message,action_url\)/);
  assert.match(routes, /'\/external-day-sheets'/);
  assert.match(routes, /attachProposalEvents\(pool, result\.rows\)/);
  const rows = [{ id: 'proposal-a' }, { id: 'proposal-b' }];
  const database = { query: async () => ({ rows: [
    { id: 'event-1', proposal_id: 'proposal-a', event_type: 'submitted' },
    { id: 'event-2', proposal_id: 'proposal-a', event_type: 'changes_requested' },
  ] }) };
  const attached = await attachProposalEvents(database, rows);
  assert.equal(attached[0].events.length, 2);
  assert.deepEqual(attached[1].events, []);
});

test('collaborator history hides member email and changes requested wait for revision', () => {
  const routes = read('show-proposals.js');
  const inbox = read('../src/app/show-proposals/page.tsx');
  assert.match(routes, /includeActorEmail: false/);
  assert.match(routes, /proposal\.status !== 'pending'/);
  assert.match(routes, /awaiting collaborator revision/);
  assert.match(inbox, /Waiting for the collaborator to revise this offer/);
  assert.match(routes, /const responseProposal = \(await attachProposalEvents\(client/);
});

test('Render web builds have enough heap for the proposal interfaces', () => {
  const render = read('../render.yaml');
  assert.match(render, /NODE_OPTIONS=--max-old-space-size=4096 pnpm build/);
});

test('isolated revise proxy and both mobile interfaces complete the change loop', () => {
  const revise = read('../src/app/api/collaborator/show-proposals/[id]/revise/route.ts');
  const form = read('../src/components/proposals/show-proposal-form.tsx');
  const portal = read('../src/app/external-day-sheets/page.tsx');
  const inbox = read('../src/app/show-proposals/page.tsx');
  assert.match(revise, /collaboratorIdentityHeaders/);
  assert.match(revise, /headers: identity/);
  assert.match(form, /Resubmit revised offer/);
  assert.match(portal, /Revise and resubmit/);
  assert.match(inbox, /Offer history/);
});
