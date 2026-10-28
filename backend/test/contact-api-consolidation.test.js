const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');

test('contact consumers use the canonical contacts API', () => {
  for (const file of [
    'src/components/contacts/ContactSearch.tsx',
    'src/components/contacts/ConnectionRequest.tsx',
    'src/app/contacts/add/page.tsx',
  ]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, /\/api\/connections|\/api\/contact\/add/);
  }
  assert.equal(fs.existsSync(path.join(root, 'src/components/contacts/AddContactForm.tsx')), false);
  for (const route of [
    'connections/accept/[id]/route.ts', 'connections/request/route.ts',
    'contact/add/route.ts', 'contact/delete/[id]/route.ts', 'contact/delete/route.ts',
    'contact/list/route.ts', 'user/connections/get/route.ts',
  ]) {
    assert.equal(fs.existsSync(path.join(root, 'src/app/api', route)), false);
  }
});

test('legacy contact writes are retired and canonical deletion exists', () => {
  const source = fs.readFileSync(path.join(root, 'backend', 'server.js'), 'utf8');
  assert.match(source, /app\.use\(\['\/api\/connection', '\/api\/contact'\]/);
  assert.match(source, /code: 'ENDPOINT_RETIRED'/);
  assert.match(source, /app\.delete\('\/api\/contacts\/:contactId'/);
});

test('contacts API returns map and directory fields with array-safe tags', () => {
  const source = fs.readFileSync(path.join(root, 'backend', 'server.js'), 'utf8');
  const hook = fs.readFileSync(path.join(root, 'src', 'hooks', 'useContacts.ts'), 'utf8');
  assert.match(source, /e\.country as contact_country/);
  assert.match(source, /e\.latitude as contact_latitude/);
  assert.match(source, /e\.longitude as contact_longitude/);
  assert.match(source, /jsonb_typeof\(e\.tags\) = 'array'/);
  assert.match(source, /e\.id != \$1/);
  assert.match(hook, /contactCountry\?: string/);
  assert.match(hook, /contactLatitude\?: string \| number \| null/);
  assert.match(hook, /contactTags\?: string\[\]/);
});

test('contacts directory uses one filtered dataset for functional list and map views', () => {
  const page = fs.readFileSync(path.join(root, 'src', 'app', 'contacts', 'page.tsx'), 'utf8');
  const table = fs.readFileSync(path.join(root, 'src', 'components', 'contacts', 'ContactsTable.tsx'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'src', 'components', 'contacts', 'ContactMap.tsx'), 'utf8');
  const helpers = fs.readFileSync(path.join(root, 'src', 'lib', 'contactDirectory.ts'), 'utf8');
  assert.doesNotMatch(page, /ConnectionsTable/);
  assert.match(page, /const filteredContacts = useMemo/);
  assert.match(page, /<ContactsTable contacts=\{filteredContacts\}/);
  assert.match(page, /<ContactMap contacts=\{filteredContacts\}/);
  assert.match(page, /activeProfile\?\.id, activeTab/);
  assert.match(page, /Search people, roles, places or tags/);
  assert.match(page, /FilterSelect label="Role"/);
  assert.match(page, /FilterSelect label="Country"/);
  assert.match(table, /export default function ContactsTable\(\{ contacts,/);
  assert.doesNotMatch(table, /fetch\(/);
  assert.match(map, /export default function ContactMap\(\{ contacts, focusContactId \}/);
  assert.doesNotMatch(map, /fetch\(|navigator\.geolocation/);
  assert.match(helpers, /contact\.contactLatitude == null/);
  assert.match(helpers, /latitude < -90 \|\| latitude > 90/);
  assert.match(helpers, /typeof tag === 'string'/);
  assert.match(map, /map\.fitBounds/);
  assert.match(map, /map\.setView\(focusPosition, 10\)/);
});

test('public root presents the product without exposing the authenticated shell', () => {
  const page = fs.readFileSync(path.join(root, 'src', 'app', 'page.tsx'), 'utf8');
  const login = fs.readFileSync(path.join(root, 'src', 'app', 'login', 'page.tsx'), 'utf8');
  const layout = fs.readFileSync(path.join(root, 'src', 'app', 'layout.tsx'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'src', 'components', 'layout', 'app-shell.tsx'), 'utf8');
  const middleware = fs.readFileSync(path.join(root, 'src', 'middleware.ts'), 'utf8');
  assert.match(page, /The whole show/);
  assert.match(page, /One working record/);
  assert.match(page, /ProductPreview/);
  assert.match(page, /LandingProof/);
  assert.match(page, /LandingDecision/);
  assert.match(page, /LandingMobileMenu/);
  assert.match(page, /application\/ld\+json/);
  assert.match(page, /href="#main-content"/);
  assert.match(page, /sticky top-0/);
  assert.match(page, /href="\/login\?mode=register"/);
  assert.match(page, /id="workflows"/);
  assert.match(login, /URLSearchParams\(window\.location\.search\).*mode.*register/s);
  assert.match(layout, /Live operations for the whole show/);
  assert.match(layout, /metadataBase: new URL/);
  assert.match(layout, /alternates: \{ canonical: "\/" \}/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(layout, /summary_large_image/);
  for (const route of ['/manifest.webmanifest', '/opengraph-image', '/robots.txt', '/sitemap.xml']) {
    assert.match(middleware, new RegExp(route.replace('.', '\\.')));
  }
  assert.match(shell, /pathname !== "\/"/);
  assert.doesNotMatch(page, /redirect\(/);
});
