# ✅ TOUR COUNT BADGE ADDED TO SIDEBAR

## What Was Missing

The sidebar "Tours" navigation item didn't show a count badge like the "Shows" item does.

## What I Added

### 1. Created `useTourCount` Hook

**File:** `/src/hooks/useTourCount.ts`

Similar to `useShowCount`, this hook:
- ✅ Fetches tours from `/api/tours`
- ✅ Counts total number of tours
- ✅ Refreshes every 30 seconds
- ✅ Includes entity ID in headers
- ✅ Handles loading and error states

```typescript
export function useTourCount() {
  const { count, isLoading } = useTourCount();
  // Returns count of tours for current entity
}
```

### 2. Updated Sidebar Config

**File:** `/src/app/config.tsx`

**Changes:**
1. Imported `useTourCount` hook
2. Called `useTourCount()` to get tour count
3. Added `badge` property to Tours nav item

**Before:**
```tsx
{
  name: 'Tours',
  href: '/tours',
  icon: <Map size={20} />,
  active: isNavItemActive(pathname, '/tours'),
  position: 'top',
}
```

**After:**
```tsx
{
  name: 'Tours',
  href: '/tours',
  icon: <Map size={20} />,
  active: isNavItemActive(pathname, '/tours'),
  position: 'top',
  badge: tourCount > 0 ? tourCount : undefined, // ← THE NEW BADGE!
}
```

## How It Works

1. **On Page Load:**
   - `useTourCount` hook fetches tours from backend
   - Counts total tours for current entity
   - Updates badge count in sidebar

2. **Auto-Refresh:**
   - Count updates every 30 seconds automatically
   - Stays in sync with backend data

3. **Display Logic:**
   - If `tourCount > 0` → Shows badge with number
   - If `tourCount === 0` → No badge displayed
   - Badge appears in both expanded and collapsed sidebar states

## Visual Result

### Expanded Sidebar:
```
🗺️ Tours [1]
```

### Collapsed Sidebar:
```
🗺️ (1)  ← Badge appears as overlay on icon
```

## Files Modified

1. `/src/hooks/useTourCount.ts` - New hook for tour count
2. `/src/app/config.tsx` - Added tour count badge to nav config

## Testing

**Refresh your browser** and check the sidebar:
- ✅ "Tours" should show `[1]` badge (since you have 1 tour)
- ✅ Badge updates when you add/delete tours
- ✅ Badge shows in both expanded and collapsed sidebar
- ✅ Badge refreshes automatically every 30 seconds

---

**Status:** ✅ COMPLETE
**Impact:** Tours nav item now shows count badge like Shows
