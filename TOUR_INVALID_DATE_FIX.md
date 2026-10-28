# Tour Invalid Date Issue - RESOLVED ✅

## Issue
Tours page was displaying "Invalid Date - Invalid Date" for tour dates.

## Root Cause
The backend was returning tour data with **snake_case** field names (`start_date`, `end_date`) from the database, but the frontend TypeScript expected **camelCase** field names (`startDate`, `endDate`).

Additionally, some tours may not have start/end dates if they have no associated shows yet.

## Solution

### 1. Backend Fix (`/backend/server.js`)
Updated the `GET /api/tours` endpoint to transform snake_case database fields to camelCase for the frontend:

```javascript
// Transform snake_case to camelCase for frontend
const tours = result.rows.map(row => ({
  id: row.id,
  artistEntityId: row.entity_id,
  name: row.name,
  notes: row.notes || row.description,
  startDate: row.start_date,       // ← Converted
  endDate: row.end_date,           // ← Converted
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  showCount: row.show_count,
  totalRevenue: row.total_revenue
}));
```

### 2. Frontend Fix (`/src/app/tours/page.tsx`)
Added conditional rendering to handle tours without dates:

```tsx
{tour.startDate && tour.endDate ? (
  <span>
    📅 {new Date(tour.startDate).toLocaleDateString()} - {new Date(tour.endDate).toLocaleDateString()}
  </span>
) : (
  <span className="text-muted-foreground/60">
    📅 No shows scheduled yet
  </span>
)}
```

## Changes Made

### Files Modified
1. **`/backend/server.js`** (line ~636)
   - Added camelCase transformation to tours endpoint
   - Maps database snake_case to frontend camelCase
   - Includes showCount and totalRevenue

2. **`/src/app/tours/page.tsx`** (line ~185)
   - Added null check for startDate and endDate
   - Displays fallback message when dates are missing

### Backend Restart
```bash
pkill -f "node server.js"
cd backend && node server.js
```

## Expected Behavior

### Before Fix
```
HPS Feb 2026
Invalid Date - Invalid Date
```

### After Fix
```
HPS Feb 2026
📅 Feb 1, 2026 - Feb 28, 2026
```

OR if no shows:
```
HPS Feb 2026
📅 No shows scheduled yet
```

## Testing
1. ✅ Backend returns camelCase fields
2. ✅ Frontend receives proper date format
3. ✅ Dates display correctly when present
4. ✅ Graceful fallback when dates are missing
5. ✅ No console errors
6. ✅ TypeScript types match

## Related Issues
This is part of a broader pattern where the backend needs to transform all snake_case database fields to camelCase for the frontend. Other endpoints that may need similar fixes:
- Shows (already done)
- Budgets (already done)
- Entities
- Contacts
- Artists/Promoters

## Prevention
To avoid this issue in the future:
1. Always transform snake_case to camelCase in backend responses
2. Use a consistent transformation function across all endpoints
3. Add TypeScript validation for API responses
4. Test with actual database data (not mocks)

## Status
✅ **RESOLVED** - Tours now display dates correctly or show appropriate fallback message

---
**Last Updated**: March 18, 2026
**Backend Port**: 3001
**Frontend Port**: 3000
