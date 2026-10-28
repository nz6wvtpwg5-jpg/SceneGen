# 🎯 Quick Fix: Update Tour Distances to Accurate Route Miles

## Problem
Your tour shows **8,084 miles** in stats but **10,206 miles** on the map.

## Solution
Recalculate distances using the accurate Directions API (actual driving routes).

---

## Step-by-Step Fix

### 1. **Backend is Already Updated** ✅
The backend now uses Google Directions API for accurate mileage.

### 2. **Recalculate Your Tour Distances**

#### Option A: Using the UI (Easiest)
1. Go to your tour page: `http://localhost:3000/tours/[id]`
2. Look for a **"Recalculate Distances"** button
3. Click it and wait for success message
4. Refresh the page

#### Option B: Using API Call
```bash
# Replace TOUR_ID with your actual tour ID
# Get these from your browser's dev tools (Application > Session Storage)

curl -X POST "http://localhost:3001/api/tours/YOUR_TOUR_ID/calculate-distances" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Entity-Id: YOUR_ENTITY_ID"
```

### 3. **Verify the Fix**
After recalculation:
- ✅ Tour stats "Total Miles" should show **~10,206 miles**
- ✅ Map banner should show same **~10,206 miles**
- ✅ Numbers should match (±1% for rounding)

---

## What Changed?

### Before (Inaccurate):
- Used **Distance Matrix API** (straight-line estimates)
- Result: **8,084 miles** (26% underestimated)

### After (Accurate):
- Uses **Directions API** (actual driving routes)
- Result: **~10,206 miles** (real-world distance)

---

## Expected Console Output

When you recalculate, you should see:
```
🗺️  Calculating distances for tour: abc-123...
📍 Found 28 shows, calculating 27 distances...
   ✅ Show 1 → Show 2: 95 miles (actual route)
   ✅ Show 2 → Show 3: 106 miles (actual route)
   ✅ Show 3 → Show 4: 41 miles (actual route)
   ...
✅ Calculated and saved 27 actual driving distances
```

The key indicator is: **(actual route)** in the logs.

---

## Troubleshooting

### "Recalculate Distances" button not visible?
Check `src/app/tours/[id]/page.tsx` for the button code. If missing, you can trigger via API call (Option B above).

### API call returns 401 Unauthorized?
You need a valid access token and entity ID from your session. Check browser dev tools:
1. Open DevTools (F12)
2. Go to Application tab
3. Session Storage → Find `access_token` and entity ID

### Still showing old mileage?
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Check database directly to confirm update

### Backend not running?
```bash
cd backend
npm run dev
```

---

## Why the Difference?

**2,122 extra miles** is normal because:
- Real roads curve and wind
- Highways have required exits/entrances
- Routes avoid geographic obstacles
- Multi-stop optimization adds complexity

The **Directions API** gives you the **actual driving distance** you'd see on Google Maps navigation.

---

## Status Check

✅ **Backend Updated**: Using Directions API
✅ **Server Running**: http://localhost:3001
⏳ **Tour Data**: Needs recalculation (do Step 2)
⏳ **Verification**: Check numbers match after recalc

---

## Need Help?

See full documentation: `DISTANCE_API_UPGRADE.md`

**Expected Result**: Both tour stats and map should show **~10,206 miles** (accurate driving distance).
