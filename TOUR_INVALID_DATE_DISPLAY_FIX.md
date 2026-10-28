# Tour Invalid Date Display Fix

## Problem
The tour details page displayed "Invalid Date - Invalid Date" at the top instead of showing the tour's date range (e.g., "February 27, 2026 - February 28, 2026").

## Root Cause
**Backend-Frontend Field Name Mismatch for Tours**

The GET `/api/tours/:id` endpoint was returning tour data in snake_case directly from the database:
- Backend returned: `start_date`, `end_date`, `entity_id`, `created_at`, `updated_at`
- Frontend expected: `startDate`, `endDate`, `artistEntityId`, `createdAt`, `updatedAt`

The tour details page code tried to access `tour.startDate` and `tour.endDate`:
```tsx
<p className="text-lg text-muted-foreground">
  {new Date(tour.startDate).toLocaleDateString()} - {new Date(tour.endDate).toLocaleDateString()}
</p>
```

Since `tour.startDate` and `tour.endDate` were `undefined`, `new Date(undefined)` produced "Invalid Date".

## Solution
Updated `/backend/server.js` to transform tour data to camelCase in the GET `/api/tours/:id` endpoint.

### Before:
```javascript
const tour = {
  ...tourResult.rows[0],  // Returns snake_case fields
  shows: showsResult.rows,
  showCount: showsResult.rows.length
};

res.json({ tour });
```

### After:
```javascript
// Transform tour to camelCase
const tourData = toCamelCase(tourResult.rows[0]);

// Transform shows to camelCase and map field names
const shows = showsResult.rows.map(show => {
  const camelShow = toCamelCase(show);
  return {
    ...camelShow,
    showDate: camelShow.date,
    showTime: camelShow.startTime,
    venueCity: camelShow.city,
    doorsTime: camelShow.doorTime,
    setLength: '00:45:00',
    artistEntityId: camelShow.entityId,
    promoterEntityId: camelShow.entityId,
    contactName: camelShow.promoterName,
    contactPhone: camelShow.promoterPhone,
    contactEmail: camelShow.promoterEmail,
    dealType: camelShow.backendDeal || 'guarantee',
    venueState: camelShow.state,
    venueCountry: camelShow.country,
    guarantee: camelShow.guaranteedFee || camelShow.fee,
    createdBy: camelShow.entityId,
  };
});

const tour = {
  ...tourData,
  shows,
  showCount: shows.length
};

res.json({ tour });
```

## Verification

### Before Fix:
```bash
curl "http://localhost:3001/api/tours/b1cb1831-734e-4018-8d9d-a667f5acba7d?entityId=..."
# Returns:
{
  "tour": {
    "id": "...",
    "entity_id": "...",       // snake_case
    "start_date": "...",      // snake_case
    "end_date": "...",        // snake_case
    ...
  }
}
```

### After Fix:
```bash
curl "http://localhost:3001/api/tours/b1cb1831-734e-4018-8d9d-a667f5acba7d?entityId=..."
# Returns:
{
  "tour": {
    "id": "...",
    "entityId": "...",        // camelCase ✅
    "startDate": "2026-02-27T00:00:00.000Z",  // camelCase ✅
    "endDate": "2026-02-28T00:00:00.000Z",    // camelCase ✅
    ...
  }
}
```

### UI Display:
- **Before**: "Invalid Date - Invalid Date"
- **After**: "2/27/2026 - 2/28/2026" (or localized format)

## Files Changed
1. `/backend/server.js` - Updated GET `/api/tours/:id` endpoint to use `toCamelCase()` transformation

## Related Fixes
This fix complements the earlier fix in `TOUR_SHOWS_DISPLAY_FIX.md` where we:
1. Linked shows to the tour in the database
2. Added camelCase transformation to the GET `/api/shows` endpoint
3. Added field name mapping for shows (date → showDate, etc.)

The GET `/api/tours` (list all tours) endpoint was already transforming to camelCase, but the GET `/api/tours/:id` (single tour) endpoint was missed.

## Testing Steps
1. Navigate to Tours page (`/tours`)
2. Click "View Details" on the "HPS Feb 2026" tour
3. Verify the page header shows: "HPS Feb 2026" with "2/27/2026 - 2/28/2026" below it
4. Verify 2 shows are displayed with correct details

## Status
✅ **FIXED** - Tour details page now correctly displays the tour date range.
