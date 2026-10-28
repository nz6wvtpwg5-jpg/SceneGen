const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('tour health is workspace scoped and calculated from persisted operations', () => {
  const api = read('backend/tour-health.js');
  const server = read('backend/server.js');
  assert.match(server, /createTourHealthRouter\(pool\)/);
  assert.match(api, /tours WHERE id=\$1::uuid AND entity_id::text=\$2::text/);
  assert.match(api, /show_advance_tasks/);
  assert.match(api, /day_sheet_changes/);
  assert.match(api, /change_record\.status='applied'/);
  assert.match(api, /show_notices/);
  assert.match(api, /show_record\.entity_id::text=\$2::text/);
  assert.match(api, /show\.status !== 'cancelled'/);
  assert.match(api, /needAttention: active\.length - roadReady/);
  assert.match(api, /task\.due_date<CURRENT_DATE/);
  assert.match(api, /LEFT JOIN LATERAL/);
});

test('tour health task priority puts blocked and overdue work first', () => {
  const { taskPriority } = require('../tour-health');
  assert.equal(taskPriority({ status: 'blocked', overdue: false }), 0);
  assert.equal(taskPriority({ status: 'todo', overdue: true }), 1);
  assert.equal(taskPriority({ status: 'in_progress', overdue: false }), 2);
  assert.equal(taskPriority({ status: 'todo', overdue: false }), 3);
});

test('tour health route validates IDs and returns active-date summaries', async (context) => {
  const express = require('express');
  const { createTourHealthRouter } = require('../tour-health');
  const pool = {
    query: async (sql) => sql.includes('SELECT id,name FROM tours')
      ? { rowCount: 1, rows: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Test tour' }] }
      : { rowCount: 2, rows: [
        { id: '22222222-2222-4222-8222-222222222222', date: '2026-09-01', status: 'confirmed', venue_name: 'Venue', city: 'City', country: 'Country', task_total: 2, task_done: 1, outstanding: [{ title: 'Todo', status: 'todo', overdue: false }], recent_updates: 1 },
        { id: '33333333-3333-4333-8333-333333333333', date: '2026-09-02', status: 'cancelled', task_total: 1, task_done: 1, outstanding: [], recent_updates: 0 },
      ] },
  };
  const app = express();
  app.use((req, _res, next) => { req.entityId = '44444444-4444-4444-8444-444444444444'; next(); });
  app.use('/api', createTourHealthRouter(pool));
  const server = app.listen(0);
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/tours`;

  const invalid = await fetch(`${base}/invalid/health`);
  assert.equal(invalid.status, 400);

  const response = await fetch(`${base}/11111111-1111-4111-8111-111111111111/health`);
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.deepEqual(health.summary, { activeDates: 1, cancelledDates: 1, roadReady: 0, needAttention: 1, datesWithUpdates: 1 });
  assert.equal(health.shows[0].readiness, 50);
  assert.equal(health.shows[1].readiness, 100);
});

test('tour health UI exposes exact missing tasks and direct repair links', () => {
  const component = read('src/components/tours/TourHealth.tsx');
  const tour = read('src/app/tours/[id]/page.tsx');
  const checklist = read('src/components/shows/AdvanceChecklist.tsx');
  const proxy = read('src/app/api/tours/[id]/health/route.ts');
  assert.match(component, /What needs attention/);
  assert.match(component, /task\.title/);
  assert.match(component, /Blocked/);
  assert.match(component, /Overdue/);
  assert.match(component, /#advancing/);
  assert.match(tour, /<TourHealth/);
  assert.match(checklist, /id="advancing"/);
  assert.match(proxy, /daySheetProxy/);
});
