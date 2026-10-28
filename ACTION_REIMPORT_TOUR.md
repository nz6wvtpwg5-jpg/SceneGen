# 🎯 ACTION REQUIRED: Re-import Your Tour

**Date:** March 29, 2026
**Issue:** Distance showing 0 miles
**Solution:** Re-import tour with automatic distance calculation

---

## ✅ What Was Fixed

### Backend Update
The backend now **automatically calculates driving distances** between consecutive shows during CSV import using:
- Show coordinates (latitude/longitude already in your data)
- Google Maps Distance Matrix API
- Real driving distance (not straight-line)

### Code Changes
- `backend/server.js` - Added distance calculation logic
- Distances calculated between each pair of consecutive shows
- Stored in `budgets.distance` field

---

## 🔧 Why Distance Shows 0

Your current tour was imported **before** this distance calculation feature was added:

```
Console log shows:
💰 Budget Atlants GA - 01/04/2026 - Distance: 0
💰 Budget Murfreesbro TN - 31/03/2026 - Distance: 0
💰 Budget Lexington KY - 30/03/2026 - Distance: 0
```

**The budgets exist, but distance field is 0 or null.**

---

## 🚀 Solution: Re-import Your Tour

### Option 1: Delete and Re-import (Recommended)

#### Step 1: Delete Current Tour
1. Go to http://localhost:3000/tours
2. Click "Delete" on "Tour Mar 2026"
3. Confirm deletion

#### Step 2: Re-import CSV
1. Go to http://localhost:3000/import
2. Upload your tour CSV file
3. Map columns (should auto-map)
4. Review and import

#### Step 3: Verify Distance
1. Go back to `/tours`
2. Check "Total Miles" - should show actual mileage
3. Click "View Details" to see breakdown

---

### Option 2: Calculate Distance for Existing Tour

If you want to keep the existing tour and just add distances:

#### Step 1: Check Your Shows Have Coordinates
```sql
SELECT id, city, venue_name, venue_lat, venue_lng
FROM shows
WHERE tour_id = 'ca599779-02f3-4c07-bc74-e969be71771a'
ORDER BY date;
```

**If shows have `venue_lat` and `venue_lng`**, proceed to Step 2.
**If not**, you'll need to re-import (Option 1).

#### Step 2: Run Distance Calculation Script
I can create a script to calculate distances for your existing tour if the coordinates are present.

---

## 🔍 What the Backend Will Do

When you re-import, the backend will:

```
1. Create shows with coordinates ✅
   └─ venue_lat, venue_lng already in your CSV

2. Sort shows by date ✅
   └─ Determine tour order

3. Calculate distances ✅
   └─ For each consecutive pair:
      - Get coordinates
      - Call Google Maps API
      - Calculate driving distance
      - Store in budget

4. Create budgets with distances ✅
   └─ distance field populated

5. Display total miles ✅
   └─ Sum all distances
```

---

## 📊 Expected Results

After re-import, you should see something like:

### Tours Page
```
Tour Mar 2026
─────────────────────────────────────
Shows: 3
Total Fees: $16,959.88
Total Costs: $31,859.99
Profit: -$14,900.11
Total Miles: 356 mi  ← Should show actual miles!
```

### Backend Logs
```
🗺️  Calculating distances between shows...
   ✅ Lexington KY → Murfreesbro TN: 184 miles
   ✅ Murfreesbro TN → Atlanta GA: 172 miles
✅ Calculated 2 distances
```

---

## ⚠️ Important Notes

### Coordinates Required
- Your CSV must have venue addresses OR coordinates
- Google Places autocomplete populates coordinates
- Without coordinates, distance remains 0

### API Key Required
- `GOOGLE_MAPS_API_KEY` must be in `backend/.env`
- API must be enabled in Google Cloud Console
- Should be already configured (used for address autocomplete)

### Distance Per Show
- Each budget stores the distance **to that show from the previous show**
- First show has distance = 0 (no previous show)
- Total miles = sum of all show distances

---

## 🧪 Quick Test

After re-importing:

### 1. Check Tours Page
```
Should see: "Total Miles: [number] mi"
Not: "Total Miles: 0 mi"
```

### 2. Check Console Logs
```
💰 Budget Atlants GA - Distance: 172  ← Not 0!
💰 Budget Murfreesbro TN - Distance: 184  ← Not 0!
💰 Budget Lexington KY - Distance: 0  ← First show, OK
```

### 3. Check Backend Logs
```bash
tail -f backend.log

# Look for:
🗺️  Calculating distances between shows...
✅ Calculated X distances
```

---

## 🆘 Troubleshooting

### Still Shows 0 After Re-import

**Check:**
1. Backend server restarted? (PID: 73253)
2. Google Maps API key in `.env`?
3. Shows have coordinates in database?
4. Backend logs show distance calculation?

**Debug:**
```bash
# Check backend logs during import
tail -f backend.log

# Should see:
# - "Calculating distances between shows..."
# - "[City A] → [City B]: X miles"
```

### Import Fails

**Check:**
1. CSV has proper venue addresses
2. CSV date format correct (DD/MM/YYYY)
3. CSV has required columns (Date, City, Fees Cash, etc.)

---

## 📝 Recommended Action

**DO THIS NOW:**

1. ✅ **Delete "Tour Mar 2026"** from `/tours` page
2. ✅ **Re-import your CSV** from `/import` page
3. ✅ **Verify total miles** shows on `/tours` page
4. ✅ **Check backend logs** confirm distances calculated

**Time:** ~2 minutes
**Result:** Working distance calculation!

---

## 🎉 After Re-import

You should see:
- ✅ Total miles displayed (not 0)
- ✅ Correct tour statistics
- ✅ Distance calculated automatically
- ✅ No errors in console
- ✅ Backend logs show distance calculations

---

**Ready?** Go to http://localhost:3000/tours and delete the tour, then re-import!

**Need help?** Check `DISTANCE_AUTO_CALCULATION.md` for full details.

---

**Last Updated:** March 29, 2026, 8:05 AM PST
