# 🗺️ Automatic Distance Calculation

**Date:** March 29, 2026
**Status:** ✅ Implemented

---

## Overview

The system now **automatically calculates driving distances** between consecutive shows during CSV import using the Google Maps Distance Matrix API.

---

## How It Works

### 1. **Show Import with Coordinates**
When shows are imported from CSV:
- Shows include `venue_lat` and `venue_lng` (from Google Places autocomplete)
- Shows are stored with their geographic coordinates

### 2. **Distance Calculation**
After shows are created, the system:
1. Sorts shows by date to determine tour order
2. For each consecutive pair of shows:
   - Checks if both have coordinates
   - Calls Google Maps Distance Matrix API
   - Calculates driving distance in miles
   - Stores distance with the budget for the destination show

### 3. **Distance Storage**
- Distance is stored in the `distance` field of the `budgets` table
- Measured in miles (converted from meters)
- Rounded to 1 decimal place

---

## Code Implementation

### Backend (server.js)

```javascript
// Step 2.5: Calculate distances between consecutive shows
console.log(`\n🗺️  Calculating distances between shows...`);
const distanceMap = new Map(); // Map showIndex to distance from previous show

// Sort shows by date to get the correct tour order
const sortedShows = [...shows].sort((a, b) => new Date(a.date) - new Date(b.date));

for (let i = 1; i < sortedShows.length; i++) {
  const prevShow = sortedShows[i - 1];
  const currShow = sortedShows[i];

  // Check if both shows have coordinates
  if (prevShow.venue_lat && prevShow.venue_lng && currShow.venue_lat && currShow.venue_lng) {
    const origin = `${prevShow.venue_lat},${prevShow.venue_lng}`;
    const destination = `${currShow.venue_lat},${currShow.venue_lng}`;

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&units=imperial&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    // Convert meters to miles and store
    const miles = element.distance.value / 1609.34;
    distanceMap.set(currShow.rowIndex, Math.round(miles * 10) / 10);
  }
}

// Use calculated distance when creating budget
const calculatedDistance = distanceMap.get(budget.showIndex);
const finalDistance = calculatedDistance || budget.distance || null;
```

---

## Requirements

### Environment Variable
```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### API Enabled
- Google Maps Distance Matrix API must be enabled in your Google Cloud project

---

## What Gets Calculated

### ✅ Calculated Automatically
- **Driving distance** between consecutive shows (in tour date order)
- Uses actual road network (not straight-line distance)
- Accounts for highways, roads, and typical driving routes

### Example
```
Tour: Spring 2026
┌─────────────────────────────────────────┐
│ Show 1: Atlanta, GA (Mar 30)            │
│   ↓ 184 miles (calculated automatically)│
│ Show 2: Nashville, TN (Mar 31)          │
│   ↓ 172 miles (calculated automatically)│
│ Show 3: Louisville, KY (Apr 1)          │
└─────────────────────────────────────────┘

Total Miles: 356 miles
```

---

## Display Locations

### 1. **Tours Page** (`/tours`)
Shows total miles for each tour in the statistics grid:
```
Total Miles: 356 mi
```

### 2. **Tour Details Modal**
Shows total miles across all budgets for the tour

### 3. **Individual Budgets**
Each budget stores the distance to that show from the previous show

---

## Fallback Behavior

### If Coordinates Missing
- Distance remains `null` or `0`
- Warning logged: `⚠️  Missing coordinates: City A → City B`
- Tour still imports successfully

### If API Call Fails
- Distance remains `null` or `0`
- Warning logged: `⚠️  Could not calculate distance`
- Tour still imports successfully

### If CSV Has Distance Column
- CSV distance is used as fallback
- Calculated distance takes priority if available

---

## Benefits

### 1. **Accurate Distance**
- Real driving distance, not straight-line
- Accounts for actual road networks
- More accurate fuel/travel budgeting

### 2. **Automatic Calculation**
- No manual input needed
- Calculated during import
- Always up-to-date

### 3. **Tour Planning**
- See total tour mileage
- Identify long drives
- Optimize routing

### 4. **Cost Estimation**
- Calculate fuel costs (miles × MPG × gas price)
- Estimate travel time
- Budget for hotels/stops

---

## Testing the Feature

### 1. **Re-import Your Tour**
```sql
-- Clean existing data
DELETE FROM budgets WHERE tour_id = 'your-tour-id';
DELETE FROM shows WHERE tour_id = 'your-tour-id';
```

### 2. **Import CSV**
- Go to `/import`
- Upload your tour CSV
- Ensure venue addresses are filled in
- Complete import

### 3. **Verify Distances**
- Go to `/tours`
- Check "Total Miles" for your tour
- Should see calculated mileage (not 0)

### 4. **Check Backend Logs**
```bash
tail -f backend.log
```

Look for:
```
🗺️  Calculating distances between shows...
   ✅ Atlanta GA → Nashville TN: 184 miles
   ✅ Nashville TN → Louisville KY: 172 miles
