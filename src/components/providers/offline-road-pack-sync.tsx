'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { lastRoadPackSync, markRoadPackSynced, saveOfflineShow } from '@/lib/offline-road-pack';
import { useProfileStore } from '@/store/useProfileStore';
import type { Show } from '@/types/show';

const MAX_AUTOMATIC_SHEETS = 12;
const FORWARD_DAYS = 45;
const MIN_SYNC_INTERVAL_MS = 15 * 60 * 1000;

function showsFrom(data: unknown): Show[] {
  if (Array.isArray(data)) return data as Show[];
  if (data && typeof data === 'object' && Array.isArray((data as { shows?: unknown }).shows)) return (data as { shows: Show[] }).shows;
  return [];
}

export function OfflineRoadPackSync({ online }: { online: boolean }) {
  const { data: session, status } = useSession();
  const entityId = useProfileStore((state) => state.activeProfile?.id);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!online || status !== 'authenticated' || !userId || !entityId) return;
    const previousSync = lastRoadPackSync(entityId, userId);
    if (previousSync && Date.now() - new Date(previousSync).getTime() < MIN_SYNC_INTERVAL_MS) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const headers = { 'X-Entity-Id': entityId };
        const response = await fetch('/api/shows', { headers, cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() + FORWARD_DAYS);
        const upcoming = showsFrom(await response.json())
          .filter((show) => {
            const date = new Date(`${show.showDate?.slice(0, 10)}T12:00:00`);
            return show.status !== 'cancelled' && !Number.isNaN(date.getTime()) && date >= today && date <= cutoff;
          })
          .sort((left, right) => left.showDate.localeCompare(right.showDate))
          .slice(0, MAX_AUTOMATIC_SHEETS);

        await Promise.allSettled(upcoming.map(async (summary) => {
          const detail = await fetch(`/api/shows/${encodeURIComponent(summary.id)}`, { headers, cache: 'no-store', signal: controller.signal });
          if (!detail.ok) return;
          const data = await detail.json();
          const show = (data.show ?? data) as Show;
          const external = Boolean(data.externalCollaborator);
          const financialVisible = !external || data.permissions?.financialAccess !== 'hidden';
          saveOfflineShow(show, entityId, userId, financialVisible, 'automatic');
        }));
        if (!controller.signal.aborted) markRoadPackSynced(entityId, userId);
      } catch {
        // The current saved road pack remains intact after a transient failure.
      }
    })();
    return () => controller.abort();
  }, [entityId, online, session?.user?.id, status]);

  return null;
}
