import type { Show } from '@/types/show';

const PREFIX = 'scenegen:road-pack:v1';
const SYNC_PREFIX = 'scenegen:road-pack-sync:v1';

export type OfflineShowSnapshot = {
  show: Show;
  entityId: string;
  userId: string;
  financialVisible: boolean;
  savedAt: string;
  source?: 'automatic' | 'manual';
};

const key = (showId: string, entityId: string, userId: string) => `${PREFIX}:${userId}:${entityId}:${showId}`;

export function saveOfflineShow(show: Show, entityId: string, userId: string, financialVisible: boolean, source: 'automatic' | 'manual' = 'manual'): OfflineShowSnapshot | null {
  if (typeof window === 'undefined' || !show.id || !entityId || !userId) return null;
  const offlineShow = financialVisible ? show : ({
    ...show,
    guarantee: undefined,
    currency: undefined,
    dealType: undefined,
    ticketPrice: undefined,
    isPaid: undefined,
  } as unknown as Show);
  const existing = loadOfflineShow(show.id, entityId, userId);
  const snapshot = { show: offlineShow, entityId, userId, financialVisible, savedAt: new Date().toISOString(), source: existing?.source === 'manual' ? 'manual' : source } satisfies OfflineShowSnapshot;
  try {
    window.localStorage.setItem(key(show.id, entityId, userId), JSON.stringify(snapshot));
    return snapshot;
  } catch {
    return null;
  }
}

export function listOfflineShows(entityId: string, userId: string): OfflineShowSnapshot[] {
  if (typeof window === 'undefined' || !entityId || !userId) return [];
  const prefix = `${PREFIX}:${userId}:${entityId}:`;
  const snapshots: OfflineShowSnapshot[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index);
    if (!storageKey?.startsWith(prefix)) continue;
    const showId = storageKey.slice(prefix.length);
    const snapshot = loadOfflineShow(showId, entityId, userId);
    if (snapshot) snapshots.push(snapshot);
  }
  return snapshots.sort((left, right) => String(left.show.showDate).localeCompare(String(right.show.showDate)));
}

export function offlineIdentity(): { entityId: string; userId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(window.localStorage.getItem('profile-storage') || 'null');
    const entityId = stored?.state?.activeProfile?.id;
    const userId = stored?.state?.ownerUserId;
    return entityId && userId ? { entityId, userId } : null;
  } catch {
    return null;
  }
}

export function lastRoadPackSync(entityId: string, userId: string) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(`${SYNC_PREFIX}:${userId}:${entityId}`);
}

export function markRoadPackSynced(entityId: string, userId: string) {
  if (typeof window === 'undefined') return null;
  const syncedAt = new Date().toISOString();
  window.localStorage.setItem(`${SYNC_PREFIX}:${userId}:${entityId}`, syncedAt);
  window.dispatchEvent(new CustomEvent('scenegen:road-pack-updated'));
  return syncedAt;
}

export function loadOfflineShow(showId: string, entityId: string, userId: string): OfflineShowSnapshot | null {
  if (typeof window === 'undefined' || !showId || !entityId || !userId) return null;
  try {
    const raw = window.localStorage.getItem(key(showId, entityId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OfflineShowSnapshot>;
    if (!parsed.show || parsed.show.id !== showId || parsed.entityId !== entityId || parsed.userId !== userId || typeof parsed.financialVisible !== 'boolean' || typeof parsed.savedAt !== 'string') return null;
    return parsed as OfflineShowSnapshot;
  } catch {
    return null;
  }
}

export function removeOfflineShow(showId: string, entityId: string, userId: string) {
  if (typeof window === 'undefined' || !showId || !entityId || !userId) return;
  window.localStorage.removeItem(key(showId, entityId, userId));
}

export async function clearOfflineDataForUser(userId: string) {
  if (typeof window === 'undefined' || !userId) return;
  const matching: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index);
    if (storageKey?.startsWith(`${PREFIX}:${userId}:`) || storageKey?.startsWith(`${SYNC_PREFIX}:${userId}:`)) matching.push(storageKey);
  }
  matching.forEach((storageKey) => window.localStorage.removeItem(storageKey));
  window.localStorage.removeItem('profile-storage');
}

export async function clearRevokedDaySheetData(userId: string) {
  if (typeof window === 'undefined' || !userId) return;
  const matching: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index);
    if (storageKey?.startsWith(`${PREFIX}:${userId}:`) || storageKey?.startsWith(`${SYNC_PREFIX}:${userId}:`)) matching.push(storageKey);
  }
  matching.forEach((storageKey) => window.localStorage.removeItem(storageKey));
  if ('caches' in window) {
    const names = await window.caches.keys().catch(() => []);
    await Promise.all(names.map(async (name) => {
      const cache = await window.caches.open(name);
      const requests = await cache.keys();
      await Promise.all(requests.filter((request) => {
        const pathname = new URL(request.url).pathname;
        return pathname.startsWith('/external-day-sheets') || pathname.startsWith('/api/collaborator/');
      }).map((request) => cache.delete(request)));
    }));
  }
  window.dispatchEvent(new CustomEvent('scenegen:road-pack-updated'));
}
