const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('external day-sheet access is least-privilege and supports required scopes', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations/014_scoped_day_sheet_collaborators.sql'), 'utf8');
  assert.match(migration, /scope_type IN \('all', 'countries', 'tour', 'show'\)/);
  assert.match(migration, /access_level IN \('viewer', 'editor'\)/);
  assert.match(migration, /revoked_at/);
  assert.doesNotMatch(migration, /INSERT INTO entity_memberships/i);
});

test('country grants are checked against the show country without broad workspace membership', () => {
  const authorization = fs.readFileSync(path.join(root, 'authorization.js'), 'utf8');
  assert.match(authorization, /resolveDaySheetGrant/);
  assert.match(authorization, /territoryMatches\(grant\.countries, resolveShowCountry\(grant\.country, grant\.venue_address\)\)/);
  assert.doesNotMatch(authorization, /scenegen_territory_matches/);
  assert.match(authorization, /req\.isExternalDaySheetCollaborator = true/);
  assert.match(authorization, /parts\.length < 2/);
});

test('day-sheet grants match canonical territories and aggregate permissions', async () => {
  const { resolveDaySheetGrant } = require('../authorization');
  const showId = '11111111-1111-4111-8111-111111111111';
  const pool = { query: async () => ({ rows: [
    { scope_type: 'countries', countries: ['@region:Europe'], country: 'France', access_level: 'viewer', edit_scope: 'none', financial_access: 'hidden', require_approval: false },
    { scope_type: 'show', show_id: showId, country: 'France', access_level: 'editor', edit_scope: 'advance', financial_access: 'view', require_approval: true },
    { scope_type: 'countries', countries: ['United States'], country: 'France', access_level: 'editor', edit_scope: 'full', financial_access: 'edit', require_approval: false },
  ] }) };

  const grant = await resolveDaySheetGrant(pool, { path: `/shows/${showId}`, userId: '22222222-2222-4222-8222-222222222222' }, '33333333-3333-4333-8333-333333333333');
  assert.deepEqual(grant, { access_level: 'editor', edit_scope: 'advance', financial_access: 'view', require_approval: true });
});

test('external day-sheet listing uses canonical territories and masks all finances', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  assert.match(routes, /territoryMatches\(row\.grant_countries, showCountry\)/);
  assert.match(routes, /DAY_SHEETS_UNAVAILABLE/);
  assert.match(routes, /doorSplitPercentage.*advanceTicketPrice.*doorTicketPrice/);
  assert.doesNotMatch(routes, /scenegen_territory_matches/);
});

test('external portal exposes and securely confirms a dedicated collaborator profile', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  const profileRoute = routes.slice(routes.indexOf("router.patch('/my-day-sheet-profile'"), routes.indexOf('\n  return router;', routes.indexOf("router.patch('/my-day-sheet-profile'")));
  const proxy = fs.readFileSync(path.join(root, '../src/app/api/collaborator/day-sheets/route.ts'), 'utf8');
  const page = fs.readFileSync(path.join(root, '../src/app/external-day-sheets/page.tsx'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'migrations/027_collaborator_profile_confirmation.sql'), 'utf8');
  assert.match(routes, /router\.patch\('\/my-day-sheet-profile'/);
  assert.match(profileRoute, /WHERE id=\$2::uuid AND lower\(email\)=lower\(\$3\)/);
  assert.match(profileRoute, /collaborator_profile_name=\$1/);
  assert.doesNotMatch(profileRoute, /UPDATE day_sheet_access_grants/);
  assert.doesNotMatch(profileRoute, /UPDATE day_sheet_access_invites/);
  assert.match(proxy, /export async function PATCH/);
  assert.match(page, /Complete your profile/);
  assert.match(page, /Upcoming shows/);
  assert.match(page, /Previous shows/);
  assert.match(migration, /collaborator_profile_name VARCHAR\(120\)/);
  assert.match(migration, /collaborator_profile_confirmed_at TIMESTAMPTZ/);
});

