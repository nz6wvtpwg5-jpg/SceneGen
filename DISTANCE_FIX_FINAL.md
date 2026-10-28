# ✅ DISTANCE CALCULATION FIX - FINAL

**Date:** March 29, 2026, 8:15 AM
**Issue:** Distance showing 0 because auto-save bypasses bulk import
**Solution:** Automatic distance calculation after import completes

---

## 🎯 THE PROBLEM

### Why Distances Were 0
Your import uses **auto-save** mode, which saves shows individually as you validate addresses:

```
Step3Validation.tsx:328 ✅ All 3 shows were already auto-saved!
ImportWizard.tsx:84 🎉 Shows already auto-saved - skipping bulk import
```

The distance calculation I added only ran in the **bulk import endpoint** (`/api/import/execute`), which was being skipped!

---

## ✅ THE SOLUTION

### New Endpoint
Created `/api/tours/:id/calculate-distances` that:
1. Gets all shows for a tour (sorted by date)
2. Calculates distance between each consecutive pair
3. Updates the `distance` field in each show's budget
4. Uses Google Maps Distance Matrix API

### Automatic Trigger
Updated `Step4Summary.tsx` to automatically call this endpoint after import completes:
- No user action required
- Runs in background
- Updates distances for all shows

---

## 🚀 HOW TO TEST

### Option 1: Import Fresh Tour (Recommended)

1. **Delete Current Tour**
   - Go to http://localhost:3000/tours
   - Delete "Tour Mar 2026"

2. **Re-import CSV**
   - Go to http://localhost:3000/import
   - Upload your CSV
   - Complete import normally

3. **Verify**
   - After import completes, wait 2-3 seconds
   - Go to `/tours`
   - Check "Total Miles" column - should show miles!

### Option 2: Calculate for Existing Tour

Call the endpoint manually for your current tour:

```bash
# Get your access token and entity ID from browser localStorage
# Then run:

curl -X POST http://localhost:3000/api/tours/e37b0b98-4458-4258-be14-4c237baa796c/calculate-distances \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Entity-Id: YOUR_ENTITY_ID"
```

Or use browser console on any page:
```javascript
fetch('/api/tours/e37b0b98-4458-4258-be14-4c237baa796c/calculate-distances', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    'X-Entity-Id': localStorage.getItem('entity_id')
  }
}).then(r => r.json()).then(console.log);
```

---

## 📊 EXPECTED RESULTS

### Backend Logs
```
🗺️  Calculating distances for tour: e37b0b98-...
📍 Found 3 shows, calculating 2 distances...
   ✅ Lexington → Atlanta: 324 miles
   ✅ Atlanta → Orlando: 436 miles
✅ Calculated and saved 2 distances
```

### Frontend Console
```
🗺️  Calculating distances for tour: e37b0b98-...
✅ Distances calculated: {success: true, distancesCalculated: 2}
```

### Tours Page
```
Tour Mar 2026
──────────────────────────
Shows: 3
Total Fees: $15,600.88
Total Costs: $27,704.09
Profit: -$12,103.21
Total Miles: 760 mi  ← Should show actual miles!
```

---

## 🔧 FILES CHANGED

### Backend
**`backend/server.js`**
- Added `POST /api/tours/:id/calculate-distances` endpoint
- Fetches shows sorted by date
- Calculates distances using Google Maps API
- Updates budget distance fields

### Frontend
**`src/app/api/tours/[id]/calculate-distances/route.ts`** (NEW)
- API route to proxy distance calculation to backend

**`src/app/import/components/Step4Summary.tsx`**
- Added `calculateDistances()` function
- Automatically calls distance endpoint after import
- Runs in `useEffect` when import succeeds

---

## 🎬 IMPORT FLOW

### Old Flow (No Distances)
```
1. Upload CSV
2. Validate addresses (auto-save each show)
3. Complete import (skip bulk endpoint)
4. ❌ No distance calculation
```

