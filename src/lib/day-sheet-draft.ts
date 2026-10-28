const PREFIX = 'scenegen:day-sheet-draft:v1';

export type DaySheetDraft<T> = { showId: string; entityId: string; userId: string; baseUpdatedAt: string; savedAt: string; values: T };

function key(showId: string, entityId: string, userId: string) { return `${PREFIX}:${userId}:${entityId}:${showId}`; }

export function saveDaySheetDraft<T>(showId: string, entityId: string, userId: string, baseUpdatedAt: string, values: T) {
  if (typeof window === 'undefined') return null;
  const draft: DaySheetDraft<T> = { showId, entityId, userId, baseUpdatedAt, savedAt: new Date().toISOString(), values };
  try { window.localStorage.setItem(key(showId, entityId, userId), JSON.stringify(draft)); return draft; }
  catch { return null; }
}

export function loadDaySheetDraft<T>(showId: string, entityId: string, userId: string): DaySheetDraft<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const draft = JSON.parse(window.localStorage.getItem(key(showId, entityId, userId)) || 'null') as DaySheetDraft<T> | null;
    return draft?.showId === showId && draft?.entityId === entityId && draft.userId === userId && typeof draft.baseUpdatedAt === 'string' && draft.values ? draft : null;
  } catch { return null; }
}

export function removeDaySheetDraft(showId: string, entityId: string, userId: string) {
  if (typeof window !== 'undefined') window.localStorage.removeItem(key(showId, entityId, userId));
}
