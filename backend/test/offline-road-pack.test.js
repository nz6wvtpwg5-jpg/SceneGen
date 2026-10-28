const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('service worker caches app surfaces but never private APIs or collaborator portals', () => {
  const worker = read('public/sw.js');
  assert.match(worker, /scenegen-road-pack-v2/);
  assert.match(worker, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(worker, /external-day-sheets/);
  assert.match(worker, /day-sheet-invite/);
  assert.match(worker, /request\.mode === 'navigate'/);
  assert.match(worker, /'\/offline\/day-sheet'/);
  assert.match(worker, /caches\.match\(url\.pathname\)/);
  assert.match(worker, /url\.pathname\.startsWith\('\/_next\/static\/'\)/);
  assert.doesNotMatch(worker, /cache\.put\(request.*request\.mode === 'navigate'/s);
});

test('offline show snapshots remain user and entity scoped', () => {
  const storage = read('src/lib/offline-road-pack.ts');
  const page = read('src/app/shows/[id]/page.tsx');
  assert.match(storage, /scenegen:road-pack:v1/);
  assert.match(storage, /entityId/);
  assert.match(storage, /userId/);
  assert.match(storage, /parsed\.show\.id !== showId/);
  assert.match(storage, /parsed\.userId !== userId/);
  assert.match(storage, /offlineIdentity/);
  assert.match(storage, /ownerUserId/);
  assert.match(storage, /listOfflineShows/);
  assert.match(page, /saveOfflineShow/);
  assert.match(page, /setAccessLevel\('viewer'\)/);
  assert.match(page, /!offlineCopy && accessLevel !== "viewer"/);
  assert.match(page, /catch \(caught\).*loadSavedCopy\(\)/s);
  assert.match(page, /if \(!response\.ok\) throw new Error/);
});

test('upcoming day sheets are prepared automatically with bounded background work', () => {
  const sync = read('src/components/providers/offline-road-pack-sync.tsx');
  const provider = read('src/components/providers/offline-provider.tsx');
  assert.match(sync, /MAX_AUTOMATIC_SHEETS = 12/);
  assert.match(sync, /FORWARD_DAYS = 45/);
  assert.match(sync, /MIN_SYNC_INTERVAL_MS = 15 \* 60 \* 1000/);
  assert.match(sync, /show\.status !== 'cancelled'/);
  assert.match(sync, /saveOfflineShow\(show, entityId, userId, financialVisible, 'automatic'\)/);
  assert.match(sync, /Promise\.allSettled/);
  assert.match(sync, /controller\.abort\(\)/);
  assert.match(provider, /<OfflineRoadPackSync online=\{online\} \/>/);
});

test('saved day sheets have a dedicated read-only viewer with stale-data warnings', () => {
  const viewer = read('src/app/offline/day-sheet/page.tsx');
  const index = read('src/app/offline/page.tsx');
  const mobile = read('src/components/shows/mobile-day-sheet.tsx');
  assert.match(viewer, /Saved copy — not live/);
  assert.match(viewer, /loadOfflineShow/);
  assert.doesNotMatch(viewer, /method:\s*['"](?:POST|PATCH|PUT|DELETE)/);
  assert.match(index, /listOfflineShows/);
  assert.match(index, /\/offline\/day-sheet\?showId=/);
  assert.match(mobile, /Times and locations may have changed/);
  assert.match(mobile, /onRefreshOffline/);
});

test('a failed offline session check does not erase the saved workspace identity', () => {
  const guard = read('src/components/providers/session-provider-wrapper.tsx');
  assert.match(guard, /!online && status === 'unauthenticated' && savedUserId/);
  assert.match(guard, /setPreparedIdentity\(savedUserId\)/);
  assert.match(guard, /!online \? storedUserId : null/);
  assert.match(guard, /window\.addEventListener\('online', update\)/);
});

test('offline state is visible and the PWA starts at the live desk', () => {
  const provider = read('src/components/providers/offline-provider.tsx');
  const manifest = read('src/app/manifest.ts');
  assert.match(provider, /navigator\.serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(provider, /Offline — showing saved information/);
  assert.match(manifest, /start_url: '\/dashboard'/);
  assert.match(manifest, /orientation: 'portrait-primary'/);
});
