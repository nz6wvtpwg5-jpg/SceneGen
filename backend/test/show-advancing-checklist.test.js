const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('advancing migration is show-scoped and seeds existing and future shows', () => {
  const sql = read('backend/migrations/029_show_advancing_checklists.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS show_advance_tasks/);
  assert.match(sql, /entity_id VARCHAR\(255\) NOT NULL/);
  assert.match(sql, /show_id UUID NOT NULL REFERENCES shows\(id\) ON DELETE CASCADE/);
  assert.match(sql, /CHECK \(status IN \('todo', 'in_progress', 'blocked', 'done'\)\)/);
  assert.match(sql, /CREATE TRIGGER trg_seed_show_advance_tasks/);
  assert.match(sql, /INSERT INTO show_advance_tasks[\s\S]*FROM shows s/);
  assert.match(sql, /UNIQUE \(show_id, title\)/);
  assert.doesNotMatch(sql, /entity_id UUID NOT NULL REFERENCES entities/);
});

test('advancing API calculates readiness and enforces tenant and collaborator scope', () => {
  const api = read('backend/show-advance.js');
  const server = read('backend/server.js');
  assert.match(server, /createShowAdvanceRouter\(pool\)/);
  assert.match(server, /showReadinessSql/);
  assert.match(api, /percentage: result\.rowCount \? Math\.round\(done \* 100 \/ result\.rowCount\) : 0/);
  assert.match(api, /\['advance', 'full'\]\.includes\(req\.daySheetPermissions\?\.editScope\)/);
  assert.match(api, /show_record\.entity_id::text=\$1::text/);
  assert.match(api, /\['owner', 'admin'\]\.includes\(req\.entityRole\)/);
  assert.match(api, /Invalid checklist record/);
  assert.match(api, /Enter a valid due date/);
  assert.match(api, /date\.getUTCFullYear\(\) === Number\(match\[1\]\)/);
});

test('advancing PATCH preserves fields omitted by the caller', () => {
  const api = read('backend/show-advance.js');
  assert.match(api, /assignee=CASE WHEN \$8::boolean THEN \$9 ELSE task\.assignee END/);
  assert.match(api, /due_date=CASE WHEN \$10::boolean THEN \$11::date ELSE task\.due_date END/);
  assert.match(api, /notes=CASE WHEN \$12::boolean THEN \$13 ELSE task\.notes END/);
});

test('internal and isolated collaborator proxies expose only their identity paths', () => {
  const internal = read('src/app/api/shows/[id]/advance/route.ts');
  const external = read('src/app/api/collaborator/shows/[id]/advance/route.ts');
  const externalTask = read('src/app/api/collaborator/shows/[id]/advance/[taskId]/route.ts');
  assert.match(internal, /daySheetProxy/);
  assert.match(external, /collaboratorIdentityHeaders/);
  assert.match(external, /Collaborator sign-in required/);
  assert.doesNotMatch(externalTask, /export async function DELETE/);
});

test('day sheets and show summaries display advancing readiness', () => {
  const component = read('src/components/shows/AdvanceChecklist.tsx');
  const daySheet = read('src/app/shows/[id]/page.tsx');
  const external = read('src/app/external-day-sheets/[id]/page.tsx');
  const shows = read('src/components/shows/ShowsTable.tsx');
  const tour = read('src/app/tours/[id]/page.tsx');
  assert.match(component, /Show advancing/);
  assert.match(component, /Responsible person/);
  assert.match(component, /type="date"/);
  assert.match(component, /await confirmDialog/);
  assert.match(daySheet, /<AdvanceChecklist/);
  assert.match(external, /api\/collaborator\/shows/);
  assert.match(shows, /% advanced/);
  assert.match(tour, /% advanced/);
});
