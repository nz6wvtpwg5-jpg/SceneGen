const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const { mergePortalGrant } = require('../day-sheet-access-policy');
const { createEntityAuthorizationMiddleware, resolveDaySheetGrant } = require('../authorization');

test('overlapping collaborator and team-member grants always resolve to a restrictive role', () => {
  const collaborator = { grant_access_role: 'collaborator', grant_access_level: 'editor', grant_financial_access: 'edit' };
  const bandMember = { grant_access_role: 'band_member', grant_access_level: 'viewer', grant_financial_access: 'hidden' };
  for (const [first, second] of [[{ ...collaborator }, { ...bandMember }], [{ ...bandMember }, { ...collaborator }]]) {
    const merged = mergePortalGrant(first, second);
    assert.equal(merged.grant_access_role, 'band_member');
    assert.equal(merged.grant_access_level, 'viewer');
    assert.equal(merged.grant_financial_access, 'hidden');
  }
  const crew = mergePortalGrant({ ...collaborator }, { grant_access_role: 'crew_member', grant_access_level: 'viewer', grant_financial_access: 'hidden' });
  assert.deepEqual([crew.grant_access_role, crew.grant_access_level, crew.grant_financial_access], ['crew_member', 'viewer', 'hidden']);
});

test('detail authorization returns an enumerable, restrictive band-member permission', async () => {
  const pool = { query: async () => ({ rows: [
    { access_role: 'collaborator', access_level: 'editor', edit_scope: 'full', financial_access: 'edit', require_approval: true, scope_type: 'all' },
    { access_role: 'band_member', access_level: 'viewer', edit_scope: 'none', financial_access: 'hidden', require_approval: false, scope_type: 'all' },
  ] }) };
  const permission = await resolveDaySheetGrant(pool, { path: '/shows/11111111-1111-4111-8111-111111111111', userId: '22222222-2222-4222-8222-222222222222' }, '33333333-3333-4333-8333-333333333333');
  assert.deepEqual(permission, { access_role: 'band_member', access_level: 'viewer', edit_scope: 'none', financial_access: 'hidden', require_approval: false });
  assert.equal(Object.keys(permission).includes('access_role'), true);
});

