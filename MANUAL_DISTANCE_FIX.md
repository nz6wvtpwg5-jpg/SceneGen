# 🎯 IMMEDIATE FIX - Manual Distance Calculation

**Date:** March 29, 2026, 8:15 AM
**Status:** Backend endpoint ready, needs testing

---

## ⚡ QUICKEST FIX - Run SQL Manually

Since the automatic calculation is having issues, here's how to **manually set distances** for your current tour:

### Your Tour Shows (in order by date):
1. **Lexington, KY** (Mar 30) - First show, distance = 0
2. **Atlanta, GA** (Apr 1) - ~320 miles from Lexington
3. **Orlando, FL** (Apr 2) - ~440 miles from Atlanta

### SQL Commands

```sql
-- Connect to database
psql -U scenegen_user -d scenegen_db

-- Find your budgets
SELECT
  b.id,
  b.budget_name,
  b.distance,
  s.city,
  s.date
FROM budgets b
JOIN shows s ON b.show_id = s.id
WHERE b.tour_id = 'ed87e9cc-4f20-4430-98d7-2669513c849f'
ORDER BY s.date;

-- Set distances (update these IDs with the actual IDs from above query)
UPDATE budgets SET distance = 0 WHERE budget_name = 'Lexington KY - 30/03/2026';
UPDATE budgets SET distance = 320 WHERE budget_name = 'Atlants GA - 01/04/2026';
UPDATE budgets SET distance = 440 WHERE budget_name = 'Orlando FL - 02/04/2026';

-- Verify
SELECT
  b.budget_name,
  b.distance,
  s.city
FROM budgets b
JOIN shows s ON b.show_id = s.id
WHERE b.tour_id = 'ed87e9cc-4f20-4430-98d7-2669513c849f'
ORDER BY s.date;
```

After running these commands, **refresh the Tours page** and you should see **760 miles** total!

---

## 🔧 WHY THE AUTO-CALCULATION ISN'T WORKING YET

### Issue 1: Frontend API Route
- Created `/api/tours/[id]/calculate-distances/route.ts`
- Next.js wasn't picking it up (404 error)

### Issue 2: Direct Backend Call
- Updated Step4Summary to call backend directly
- Should work now, but frontend needs restart

### Issue 3: Google Maps API Key
- Endpoint exists and is correct
- Might need API key configured

---

## ✅ WHAT'S FIXED

### Backend Endpoint Ready
**File:** `backend/server.js` (lines 3256-3350)
```javascript
app.post('/api/tours/:id/calculate-distances', authMiddleware, async (req, res) => {
  // Gets shows sorted by date
  // Calculates distance between consecutive shows
  // Updates budget.distance field
  // Returns count of distances calculated
});
```

### Frontend Updated
**File:** `src/app/import/components/Step4Summary.tsx`
```typescript
// Now calls backend directly
const backendUrl = 'http://localhost:5001';
fetch(`${backendUrl}/api/tours/${tourId}/calculate-distances`, {...});
```

---

## 🧪 TEST THE ENDPOINT

### Option 1: Browser Console
Paste this in console on any logged-in page:

```javascript
const tourId = 'ed87e9cc-4f20-4430-98d7-2669513c849f';
const token = sessionStorage.getItem('token') || localStorage.getItem('access_token');
const entityId = localStorage.getItem('entity_id');

fetch(`http://localhost:5001/api/tours/${tourId}/calculate-distances`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Entity-Id': entityId
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Result:', data);
  // Refresh page to see updated miles
  setTimeout(() => location.reload(), 2000);
});
```

### Option 2: Use curl (Need Token)
```bash
# Get your token from browser first
TOKEN="your_access_token_here"
ENTITY_ID="your_entity_id_here"
TOUR_ID="ed87e9cc-4f20-4430-98d7-2669513c849f"

curl -X POST "http://localhost:5001/api/tours/$TOUR_ID/calculate-distances" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Entity-Id: $ENTITY_ID"
```

---

## 🚀 RESTART & TEST

### 1. Restart Frontend
```bash
# Kill current frontend
pkill -f "next dev"

# Start fresh
cd /Users/jon/Desktop/scenegen/SceneGenUIV2
npm run dev
```

### 2. Import Fresh Tour
- Go to http://localhost:3000/tours
- Delete all tours
- Go to http://localhost:3000/import
- Upload CSV and import
- **Watch console for**: `🗺️  Calculating distances for tour:`
- **Check backend logs**: Should see distance calculations

### 3. Verify
- Tours page should show miles
- Backend logs should show:
  ```
  🗺️  Calculating distances for tour: ...
  📍 Found 3 shows, calculating 2 distances...
     ✅ Lexington → Atlanta: 320 miles
     ✅ Atlanta → Orlando: 440 miles
  ✅ Calculated and saved 2 distances
  ```

---

## ❌ IF STILL NOT WORKING

### Check These:

**1. Google Maps API Key**
```bash
cd backend
grep GOOGLE_MAPS_API_KEY .env
```
Should show your API key. If not, add it:
```
GOOGLE_MAPS_API_KEY=your_key_here
```

**2. Shows Have Coordinates**
```sql
SELECT city, venue_lat, venue_lng
FROM shows
WHERE tour_id = 'ed87e9cc-4f20-4430-98d7-2669513c849f'
ORDER BY date;
```
All shows should have lat/lng values.

**3. Backend Logs**
```bash
tail -f backend.log
```
Look for errors during distance calculation.

---

## 💡 MANUAL DISTANCE CALCULATION

If automatic fails, use this Node.js script:

```javascript
// calculate-distances-manual.js
const fetch = require('node-fetch'); // or use Node 18+ built-in fetch

async function calculateDistance(lat1, lng1, lat2, lng2) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat1},${lng1}&destinations=${lat2},${lng2}&units=imperial&key=YOUR_API_KEY`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.rows?.[0]?.elements?.[0]?.distance) {
    const meters = data.rows[0].elements[0].distance.value;
    const miles = meters / 1609.34;
    return Math.round(miles);
  }

  return 0;
}

// Your shows
const shows = [
  { city: 'Lexington', lat: 38.055045, lng: -84.498314 },
  { city: 'Atlanta', lat: 33.7399098, lng: -84.3452619 },
  { city: 'Orlando', lat: 28.5581468, lng: -81.3788513 },
];

// Calculate
for (let i = 1; i < shows.length; i++) {
  const prev = shows[i - 1];
  const curr = shows[i];
  const distance = await calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
  console.log(`${prev.city} → ${curr.city}: ${distance} miles`);
}
```

---

## 📝 SUMMARY

### To Get Miles Showing NOW:
1. **Use SQL** (above) to manually set distances
2. Refresh Tours page
3. Should see miles!

### To Get Auto-Calculation Working:
1. Restart frontend (`pkill -f "next dev" && npm run dev`)
2. Delete and re-import tour
3. Check console and backend logs
4. Verify Google Maps API key is set

### If All Else Fails:
- Use manual SQL updates
- Or use Node.js script to calculate
- Or manually input miles based on Google Maps

---

**Current Status:** Backend ready, frontend updated, needs testing

**Expected Result:** Tours page shows actual miles (not 0)

**Last Updated:** March 29, 2026, 8:20 AM PST
