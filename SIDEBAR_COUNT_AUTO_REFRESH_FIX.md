# Sidebar Count Auto-Refresh Fix

## Problem
When deleting tours or shows, the sidebar counts (tour count and show count) didn't update automatically. Users had to refresh the page manually to see the updated counts.

## Solution Implemented

### 1. Created Refresh Store
**File:** `src/store/useCountRefreshStore.ts`

A Zustand store that manages refresh triggers for tours and shows:
```typescript
{
  tourRefreshTrigger: number;
  showRefreshTrigger: number;
  refreshTours: () => void;
  refreshShows: () => void;
}
```

### 2. Updated Count Hooks
**Files:**
- `src/hooks/useTourCount.ts`
- `src/hooks/useShowCount.ts`

Both hooks now:
- Subscribe to their respective refresh triggers
- Re-fetch counts when triggers change
- Still poll every 30 seconds as backup

### 3. Added Refresh Calls to Delete/Create Actions

**Tour Deletions:**
- `src/app/tours/page.tsx` - Tour list delete
- `src/app/tours/[id]/page.tsx` - Tour details delete

**Show Deletions:**
- `src/components/shows/CalendarEventModal.tsx` - Calendar event delete

**Import Success:**
- `src/app/import/components/Step4Summary.tsx` - After successful import

## How It Works

1. User deletes a tour/show
2. Delete function calls `refreshTours()` and/or `refreshShows()`
3. Store increments the refresh trigger
4. Hooks detect the trigger change and re-fetch counts
5. Sidebar updates immediately ✨

## Benefits

- ✅ Instant sidebar updates (no manual refresh needed)
- ✅ Works for both tours and shows
- ✅ Updates after import, create, and delete
- ✅ Maintains 30-second polling as backup
- ✅ Centralized refresh logic

## Testing

1. **Delete a tour:**
   - Go to Tours page
   - Delete a tour
   - ✅ Sidebar tour count should decrease immediately

2. **Delete a show:**
   - Go to Shows/Calendar
   - Delete a calendar event
   - ✅ Sidebar show count should decrease immediately

3. **Import shows:**
   - Complete an import
   - ✅ Both counts should update immediately

4. **Create a tour:**
   - Create a new tour
   - ✅ Tour count should increase immediately

## Files Modified

- ✅ `src/store/useCountRefreshStore.ts` (created)
- ✅ `src/hooks/useTourCount.ts`
- ✅ `src/hooks/useShowCount.ts`
- ✅ `src/app/tours/page.tsx`
- ✅ `src/app/tours/[id]/page.tsx`
- ✅ `src/components/shows/CalendarEventModal.tsx`
- ✅ `src/app/import/components/Step4Summary.tsx`

---
**Status:** ✅ Complete - Sidebar counts now refresh automatically!