test('a restricted grant overrides a stale non-owner entity membership', async () => {
  let queryNumber = 0;
  const pool = { query: async () => {
    queryNumber += 1;
    if (queryNumber === 1) return { rows: [{ entity_id: '33333333-3333-4333-8333-333333333333' }] };
    if (queryNumber === 2) return { rows: [{ role: 'editor' }] };
    return { rows: [{ access_role: 'band_member', access_level: 'viewer', edit_scope: 'none', financial_access: 'hidden', require_approval: false, scope_type: 'all' }] };
  } };
  const req = { method: 'GET', path: '/shows/11111111-1111-4111-8111-111111111111', headers: {}, query: {}, body: {}, userId: '22222222-2222-4222-8222-222222222222' };
  const res = { status() { return this; }, json(payload) { throw new Error(JSON.stringify(payload)); } };
  let continued = false;
  await createEntityAuthorizationMiddleware(pool)(req, res, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(req.isExternalDaySheetCollaborator, true);
  assert.deepEqual(req.daySheetPermissions, { accessRole: 'band_member', editScope: 'none', financialAccess: 'hidden', requireApproval: false });
  assert.equal(req.entityRole, 'viewer');
});

test('owner access is not narrowed by an external grant', async () => {
  let queryNumber = 0;
  const pool = { query: async () => {
    queryNumber += 1;
    if (queryNumber === 1) return { rows: [{ entity_id: '33333333-3333-4333-8333-333333333333' }] };
    if (queryNumber === 2) return { rows: [{ role: 'owner' }] };
    return { rows: [{ access_role: 'band_member', access_level: 'viewer', edit_scope: 'none', financial_access: 'hidden', require_approval: false, scope_type: 'all' }] };
  } };
  const req = { method: 'GET', path: '/shows/11111111-1111-4111-8111-111111111111', headers: {}, query: {}, body: {}, userId: '22222222-2222-4222-8222-222222222222' };
  const res = { status() { return this; }, json(payload) { throw new Error(JSON.stringify(payload)); } };
  await createEntityAuthorizationMiddleware(pool)(req, res, () => {});
  assert.equal(req.entityRole, 'owner');
  assert.equal(req.isExternalDaySheetCollaborator, undefined);
});

test('the latest active invitation name wins over stale account profile names', () => {
  const source = read('backend/day-sheet-collaborators.js');
  assert.match(source, /COALESCE\(NULLIF\(trim\(grant_name\.name\), ''\), NULLIF\(trim\(u\.collaborator_profile_name\), ''\), NULLIF\(trim\(u\.name\), ''\)\) name/);
  assert.match(source, /ORDER BY g\.created_at DESC, g\.id DESC LIMIT 1/);
});

test('band-member invites are irreducibly read only and non-commercial', () => {
  const source = read('backend/day-sheet-collaborators.js');
  assert.match(source, /const restrictedAccess = accessRole !== 'collaborator'/);
  assert.match(source, /restrictedAccess \? 'none'/);
  assert.match(source, /restrictedAccess \? 'hidden'/);
  assert.match(source, /restrictedAccess \? false/);
  assert.match(source, /grant_record\.access_role NOT IN \('band_member','crew_member'\)/);
});

test('authorization denies documents and every mutation to band members', () => {
  const source = read('backend/authorization.js');
  assert.match(source, /BAND_MEMBER_DOCUMENTS_FORBIDDEN/);
  assert.match(source, /BAND_MEMBER_READ_ONLY/);
  assert.match(source, /\/documents/);
  const documents = read('backend/show-documents.js');
  assert.match(documents, /'band_member', 'crew_member'/);
  assert.match(documents, /BAND_MEMBER_DOCUMENTS_FORBIDDEN/);
});

test('band-member show serialization strips contacts, notes and commercial fields', () => {
  const source = read('backend/day-sheet-collaborators.js');
  for (const field of ['promoterName', 'promoterPhone', 'promoterEmail', 'notes', 'feeNotes', 'commercialNotes']) assert.match(source, new RegExp(field));
  assert.match(read('backend/server.js'), /'band_member', 'crew_member'/);
});

test('band-member UI has a dedicated surface, keeps logistics and omits documents', () => {
  const portal = read('src/app/external-day-sheets/page.tsx');
  const detail = read('src/app/external-day-sheets/[id]/page.tsx');
  assert.match(portal, /Band member · Day sheets only/);
  assert.match(detail, /<BandMemberDaySheet/);
  assert.match(detail, /!bandMember && <div[^>]*><DocumentVault/);
  const mobile = read('src/components/shows/BandMemberDaySheet.tsx');
  assert.match(mobile, /Travel to this show/);
  assert.match(mobile, /Today’s timeline/);
  assert.doesNotMatch(mobile, /DocumentVault|documents/);
  assert.match(mobile, /overflow-x-clip/);
  assert.match(mobile, /overflow-wrap:anywhere/);
});

test('band-member invitation and password setup use mobile-specific copy', () => {
  const invitation = read('src/app/day-sheet-invite/[token]/page.tsx');
  assert.match(invitation, /restrictedRoleLabel/);
  assert.match(invitation, /has invited you to view their day sheets/);
  assert.match(invitation, /Create password/);
  assert.doesNotMatch(invitation, /Create password and open day sheets/);
});

test('crew-member invitations use the same protected surface with distinct labels', () => {
  const manager = read('src/components/manage/DaySheetCollaborators.tsx');
  const invitation = read('src/app/day-sheet-invite/[token]/page.tsx');
  const migration = read('backend/migrations/061_crew_member_day_sheet_role.sql');
  assert.match(manager, /Crew member — day sheets only/);
  assert.match(invitation, /Crew member/);
  assert.match(migration, /'crew_member'/);
});
