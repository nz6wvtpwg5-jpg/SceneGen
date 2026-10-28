# Tour Details Invalid Date Fix - Frontend Hook Issue

## Problem
Even after fixing the backend to return camelCase fields (`startDate`, `endDate`), the tour details page still displayed "Invalid Date - Invalid Date" while the tour list page showed the correct dates.

## Root Cause
**Frontend Hook Not Extracting Nested Tour Object**

The backend GET `/api/tours/:id` endpoint returns:
```json
{
  "tour": {
    "id": "...",
    "startDate": "2026-02-27T00:00:00.000Z",
    "endDate": "2026-02-28T00:00:00.000Z",
    ...
  }
}
```

But the `fetchTour` function in `/src/hooks/useTours.ts` was returning the entire response object instead of extracting the `tour` property:

```typescript
// BEFORE (WRONG)
const response = await fetch(`/api/tours/${tourId}`, {
  credentials: 'include',
  headers,
});
if (!response.ok) {
  throw new Error('Failed to fetch tour');
}
return await response.json(); // Returns { tour: {...} }
```

This meant the frontend received:
```javascript
tour = {
  tour: {
    startDate: "2026-02-27T00:00:00.000Z",
    endDate: "2026-02-28T00:00:00.000Z"
  }
}
```

When the component tried to access `tour.startDate`, it was actually accessing `undefined` (should have been `tour.tour.startDate`), causing "Invalid Date".

## Why Tour List Worked
The tour list endpoint GET `/api/tours` returns:
```json
{
  "tours": [...],
  "total": 1
}
```

And `fetchTours` correctly extracts the `tours` array, so the list page worked fine.

## Solution
Updated `/src/hooks/useTours.ts` to extract the `tour` object from the response:

```typescript
// AFTER (CORRECT)
const response = await fetch(`/api/tours/${tourId}`, {
  credentials: 'include',
  headers,
});
if (!response.ok) {
  throw new Error('Failed to fetch tour');
}
const data = await response.json();
console.log('🔍 [useTours] Fetched tour data:', data);
console.log('🔍 [useTours] Tour object:', data.tour);
console.log('🔍 [useTours] Tour dates:', { startDate: data.tour?.startDate, endDate: data.tour?.endDate });
return data.tour; // Extract tour object from response ✅
```

## Verification

### Before Fix:
```javascript
// Component receives:
tour = { tour: { startDate: "...", endDate: "..." } }

// Component tries to access:
tour.startDate // undefined ❌
tour.endDate   // undefined ❌

// Result:
new Date(undefined) → "Invalid Date"
```

### After Fix:
```javascript
// Component receives:
tour = { startDate: "2026-02-27T00:00:00.000Z", endDate: "2026-02-28T00:00:00.000Z" }

// Component accesses:
tour.startDate // "2026-02-27T00:00:00.000Z" ✅
tour.endDate   // "2026-02-28T00:00:00.000Z" ✅

// Result:
new Date("2026-02-27T00:00:00.000Z").toLocaleDateString() → "2/27/2026"
```

## Files Changed
1. `/src/hooks/useTours.ts` - Fixed `fetchTour` to extract `data.tour` from response
2. Added console logging to help debug in the future

## Testing Steps
1. Navigate to Tours page (`/tours`)
2. Verify tour list shows "HPS Feb 2026" with "27/02/2026 - 28/02/2026"
3. Click "View Details" on the tour
4. Verify tour details page header shows "HPS Feb 2026" with "2/27/2026 - 2/28/2026" (NOT "Invalid Date")
5. Open browser console and verify logs show correct dates

## Related Fixes
This is the third fix in the tour display saga:
1. **TOUR_SHOWS_DISPLAY_FIX.md** - Linked shows to tour in database, added camelCase to shows endpoint
2. **TOUR_INVALID_DATE_DISPLAY_FIX.md** - Added camelCase transformation to tour endpoint
3. **This fix** - Frontend hook now correctly extracts nested tour object from API response

## Status
✅ **FIXED** - Tour details page now correctly displays the date range by properly extracting the tour object from the API response.
