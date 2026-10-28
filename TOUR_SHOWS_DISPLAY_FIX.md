# Tour Shows Display Fix

## Problem
The Tours feature showed "1" tour in the sidebar, but clicking "View Details" displayed no shows, even though:
- The tour existed in the database ("HPS Feb 2026", Feb 27-28, 2026)
- Shows existed in the database with dates that fell within the tour date range
- The backend API was connected to NeonDB correctly

## Root Causes

### 1. **Shows Not Linked to Tour**
- **Issue**: All shows in the database had `tour_id = NULL`
- **Impact**: The `/api/shows?tourId=...` endpoint returned empty results because no shows were associated with the tour
- **Why**: Shows were created without linking them to a tour

### 2. **Backend-Frontend Field Name Mismatch**
- **Issue**: Backend returned snake_case field names, but frontend expected camelCase
- **Backend** (database): `date`, `start_time`, `venue_name`, `city`, `state`
- **Frontend** (Show type): `showDate`, `showTime`, `venueName`, `venueCity`, `venueState`
- **Impact**: Even if shows were returned, the frontend couldn't display them correctly

## Solutions Implemented

### 1. **Linked Shows to Tour** (Database Fix)
Created `/backend/link-shows-to-tour.js` script to:
- Find the "HPS Feb 2026" tour (ID: `b1cb1831-734e-4018-8d9d-a667f5acba7d`)
- Match shows with dates within the tour's date range (Feb 27-28, 2026)
- Update shows to set `tour_id = 'b1cb1831-734e-4018-8d9d-a667f5acba7d'`

**Result**: 2 shows linked to the tour:
- Burgerweeshuis, Deventer, Netherlands (Feb 27, 2026)
- Rue Dieudonné Lefèvre 4, Belgium (Feb 28, 2026)

### 2. **Added Field Name Transformation** (Backend API Fix)
Updated `/backend/server.js`:

**Added helper function**:
```javascript
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = value;
  }
  return converted;
}
```

**Updated GET /api/shows endpoint** to transform and map fields:
```javascript
// Transform snake_case to camelCase and map to frontend field names
const shows = result.rows.map(show => {
  const camelShow = toCamelCase(show);
  return {
    ...camelShow,
    showDate: camelShow.date,
    showTime: camelShow.startTime,
    venueCity: camelShow.city,
    doorsTime: camelShow.doorTime,
    setLength: '00:45:00', // Default value
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
```

## Verification

### Before Fix:
```bash
curl "http://localhost:3001/api/shows?tourId=b1cb1831-734e-4018-8d9d-a667f5acba7d&entityId=..."
# Returns: {"shows": [], "total": 0}
```

### After Fix:
```bash
curl "http://localhost:3001/api/shows?tourId=b1cb1831-734e-4018-8d9d-a667f5acba7d&entityId=1f60064e-3dc6-4612-a5c4-2be834806277"
# Returns: {"shows": [{ showDate: "2026-02-27", venueName: "Burgerweeshuis", ... }, ...], "total": 2}
```

### Database Verification:
```sql
SELECT tour_id, COUNT(*) FROM shows GROUP BY tour_id;
-- tour_id: b1cb1831-734e-4018-8d9d-a667f5acba7d | count: 2
-- tour_id: null | count: 1
```

## Files Changed
1. `/backend/server.js` - Added `toCamelCase()` helper and field mapping in GET /api/shows
2. `/backend/link-shows-to-tour.js` - Script to link existing shows to the tour (run once)
3. `/backend/check-tour-shows.js` - Diagnostic script to verify database state

## Testing Steps
1. Navigate to Tours page (`/tours`)
2. Verify tour list shows "HPS Feb 2026" tour
3. Click "View Details" on the tour
4. Verify 2 shows are displayed:
   - Burgerweeshuis, Deventer, Netherlands (Feb 27, 2026)
   - Rue Dieudonné Lefèvre 4, Belgium (Feb 28, 2026)
5. Verify show details display correctly (venue, date, time, location)

## Future Improvements
1. **Auto-link shows to tours**: When creating a show with a `tourId`, ensure the show is properly linked
2. **Show creation UI**: Add tour selection dropdown when creating shows
3. **Validation**: Prevent creating shows with dates outside the tour date range
4. **Admin tools**: Add UI to link/unlink shows to/from tours
5. **Orphaned shows**: Handle shows with `tour_id = null` (display as "Standalone Shows")

## Database Schema Notes
- **tours table**: `id`, `entity_id`, `name`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`
- **shows table**: `id`, `entity_id`, `tour_id` (FK to tours.id), `venue_name`, `date`, `start_time`, etc.
- **Relationship**: A tour can have many shows (one-to-many)
- **Constraint**: Shows should have dates within the tour's `start_date` and `end_date` range

## Status
✅ **FIXED** - Tours now correctly display their associated shows with proper field mapping.

## Additional Fix
⚠️ **Note**: A follow-up issue was discovered where the tour details page showed "Invalid Date - Invalid Date" instead of the tour's date range. This was because the GET `/api/tours/:id` endpoint was not transforming `start_date` and `end_date` to camelCase. This has been fixed in `TOUR_INVALID_DATE_DISPLAY_FIX.md`.