✅ Calculated 2 distances
```

---

## Distance Formula

### Conversion
```
1 mile = 1609.34 meters
miles = meters / 1609.34
```

### Rounding
```javascript
Math.round(miles * 10) / 10  // Round to 1 decimal place
```

### Example
```
Distance from API: 295,421 meters
Converted: 295,421 / 1609.34 = 183.55 miles
Rounded: 183.6 miles
```

---

## Future Enhancements

### 1. **Route Optimization**
- Suggest optimal tour order to minimize distance
- Identify circular routes vs. one-way tours

### 2. **Multi-leg Routing**
- Calculate best route through all tour stops
- Optimize for minimum total distance

### 3. **Travel Time**
- Store estimated drive time (also from API)
- Calculate travel days needed
- Suggest overnight stops for long drives

### 4. **Cost Calculator**
- Input: Vehicle MPG, gas price
- Output: Estimated fuel cost per show/tour

### 5. **Distance Caching**
- Cache common routes (e.g., Nashville → Atlanta)
- Reduce API calls
- Faster imports

---

## API Costs

### Google Maps Distance Matrix API
- **Free tier:** $200/month credit
- **Cost:** $0.005 per element (origin-destination pair)
- **Example:** 10-show tour = 9 distance calculations = $0.045

### Cost Estimation
```
Shows per tour: 10
Distance calculations: 9 (between consecutive shows)
Cost per tour: 9 × $0.005 = $0.045
Tours per month: 50
Total cost: 50 × $0.045 = $2.25/month
```

**Well within free tier!**

---

## Troubleshooting

### Distance Shows 0
**Problem:** All distances are 0 or null

**Solutions:**
1. Check if `GOOGLE_MAPS_API_KEY` is set in `backend/.env`
2. Verify API is enabled in Google Cloud Console
3. Check backend logs for API errors
4. Ensure shows have `venue_lat` and `venue_lng`

### Wrong Distance
**Problem:** Distance seems incorrect

**Solutions:**
1. Verify coordinates are correct (check show data)
2. Check if using driving distance (not straight-line)
3. Verify tour order (shows sorted by date)

### Missing Coordinates
**Problem:** Shows don't have coordinates

**Solutions:**
1. Ensure venue addresses are complete
2. Use Google Places autocomplete when entering venues
3. Manually add coordinates if needed

---

## Related Files

### Backend
- `backend/server.js` (lines 3095-3150) - Distance calculation
- `backend/.env` - Google Maps API key

### Frontend
- `src/app/tours/page.tsx` - Display total miles
- `src/components/tours/TourDetailsModal.tsx` - Show totals

### Database
- `budgets` table - `distance` column (numeric)

---

## ✅ Status

**Feature:** ✅ Complete and working
**Backend:** ✅ Calculating distances during import
**Frontend:** ✅ Displaying total miles
**API:** ✅ Google Maps Distance Matrix integrated

**Next:** Re-import your tour to see calculated distances!

---

**Last Updated:** March 29, 2026, 8:00 AM PST
