/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the booking-agent workspace exposes the authorised proposal workflow', () => {
  const page = read('src/app/agent/page.tsx');
  const form = read('src/components/proposals/show-proposal-form.tsx');
  const createRoute = read('src/app/api/show-proposals/route.ts');
  const reviseRoute = read('src/app/api/show-proposals/[id]/revise/route.ts');
  const backend = read('backend/show-proposals.js');

  assert.match(page, /Propose a show/);
  assert.match(page, /Show proposals/);
  assert.match(page, /apiMode="account"/);
  assert.match(page, /my-show-proposals/);
  assert.match(form, /apiMode === 'account' \? '\/api\/show-proposals'/);
  assert.match(form, /Choose a venue from the Google Places results/);
  assert.doesNotMatch(form, /disabled=\{submitting \|\| !entityId \|\| !venuePlaceId\}/);
  assert.match(createRoute, /daySheetProxy\(request, '\/show-proposals'/);
  assert.match(reviseRoute, /show-proposals\/\$\{encodeURIComponent\(id\)\}\/revise/);
  assert.match(backend, /proposalGrant/);
});

test('the agent dashboard explains the exact limits of every represented-band grant', () => {
  const page = read('src/app/agent/page.tsx');
  assert.match(page, /All territories/);
  assert.match(page, /active permission/);
  assert.match(page, /Financials hidden/);
  assert.match(page, /Open day-sheet editor/);
  assert.match(page, /Estimated commission/);
  assert.match(page, /Invite a band/);
});

test('the agent dashboard provides a full roster live desk and multi-band diary', () => {
  const page = read('src/app/agent/page.tsx');
  const route = read('src/app/api/agent/day-sheets/route.ts');
  const backend = read('backend/day-sheet-collaborators.js');

  assert.match(page, /Next movement/);
  assert.match(page, /Action board/);
  assert.match(page, /Roster diary/);
  assert.match(page, /Booked shows/);
  assert.match(page, /Shows ahead/);
  assert.match(page, /Represented bands/);
  assert.match(page, /Open proposals/);
  assert.match(page, /Previous month/);
  assert.match(page, /Next month/);
  assert.match(page, /agent\/shows\/\$\{show\.id\}/);
  assert.match(route, /bookingAgentOnly=true/);
  assert.match(backend, /bookingAgentOnly/);
  assert.match(backend, /agent_relationship\.id IS NOT NULL/);
});

test('every booking-agent show surface opens the grant-scoped day sheet', () => {
  const page = read('src/app/agent/page.tsx');
  const detail = read('src/app/agent/shows/[id]/page.tsx');
  const proxy = read('src/app/api/agent/shows/[id]/[[...path]]/route.ts');
  const shared = read('src/app/external-day-sheets/[id]/page.tsx');
  assert.match(page, /href=\{`\/agent\/shows\/\$\{encodeURIComponent\(show\.id\)\}`\}/);
  assert.match(page, /Open day-sheet editor/);
  assert.match(detail, /apiBase="\/api\/agent\/shows"/);
  assert.match(proxy, /allowedSuffix/);
  assert.match(proxy, /const backendPath = `\/shows\//);
  assert.match(proxy, /daySheetProxy\(request, backendPath/);
  assert.match(shared, /export function DaySheetPage/);
});

test('agent roster excludes collaborator-only bands and proposals', () => {
  const page = read('src/app/agent/page.tsx');
  const backend = read('backend/day-sheet-collaborators.js');
  const workspaces = backend.slice(backend.indexOf("router.get('/my-represented-workspaces'"), backend.indexOf("router.patch('/my-represented-workspaces/:entityId'"));

  assert.match(workspaces, /JOIN artist_agent_relationships agent_relationship/);
  assert.match(workspaces, /agent_relationship\.status = 'active'/);
  assert.match(page, /activeWorkspaceIds\.has\(proposal\.entityId\)/);
});

test('assigned shows default to upcoming with a separate reverse-chronological past tab', () => {
  const page = read('src/app/agent/page.tsx');

  assert.match(page, /useState<"upcoming" \| "past">\("upcoming"\)/);
  assert.match(page, /Upcoming shows/);
  assert.match(page, /Past shows/);
  assert.match(page, /showPeriod === "upcoming" \? futureAssignedShows : pastAssignedShows/);
  assert.match(page, /pastAssignedShows = useMemo\([\s\S]*\.reverse\(\)/);
  assert.match(page, /assignedShows\.map/);
  assert.match(page, /aria-selected=\{showPeriod === "upcoming"\}/);
});

test('booking-agent identity and tour context are visible without duplicating the page heading', () => {
  const page = read('src/app/agent/page.tsx');

  assert.match(page, /Independent booking agent/);
  assert.match(page, /Booking-agent profile/);
  assert.match(page, /Edit booking-agent profile/);
  assert.match(page, /<h1 className="mt-2 text-4xl font-black">Booking desk<\/h1>/);
  assert.match(page, /Standalone show/);
  assert.match(page, /Tour · \{show\.tourName\}/);
  assert.match(page, /tourColour\(show\.tourName\)/);
});

test('agent day sheets begin at relationship activation and direct show routes enforce the same boundary', () => {
  const backend = read('backend/day-sheet-collaborators.js');
  const proxy = read('src/app/api/agent/shows/[id]/[[...path]]/route.ts');

  assert.match(backend, /s\.date::date >= COALESCE\(agent_relationship\.activated_at, agent_relationship\.decided_at, agent_relationship\.requested_at\)::date/);
  assert.match(proxy, /my-day-sheets\?bookingAgentOnly=true/);
  assert.match(proxy, /agentCanAccessShow/);
  assert.match(proxy, /outside your active booking-agent access period/);
});
