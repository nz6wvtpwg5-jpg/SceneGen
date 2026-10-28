const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('private contacts are workspace scoped and independent from reciprocal connections', () => {
  const migration = read('backend/migrations/034_private_contacts.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS private_contacts/);
  assert.match(migration, /entity_id UUID NOT NULL REFERENCES entities\(id\) ON DELETE CASCADE/);
  assert.match(migration, /linked_entity_id UUID REFERENCES entities\(id\) ON DELETE SET NULL/);
  assert.match(migration, /CHECK \(jsonb_typeof\(roles\) = 'array'\)/);
  assert.match(migration, /CHECK \(\(latitude IS NULL\) = \(longitude IS NULL\)\)/);
  assert.match(migration, /UNIQUE INDEX[\s\S]+entity_id, lower\(email\)/);
  assert.doesNotMatch(migration, /ALTER TABLE contacts/);
});

test('private contact API enforces ownership, partial updates, bounded imports and verified linking', () => {
  const server = read('backend/server.js');
  const authorization = read('backend/authorization.js');
  assert.match(server, /app\.use\('\/api', createEntityAuthorizationMiddleware\(pool\)\)/);
  assert.match(authorization, /!readOnly && !selfRecord && req\.entityRole === 'viewer'/);
  assert.match(server, /app\.post\('\/api\/contacts\/private', authMiddleware/);
  assert.match(server, /inputs\.length > 500/);
  assert.match(server, /current = await pool\.query\('SELECT \* FROM private_contacts WHERE id=\$1::uuid AND entity_id=\$2::uuid'/);
  assert.match(server, /DELETE FROM private_contacts WHERE id=\$1::uuid AND entity_id=\$2::uuid/);
  assert.match(server, /app\.post\('\/api\/contacts\/private\/import-shows'/);
  assert.match(server, /entity_id::text=\$1::text/);
  assert.match(server, /date DESC NULLS LAST/);
  assert.match(server, /candidates\.rows\.slice\(0, 500\)/);
  assert.match(server, /status='accepted'[\s\S]+Accept the SceneGen connection before linking/);
  assert.match(server, /linkedEntityId === String\(req\.entityId\)/);
  assert.ok(server.indexOf("app.post('/api/contacts/private/import-shows'") < server.indexOf("app.post('/api/contacts/request'"));
});

test('contact validation bounds text, arrays, emails and coordinates', () => {
  const server = read('backend/server.js');
  assert.match(server, /contactText\(item, 80\)/);
  assert.match(server, /\.slice\(0, maximum\)/);
  assert.match(server, /INVALID_EMAIL/);
  assert.match(server, /INVALID_CONTACT_METHOD/);
  assert.match(server, /INVALID_COORDINATES/);
  assert.match(server, /pg_advisory_xact_lock/);
});

test('private contact proxies use strict IDs and the signed internal identity path', () => {
  const collection = read('src/app/api/contacts/private/route.ts');
  const item = read('src/app/api/contacts/private/[id]/route.ts');
  const link = read('src/app/api/contacts/private/[id]/link/route.ts');
  const importShows = read('src/app/api/contacts/private/import-shows/route.ts');
  assert.match(collection, /daySheetProxy/);
  assert.match(item, /\[1-5\]\[0-9a-f\]\{3\}/);
  assert.match(item, /encodeURIComponent\(id\)/);
  assert.match(item, /export async function DELETE/);
  assert.match(link, /\/link/);
  assert.match(importShows, /\/contacts\/private\/import-shows/);
  assert.doesNotMatch(item, /\[0-9a-f-\]\{36\}/);
});

test('contacts directory distinguishes and searches private contact details', () => {
  const directory = read('src/app/contacts/page.tsx');
  const table = read('src/components/contacts/ContactsTable.tsx');
  const hook = read('src/hooks/useContacts.ts');
  assert.match(directory, /contact\.contactOrganization/);
  assert.match(directory, /contact\.contactRoles/);
  assert.match(directory, /contact\.contactTerritories/);
  assert.match(table, /Private address-book contact/);
  assert.match(table, /mailto:/);
  assert.match(table, /contact\.contactEntityId \?/);
  assert.match(hook, /source\?: 'scenegen' \| 'private'/);
  assert.match(hook, /contactEntityId\?: string/);
});

test('contacts UI supports private creation, SceneGen discovery and bounded imports', () => {
  const page = read('src/app/contacts/add/page.tsx');
  const search = read('src/components/contacts/ContactSearch.tsx');
  const csv = read('src/lib/contactCsv.ts');
  assert.match(page, /Create privately/);
  assert.match(page, /Find on SceneGen/);
  assert.match(page, /Import from shows/);
  assert.match(page, /Upload CSV/);
  assert.match(page, /2 \* 1024 \* 1024/);
  assert.match(search, /window\.setTimeout/);
  assert.match(search, /searchSequence/);
  assert.match(csv, /unclosed quoted value/);
  assert.match(csv, /between 1 and 500 contacts/);
  assert.match(csv, /name or display_name column/);
});

test('private contacts can be edited without replacing their stable record', () => {
  const server = read('backend/server.js');
  const table = read('src/components/contacts/ContactsTable.tsx');
  const route = read('src/app/api/contacts/private/[id]/route.ts');
  const editor = read('src/components/contacts/EditContactDialog.tsx');
  assert.match(server, /app\.patch\('\/api\/contacts\/private\/:id'/);
  assert.match(server, /WHERE id=\$19::uuid AND entity_id=\$20::uuid RETURNING \*/);
  assert.match(server, /contact_given_name/);
  assert.match(server, /contact_surname/);
  assert.match(table, /EditContactDialog/);
  assert.match(table, /onContactUpdated/);
  assert.match(editor, /method: 'PATCH'/);
  assert.match(editor, /DialogContent/);
  assert.match(route, /export async function PATCH/);
  assert.doesNotMatch(editor, /window\.prompt|window\.confirm|window\.alert/);
});

test('contact locations are confirmed through Google Places and retain map coordinates', () => {
  const picker = read('src/components/contacts/ContactLocationPicker.tsx');
  const creator = read('src/app/contacts/add/page.tsx');
  const editor = read('src/components/contacts/EditContactDialog.tsx');
  assert.match(picker, /types=\{CITY_TYPES\}/);
  assert.match(picker, /administrative_area_level_1/);
  assert.match(picker, /component\(place, 'country'\)/);
  assert.match(picker, /place\.geometry/);
  assert.match(picker, /Choose a Google suggestion/);
  assert.doesNotMatch(picker, /setQuery\(location\.city\)/);
  assert.match(creator, /ContactLocationPicker/);
  assert.match(creator, /locationPending/);
  assert.match(editor, /ContactLocationPicker/);
  assert.match(editor, /key=\{contact\?\.id\}/);
  assert.match(editor, /locationPending/);
  assert.match(editor, /onInteractOutside/);
  assert.match(editor, /onPointerDownOutside/);
  assert.match(editor, /pac-container/);
  assert.match(read('src/app/globals.css'), /\.pac-container[\s\S]*pointer-events: auto !important/);
});