test('collaborator portal exposes tours while agent finances stay in the agent workspace', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  const profileRoute = routes.slice(routes.indexOf("router.patch('/my-day-sheet-profile'"), routes.indexOf('\n  return router;', routes.indexOf("router.patch('/my-day-sheet-profile'")));
  const page = fs.readFileSync(path.join(root, '../src/app/external-day-sheets/page.tsx'), 'utf8');
  const agentPage = fs.readFileSync(path.join(root, '../src/app/agent/page.tsx'), 'utf8');
  assert.match(routes, /portal_tour\.name portal_tour_name/);
  assert.match(routes, /financialAccess: row\.grant_financial_access/);
  assert.doesNotMatch(profileRoute, /collaborator_commission_percentage=/);
  assert.doesNotMatch(profileRoute, /UPDATE (?:shows|budgets|day_sheet_access_grants|day_sheet_access_invites)/);
  assert.match(page, /Calendar view/);
  assert.match(page, /showFirstMonth\(visibleShows\)/);
  assert.match(page, /showFirstMonth\(nextTab === 'upcoming' \? upcoming : previous\)/);
  assert.match(page, /candidateShows\.map\(\(show\) => dateKey\(show\.showDate\)\)\.find\(Boolean\)/);
  assert.match(page, /SceneGenWordmark/);
  assert.match(page, /signOut\(\{ callbackUrl: '\/' \}\)/);
  assert.match(page, /upcoming\.find\(\(show\) => dateKey\(show\.showDate\)\) \|\| upcoming\[0\]/);
  assert.match(page, /Open next day sheet/);
  assert.match(page, /if \(!todayKey \|\| !nextShow\?\.showDate\) return null/);
  assert.match(page, /show\.tourName \|\| 'One-off show'/);
  assert.doesNotMatch(page, /Private commission rate|Estimated commission|Edit rate/);
  assert.match(agentPage, /Private commission rate/);
  assert.match(agentPage, /Estimated commission/);
});

