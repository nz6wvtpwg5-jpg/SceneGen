# 🎯 ROOT CAUSE FOUND - Column Name Mismatch

## The Real Problem
The distance calculation was **reaching the backend successfully** but calculating **0 distances** because of a **database column name mismatch**.

### The Evidence
Your console logs showed:
```
✅ Distance calculation complete: {success: true, message: 'Calculated 0 distances', distancesCalculated: 0}
```

This means:
- ✅ Frontend → Next.js API route: **WORKING**
- ✅ Next.js API route → Backend: **WORKING**
- ✅ Backend endpoint executing: **WORKING**
- ❌ Backend finding coordinates: **FAILING**

## Root Cause: Wrong Column Names

### Shows Table Has:
```sql
CREATE TABLE shows (
  ...
  latitude DECIMAL,
  longitude DECIMAL,
  ...
)
```

### Backend Query Was Looking For:
```javascript
// WRONG ❌
SELECT id, date, city, venue_name, venue_lat, venue_lng
FROM shows
WHERE tour_id = $1 AND entity_id = $2
```

### Result:
- Shows were found, but `venue_lat` and `venue_lng` were **NULL**
- Backend code checked: `if (!prevShow.venue_lat || !prevShow.venue_lng)`
- This always evaluated to TRUE (coordinates missing)
- Loop continued without calculating any distances
- Returned: `distancesCalculated: 0`

## The Fix

### Updated Backend Query:
```javascript
// CORRECT ✅
SELECT id, date, city, venue_name, latitude, longitude
FROM shows
WHERE tour_id = $1 AND entity_id = $2
```

### Updated Coordinate Check:
```javascript
// CORRECT ✅
if (!prevShow.latitude || !prevShow.longitude || !currShow.latitude || !currShow.longitude) {
  console.log(`   ⚠️  Missing coordinates: ${prevShow.city} → ${currShow.city}`);
  continue;
}

// Use correct column names
const origin = `${prevShow.latitude},${prevShow.longitude}`;
const destination = `${currShow.latitude},${currShow.longitude}`;
```

## Changes Made
**File:** `backend/server.js`

1. Line ~3357: Changed SELECT to use `latitude, longitude`
2. Line ~3385: Changed coordinate check to use `latitude, longitude`
3. Line ~3391-3392: Changed Google Maps API params to use `latitude, longitude`

## Testing Steps

### After Backend Restart:
1. **Refresh browser** (Cmd+Shift+R)
2. **Add another show** to Tour Mar 2026
3. **Watch browser console** for:
   ```
   ✅ Distance calculation complete: {success: true, distancesCalculated: 1}
   ```
   (Should show distancesCalculated > 0 now!)

4. **Check tour page** - mileage should update!

### Expected Backend Logs:
```
🗺️  Calculating distances for tour: [tourId]
📍 Found 28 shows, calculating 27 distances...
   ✅ Greensboro NC → Asheville NC: 172 miles
✅ Calculated and saved 27 distances
```

## Why This Happened
The shows table schema uses standard `latitude`/`longitude` column names, but the distance calculation code was written with different column names (`venue_lat`/`venue_lng`). This type of mismatch is common when different parts of the codebase are written at different times without consistent naming conventions.

## Files Changed
- ✅ `backend/server.js` (calculate-distances endpoint)

## Services Restarted
- ✅ Backend server (port 3001)

## Status
- ✅ Column names fixed
- ✅ Backend restarted
- ⏳ **Ready to test - add a show now!**
