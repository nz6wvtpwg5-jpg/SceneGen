# Driving Distance Calculation for Tours

## Current Problem
- Tour Details Modal shows **0 miles** for total distance
- The `distance` field in budgets is currently from CSV data (not always accurate driving distance)
- Need to calculate **actual driving distance** between consecutive shows

## Solution Overview

### 1. Google Maps Distance Matrix API
We'll use Google's Distance Matrix API to calculate real driving distances between shows.

**API Endpoint Created:** `/api/calculate-route-distance`

### 2. When to Calculate Distances

#### Option A: During Import (Recommended)
Calculate distances when shows are imported and store in database:
- Sort shows by date
- For each show (except the first), calculate driving distance from previous show
- Store distance in the `distance` field of the budget
- This way, distances are pre-calculated and don't require API calls to display

#### Option B: On-Demand in Modal
Calculate distances when opening the Tour Details Modal:
- Fetch shows
- Call Distance Matrix API for consecutive show pairs
- Display calculated total
- **Downside:** Requires API call every time modal opens

### 3. Implementation Steps

#### Step 1: Update Import Process
Modify `/api/import/execute` endpoint to:
1. Sort shows by date
2. For each consecutive pair of shows with addresses:
   - Call `/api/calculate-route-distance`
   - Store result in budget's `distance` field

#### Step 2: Display in Modal
The `TourDetailsModal` already sums up the distance fields:
```typescript
const totalMiles = budgets.reduce((sum, b) => sum + (b.distance || 0), 0);
```

This will work automatically once distances are populated!

## Alternative: Use Existing CSV Distance
If your CSV file already has accurate driving distances:
- The distance field is already being imported
- Check why it's showing 0:
  - Are distances in the CSV?
  - Are they being parsed correctly?
  - Are they matching to the right budget?

## Google Maps API Usage
- **Cost:** $0.005 per element (origin-destination pair)
- **Example:** 10-show tour = 9 distance calculations = $0.045
- **Monthly free tier:** $200 credit = ~40,000 calculations

## Next Steps
1. **Check CSV:** Does it have distance data? Is it in miles?
2. **Decide approach:** Import-time calculation vs on-demand
3. **Implement:** Add distance calculation to import flow
4. **Test:** Import shows and verify distances appear

## Files to Modify
- ✅ `src/app/api/calculate-route-distance/route.ts` (created)
- ⏳ `backend/server.js` - Add distance calculation in `/api/import/execute`
- ✅ `src/components/tours/TourDetailsModal.tsx` (already sums distances)

---
**Status:** API endpoint created, awaiting implementation decision