test('collaborator sign-out returns to the public SceneGen landing page', () => {
  const page = fs.readFileSync(path.join(root, '../src/app/external-day-sheets/page.tsx'), 'utf8');
  const rootPage = fs.readFileSync(path.join(root, '../src/app/page.tsx'), 'utf8');
  const middleware = fs.readFileSync(path.join(root, '../src/middleware.ts'), 'utf8');
  const appShell = fs.readFileSync(path.join(root, '../src/components/layout/app-shell.tsx'), 'utf8');
  assert.match(page, /SessionProvider basePath=["']\/api\/collaborator-auth["']/);
  assert.match(page, /signOut\(\{ callbackUrl: ['"]\/['"] \}\)/);
  assert.match(rootPage, /export default function LandingPage/);
  assert.match(rootPage, /href=["']\/login["']/);
  assert.doesNotMatch(rootPage, /redirect\(["']\/dashboard["']\)/);
  assert.match(middleware, /pathname === ["']\/["'] \|\| publicRoutes/);
  assert.match(appShell, /AUTH_ROUTES = new Set\(\[\s*["']\/["'],/);
});

test('collaborator joins support the legacy text show entity key', () => {
  const baseMigration = fs.readFileSync(path.join(root, 'migrate.js'), 'utf8');
  const authorization = fs.readFileSync(path.join(root, 'authorization.js'), 'utf8');
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');

  assert.match(baseMigration, /CREATE TABLE IF NOT EXISTS shows[\s\S]*entity_id VARCHAR\(255\)/);
  assert.match(authorization, /g\.entity_id::text = s\.entity_id::text/);
  assert.match(routes, /s\.entity_id::text = g\.entity_id::text/);
  assert.match(routes, /e\.id::text = s\.entity_id::text/);
});

test('administrators can safely edit active grants and pending invitations', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  const proxy = fs.readFileSync(path.join(root, '../src/app/api/day-sheet-collaborators/[kind]/[id]/route.ts'), 'utf8');
  const manage = fs.readFileSync(path.join(root, '../src/components/manage/DaySheetCollaborators.tsx'), 'utf8');
  assert.match(routes, /router\.patch\('\/day-sheet-collaborators\/:kind\/:id'/);
  assert.match(routes, /Administrator access is required/);
  assert.match(routes, /FOR UPDATE(?: OF record)?/);
  assert.match(routes, /pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
  assert.match(routes, /g\.id <> \$3::uuid/);
  assert.match(routes, /record\.entity_id::text = \$2::text/);
  assert.match(routes, /financialAccess === 'edit'/);
  assert.match(routes, /error\.code === '23505'/);
  assert.match(proxy, /export async function PATCH/);
  assert.match(proxy, /method: 'PATCH'/);
  assert.match(proxy, /Invalid permission update/);
  assert.match(manage, /beginEdit/);
  assert.match(manage, /savePermissions/);
  assert.match(manage, /Edit permissions/);
  assert.match(manage, /method: ["']PATCH["']/);
});

test('collaborator names are workspace scoped and travel from invite to grant', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations/018_collaborator_recipient_names.sql'), 'utf8');
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const manage = fs.readFileSync(path.join(root, '../src/components/manage/DaySheetCollaborators.tsx'), 'utf8');

  assert.match(migration, /day_sheet_access_invites[\s\S]*recipient_name VARCHAR\(120\)/);
  assert.match(migration, /day_sheet_access_grants[\s\S]*recipient_name VARCHAR\(120\)/);
  assert.match(migration, /SET recipient_name = NULLIF\(trim\(app_user\.name\), ''\)/);
  assert.match(routes, /COALESCE\(NULLIF\(g\.recipient_name, ''\), u\.name\) name/);
  assert.match(routes, /invitation\.recipient_name, invitation\.access_level/);
  assert.match(routes, /recipientName\.length > 120/);
  assert.match(routes, /SET recipient_name=\$1, access_level=\$2/);
  assert.doesNotMatch(routes, /UPDATE users SET name/);
  assert.match(server, /invitation\.recipient_name \|\| null/);
  assert.match(server, /COALESCE\(NULLIF\(users\.name, ''\), EXCLUDED\.name\)/);
  assert.match(manage, /name: recipientName/);
  assert.match(manage, /name: item\.name \|\| ["']{2}/);
  assert.match(manage, /Person’s name/);
  assert.match(manage, /\{item\.email\}/);
});

test('active collaborator records cannot silently discard their supplied name', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations/023_require_collaborator_names.sql'), 'utf8');
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  assert.match(migration, /UPDATE day_sheet_access_invites[\s\S]*status IN \('pending', 'accepted'\)/);
  assert.match(migration, /UPDATE day_sheet_access_grants[\s\S]*grant_record\.revoked_at IS NULL/);
  assert.match(migration, /day_sheet_invites_recipient_name_required/);
  assert.match(migration, /day_sheet_grants_recipient_name_required/);
  assert.match(migration, /CHECK \(recipient_name IS NOT NULL AND trim\(recipient_name\) <> ''\) NOT VALID/);
  assert.match(routes, /i\.recipient_name AS name/);
});

test('accepted grants retain a deterministic source invitation link', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations/019_link_grants_to_invitations.sql'), 'utf8');
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');

  assert.match(migration, /source_invite_id UUID REFERENCES day_sheet_access_invites\(id\)/);
  assert.match(migration, /UNIQUE INDEX[\s\S]*source_invite_id/);
  assert.match(routes, /entity_id,user_id,source_invite_id,recipient_name/);
  assert.match(routes, /invitation\.id, invitation\.recipient_name/);
});

test('stale accepted invitation records resolve to their active grant', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');

  assert.match(routes, /status IN \('pending', 'accepted'\)/);
  assert.match(routes, /g\.source_invite_id = \$1::uuid/);
  assert.match(routes, /grant\.rows\[0\]\?\.revoked_at/);
  assert.match(routes, /g\.user_id = \$2::uuid AND g\.created_by = \$3::uuid/);
  assert.match(routes, /SET source_invite_id = \$1::uuid/);
  assert.match(routes, /table = 'day_sheet_access_grants'/);
  assert.match(routes, /effectiveId = grant\.rows\[0\]\.id/);
  assert.match(routes, /SET recipient_name=\$1, access_level=\$2/);
  assert.match(routes, /financialAccess === 'edit'/);
  assert.doesNotMatch(routes, /UPDATE users SET name/);
  assert.match(routes, /idx_day_sheet_grants_source_invite/);
});

test('exact-scope replacements update existing access and linked records revoke together', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'migrations/022_reconcile_collaborator_replacements.sql'), 'utf8');
  const manage = fs.readFileSync(path.join(root, '../src/components/manage/DaySheetCollaborators.tsx'), 'utf8');
  assert.match(routes, /SELECT id FROM users WHERE lower\(email\) = \$1/);
  assert.match(routes, /countries @> \$4::text\[\] AND countries <@ \$4::text\[\]/);
  assert.match(routes, /UPDATE day_sheet_access_invites SET status = 'revoked'[\s\S]*tour_id::text = \$5::text/);
  assert.match(routes, /matchingGrants\.rows\.length > 1/);
  assert.match(routes, /updatedExisting: true/);
  assert.match(routes, /RETURNING source_invite_id/);
  assert.match(routes, /WHERE source_invite_id=\$1::uuid/);
  assert.match(migration, /grant_record\.countries @> invite\.countries/);
  assert.match(migration, /grant_record\.tour_id = invite\.tour_id/);
  assert.match(migration, /grant_record\.show_id = invite\.show_id/);
  assert.match(migration, /grant_record\.scope_type = replacement\.scope_type/);
  assert.match(migration, /grant_record\.id <> target_grant/);
  assert.match(manage, /data\.updatedExisting/);
});

test('successful invitations reset every new-invitation field', () => {
  const manage = fs.readFileSync(path.join(root, '../src/components/manage/DaySheetCollaborators.tsx'), 'utf8');
  assert.match(manage, /function resetInviteForm\(\)/);
  for (const reset of [
    /setRecipient\(""\)/, /setRecipientName\(""\)/, /setEditScope\("advance"\)/,
    /setFinancialAccess\("hidden"\)/, /setExpiresInDays\(30\)/, /setRequireApproval\(true\)/,
    /setScopeType\("countries"\)/, /setSelectedCountries\(\[\]\)/,
    /setCountryChoice\(""\)/, /setTourId\(""\)/, /setShowId\(""\)/,
  ]) assert.match(manage, reset);
  assert.equal((manage.match(/resetInviteForm\(\)/g) || []).length, 3);
  assert.match(manage, /setInviteRecipient\(recipient\)/);
  assert.match(manage, /SceneGen emailed the private link to \$\{inviteRecipient\}/);
  assert.match(manage, /Email delivery failed\. Send this private link to \$\{inviteRecipient\}/);
});

test('invite acceptance requires the signed-in email and stores only a token hash', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  assert.match(routes, /tokenHash\(token\)/);
  assert.match(routes, /x-user-email/);
  assert.match(routes, /Sign in as \$\{invitation\.email\}/);
  assert.doesNotMatch(routes, /INSERT INTO entity_memberships/i);
});

test('invitation creation accepts exactly one bare email address', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  assert.match(routes, /singleEmail/);
  assert.match(routes, /Enter one valid email address/);
});

test('active accepted invitations idempotently restore their authoritative grant', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'migrations/026_repair_accepted_day_sheet_grants.sql'), 'utf8');
  assert.match(routes, /ON CONFLICT \(source_invite_id\) WHERE source_invite_id IS NOT NULL DO UPDATE SET/);
  assert.match(routes, /countries=EXCLUDED\.countries/);
  assert.match(routes, /revoked_at=NULL/);
  assert.match(migration, /invitation\.status = 'accepted'/);
  assert.match(migration, /invitation\.revoked_at IS NULL/);
  assert.match(migration, /invitation\.expires_at > NOW\(\)/);
  assert.match(migration, /HAVING count\(\*\) = 1/);
  assert.match(migration, /app_user\.normalized_email = lower\(invitation\.email\)/);
  assert.match(migration, /lower\(app_user\.email\) = lower\(invitation\.email\)/);
  assert.match(migration, /INSERT INTO day_sheet_access_grants/);
  assert.match(migration, /countries = EXCLUDED\.countries/);
  assert.match(migration, /revoked_at = NULL/);
});

test('invite links expose a relative path and reject unsafe production URLs', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  const publicUrl = fs.readFileSync(path.join(root, 'public-frontend-url.js'), 'utf8');
  assert.match(routes, /invitePath/);
  assert.match(publicUrl, /PUBLIC_FRONTEND_URL/);
  assert.match(publicUrl, /candidate\.includes\(','\)/);
  assert.match(publicUrl, /parsed\.protocol !== 'https:' \|\| local/);
  assert.match(publicUrl, /scenegen-web\.onrender\.com/);
  assert.doesNotMatch(routes, /const base = process\.env\.FRONTEND_URL/);
});

test('production invite URL selection rejects localhost and comma-separated values', () => {
  const { publicFrontendUrl } = require('../public-frontend-url');
  const environment = {
    NODE_ENV: 'production',
    PUBLIC_FRONTEND_URL: 'http://localhost:3000',
    APP_URL: 'https://bad.example,https://other.example',
    FRONTEND_URL: 'https://app.example.com/path',
  };
  assert.equal(publicFrontendUrl(environment), 'https://app.example.com');
  assert.equal(publicFrontendUrl({ ...environment, PUBLIC_FRONTEND_URL: 'https://custom.example.com/' }), 'https://custom.example.com');
});

test('country shortcuts come from prior permissions rather than tour data', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  assert.match(routes, /unnest\(countries\).*day_sheet_access_grants/s);
  assert.match(routes, /day_sheet_access_invites/);
  assert.doesNotMatch(routes, /SELECT DISTINCT country FROM shows/);
});

test('legacy imported shows resolve a country from an exact address segment', () => {
  const { resolveShowCountry } = require('../territories');
  assert.equal(resolveShowCountry('', 'Bd Anspach 110, 1000 Bruxelles, Belgium'), 'Belgium');
  assert.equal(resolveShowCountry('', 'Manchester, England'), 'United Kingdom');
  assert.equal(resolveShowCountry('', 'Belfast, GBR'), 'United Kingdom');
  assert.equal(resolveShowCountry('Italy', 'an unrelated address'), 'Italy');
  assert.equal(resolveShowCountry('', 'Europe Hall, Springfield'), '');
});

test('stale permission editors carry validated identity and exact original scope', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  const manage = fs.readFileSync(path.join(root, '../src/components/manage/DaySheetCollaborators.tsx'), 'utf8');
  assert.match(manage, /email: editing\.email/);
  assert.match(manage, /originalScopeType: editing\.scope_type/);
  assert.match(routes, /validOriginalScope/);
  assert.match(routes, /originalCountries\.every\(validTerritory\)/);
  assert.match(routes, /g\.scope_type=\$3/);
  assert.match(routes, /g\.countries @> \$4::text\[\] AND g\.countries <@ \$4::text\[\]/);
  assert.doesNotMatch(routes, /\$3='' OR/);
});

test('invitation account switching is guarded once per token and reverified', () => {
  const page = fs.readFileSync(path.join(root, '../src/app/day-sheet-invite/[token]/page.tsx'), 'utf8');
  assert.match(page, /switchedToken\.current === token/);
  assert.match(page, /switchedToken\.current = token/);
  assert.match(page, /collaborator-auth\/session/);
  assert.match(page, /verified\?\.user\?\.email/);
  assert.doesNotMatch(page, /\[invitation, session, status, switchingAccount\]/);
});

test('returning through an accepted invitation repairs its exact linked grant before portal handoff', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  const page = fs.readFileSync(path.join(root, '../src/app/day-sheet-invite/[token]/page.tsx'), 'utf8');
  const acceptRoute = routes.slice(routes.indexOf("router.post('/day-sheet-invitations/:token/accept'"), routes.indexOf("router.delete('/day-sheet-collaborators/:kind/:id'"));

  assert.match(acceptRoute, /\['pending', 'accepted'\]\.includes\(invitation\.status\)/);
  assert.match(acceptRoute, /invitation\.accepted_by[\s\S]*req\.userId/);
  assert.match(acceptRoute, /ON CONFLICT \(source_invite_id\)[\s\S]*revoked_at=NULL/);
  assert.match(acceptRoute, /accepted_at=COALESCE\(accepted_at,NOW\(\)\), revoked_at=NULL/);
  assert.match(page, /invitation\?\.status === 'accepted'[\s\S]*day-sheet-invitations\/\$\{encodeURIComponent\(token\)\}\/accept/);
  assert.doesNotMatch(page, /if \(invitation\?\.status !== 'accepted'[\s\S]*router\.replace\('\/external-day-sheets'\)/);
});

test('all continent mappings match migration 017 and Europe excludes the UK', () => {
  const { REGIONS, matches, overlaps, validTerritory } = require('../territories');
  const sql = fs.readFileSync(path.join(root, 'migrations/017_continent_territories.sql'), 'utf8');
  const sqlKey = (country) => {
    const raw = String(country).toLowerCase().replace(/[^a-z]/g, '');
    if (['us', 'usa', 'unitedstates', 'unitedstatesofamerica'].includes(raw)) return 'US';
    if (['ca', 'can', 'canada'].includes(raw)) return 'CA';
    return raw.toUpperCase();
  };

  for (const [region, countries] of Object.entries(REGIONS)) {
    const pattern = new RegExp(`territory_key = '@region:${region.toLowerCase()}' THEN\\s+RETURN country_key = ANY\\(ARRAY\\[([^\\]]+)\\]\\);`);
    const match = sql.match(pattern);
    assert.ok(match, `missing SQL mapping for ${region}`);
    const actual = match[1].match(/'([^']+)'/g).map((value) => value.slice(1, -1)).sort();
    assert.deepEqual(actual, countries.map(sqlKey).sort(), `${region} SQL mapping differs from territories.js`);
  }

  assert.equal(matches(['@region:Europe'], 'France'), true);
  assert.equal(matches(['@region:Europe'], 'United Kingdom'), false);
  assert.equal(matches(['United States'], 'USA'), true);
  assert.equal(matches(['United States of America'], 'US'), true);
  assert.equal(matches(['Canada'], 'CA'), true);
  assert.equal(matches(['CAN'], 'Canada'), true);
  assert.equal(matches(['United Kingdom'], 'GB'), true);
  assert.equal(overlaps(['@region:Europe'], ['Germany']), true);
  assert.equal(overlaps(['@region:Europe'], ['United Kingdom']), false);
  assert.equal(validTerritory('@region:Oceania'), true);
  assert.equal(validTerritory('@region:Atlantis'), false);
});

test('territory reservations are validated and serialized per workspace', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  assert.match(routes, /validTerritory/);
  assert.match(routes, /pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
  assert.match(routes, /TERRITORY_ALREADY_ASSIGNED/);
  assert.match(routes, /g\.expires_at IS NULL OR g\.expires_at > NOW\(\)/);
  assert.match(routes, /i\.status = 'pending' AND i\.expires_at > NOW\(\)/);
});

test('individual day-sheet access can overlap an exclusive territory assignment', () => {
  const { territoryExclusivityApplies } = require('../day-sheet-collaborators');
  const manage = fs.readFileSync(path.join(root, '../src/components/manage/DaySheetCollaborators.tsx'), 'utf8');
  assert.equal(territoryExclusivityApplies('countries'), true);
  assert.equal(territoryExclusivityApplies('show'), false);
  assert.equal(territoryExclusivityApplies('tour'), false);
  assert.match(manage, /Individual day-sheet access is allowed even when another person manages that territory/);
});

test('public invitation lookup bypasses account lifecycle checks before sign-in', () => {
  const { isPublicTokenLookup } = require('../authorization');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.equal(isPublicTokenLookup({ method: 'GET', path: '/day-sheet-invitations/private-token' }), true);
  assert.equal(isPublicTokenLookup({ method: 'POST', path: '/day-sheet-invitations/private-token/accept' }), false);
  assert.match(server, /if \(isPublicTokenLookup\(req\)\) return next\(\);[\s\S]*ACCOUNT_UNAVAILABLE/);
});

test('pending access links remain visible to administrators and can be securely rotated', () => {
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'migrations/053_persistent_invitation_links.sql'), 'utf8');
  const manage = fs.readFileSync(path.join(root, '../src/components/manage/DaySheetCollaborators.tsx'), 'utf8');
  const proxy = fs.readFileSync(path.join(root, '../src/app/api/day-sheet-collaborators/invite/[id]/refresh-link/route.ts'), 'utf8');
  assert.match(migration, /invite_token_encrypted TEXT/);
  assert.match(routes, /createCipheriv\('aes-256-gcm'/);
  assert.match(routes, /invite_token_encrypted=\$2/);
  assert.match(routes, /status='pending' AND revoked_at IS NULL/);
  assert.match(routes, /access_link:/);
  assert.match(manage, /Private access link/);
  assert.match(manage, /Refresh link/);
  assert.match(proxy, /method: 'POST'/);
});

test('external collaborators can only edit the granted day sheet surface', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const authorization = fs.readFileSync(path.join(root, 'authorization.js'), 'utf8');

  assert.match(authorization, /parts\[0\] !== 'shows' \|\| parts\.length < 2/);
  assert.match(authorization, /req\.entityRole === 'viewer'/);
  assert.match(server, /External collaborators must use the restricted day-sheet editor/);
  assert.match(server, /\['tourId', 'googleCalendarEventId'\]\.includes\(key\)/);
  assert.match(server, /This invitation does not allow financial changes/);
  assert.match(server, /externalCollaborator: Boolean\(req\.isExternalDaySheetCollaborator\)/);
});

test('collaborator identity and revocation paths are constrained', () => {
  const middleware = fs.readFileSync(path.join(root, '../src/middleware.ts'), 'utf8');
  const routes = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');

  assert.match(middleware, /headers\.set\("x-user-email", req\.auth\.user\.email\)/);
  assert.match(routes, /\['grant', 'invite'\]\.includes\(req\.params\.kind\)/);
  assert.match(routes, /\^\[0-9a-f-\]\{36\}\$\/i\.test\(req\.params\.id\)/);
});