### New Flow (With Distances)
```
1. Upload CSV
2. Validate addresses (auto-save each show)
3. Complete import (skip bulk endpoint)
4. ✅ Auto-calculate distances
5. ✅ Update budgets with distances
```

---

## 🔍 HOW IT WORKS

### Step 1: Get Shows
```sql
SELECT id, date, city, venue_lat, venue_lng
FROM shows
WHERE tour_id = $1
ORDER BY date ASC
```

### Step 2: Calculate Distances
For each consecutive pair (show i and show i+1):
```javascript
const origin = `${show1.venue_lat},${show1.venue_lng}`;
const destination = `${show2.venue_lat},${show2.venue_lng}`;

const response = await fetch(
  `https://maps.googleapis.com/maps/api/distancematrix/json?
   origins=${origin}&
   destinations=${destination}&
   units=imperial&
   key=${GOOGLE_MAPS_API_KEY}`
);

const miles = response.distance.value / 1609.34;
```

### Step 3: Update Budgets
```sql
UPDATE budgets
SET distance = $1
WHERE show_id = $2
```

---

## ⚡ PERFORMANCE

### API Costs
```
Shows: 3
Distance calculations: 2 (n-1)
API calls: 2
Cost: 2 × $0.005 = $0.01
```

### Processing Time
```
Per distance calculation: ~200-500ms
Total for 3 shows: ~1 second
10 show tour: ~2-3 seconds
```

**Runs in background, user doesn't wait!**

---

## 🐛 TROUBLESHOOTING

### Still Shows 0 Miles

**Check 1: Shows Have Coordinates**
```sql
SELECT city, venue_name, venue_lat, venue_lng
FROM shows
WHERE tour_id = 'YOUR_TOUR_ID';
```

Expected: `venue_lat` and `venue_lng` should have values

**Check 2: Backend Logs**
```bash
tail -f backend.log
```

Look for:
```
🗺️  Calculating distances for tour...
✅ Calculated and saved X distances
```

**Check 3: Google Maps API Key**
```bash
cd backend
cat .env | grep GOOGLE_MAPS_API_KEY
```

Should show your API key.

**Check 4: Budgets Updated**
```sql
SELECT b.budget_name, b.distance, s.city
FROM budgets b
JOIN shows s ON b.show_id = s.id
WHERE b.tour_id = 'YOUR_TOUR_ID'
ORDER BY s.date;
```

Expected: `distance` column should have values (not 0 or null)

---

## 🎯 NEXT STEPS

### 1. Test with Fresh Import
- Delete current tour
- Re-import CSV
- Verify distances calculate automatically

### 2. Monitor Backend Logs
```bash
tail -f backend.log
```

Watch for distance calculation messages.

### 3. Verify Tours Page
- Check "Total Miles" displays
- Verify it's not 0
- Confirm sum matches calculated distances

---

## 📝 MANUAL CALCULATION (If Needed)

If you want to calculate distances for existing tours without re-importing:

### Browser Console Method
```javascript
// On any logged-in page
const tourId = 'e37b0b98-4458-4258-be14-4c237baa796c'; // Your tour ID

fetch(`/api/tours/${tourId}/calculate-distances`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('access_token')}`,
    'X-Entity-Id': localStorage.getItem('entity_id')
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Result:', data);
  // Refresh page to see updated miles
  window.location.reload();
});
```

---

## ✅ SUCCESS CRITERIA

After fix:
- [x] Backend endpoint created (`/api/tours/:id/calculate-distances`)
- [x] Frontend API route created
- [x] Step4Summary auto-calls distance calculation
- [x] Backend server restarted
- [ ] Test import shows distances
- [ ] Tours page displays miles
- [ ] Total miles not 0

---

## 🎉 CONCLUSION

**The Fix:**
- ✅ Auto-calculate distances after import
- ✅ Works with both auto-save and bulk import
- ✅ No user action required
- ✅ Runs in background

**To Verify:**
1. Delete current tour
2. Re-import CSV
3. Check Tours page for miles

**Status:** 🟢 Ready to test!

---

**Last Updated:** March 29, 2026, 8:20 AM PST
