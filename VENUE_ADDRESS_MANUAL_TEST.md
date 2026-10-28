# Venue Address Collection - Manual Testing Guide

## Quick Start

### Prerequisites
1. ✅ Backend running on http://localhost:3001
2. ✅ Frontend running on http://localhost:3000
3. ✅ Logged in to SceneGen
4. ✅ At least one entity created
5. ✅ Google Maps API key configured in `.env.local`

### Test Flow

```
Upload CSV → Map Fields → Enter Addresses → Import → Verify
```

## Step-by-Step Test

### 1. Start Import Flow

1. Navigate to http://localhost:3000/import
2. Click "Choose File" and select a CSV with show data
3. Click "Next"

### 2. Map CSV Fields

1. Map required fields:
   - Date → CSV column with show dates
   - City → CSV column with cities
   - Venue Name → CSV column with venue names
   - Fee → CSV column with show fees

2. Click "Next"

### 3. Enter Venue Addresses (CRITICAL STEP)

This is where venue addresses are collected:

**For each show listed:**

1. Click in the address input field
2. Start typing the venue address
3. **IMPORTANT:** Select an address from the dropdown suggestions
   - ✅ DO: Click on a suggestion from the Google Places dropdown
   - ❌ DON'T: Just type an address and move on

**What to look for:**

✅ **Success indicators:**
- Green border appears around the show card
- Green checkmark with "Verified" text appears
- Latitude/longitude coordinates display (e.g., "40.7489, -73.9680")
- Counter updates: "X of Y venues have valid coordinates"

❌ **Failure indicators:**
- No checkmark appears
- No coordinates display
- Counter stays at "0 of Y venues have valid coordinates"
- Yellow warning: "⚠️ Please select addresses from dropdown suggestions"

**Test different scenarios:**

Scenario A: All addresses entered
- Enter addresses for ALL shows
- Counter should show "5 of 5 venues have valid coordinates"
- All cards should have green borders and checkmarks

Scenario B: Partial addresses
- Enter addresses for SOME shows (e.g., 3 out of 5)
- Counter should show "3 of 5 venues have valid coordinates"
- Only those 3 cards have green borders

Scenario C: No addresses
- Skip all address inputs
- Counter shows "0 of 5 venues have valid coordinates"
- Yellow warning appears

### 4. Configure Tour Settings

1. Choose "Create New Tour" or "Add to Existing Tour"
2. Enter tour name if creating new
3. Click "Start Import"

### 5. Check Browser Console

**Open DevTools → Console tab**

Look for these log messages:

```
📍 Address selected for show 0: { address: "...", lat: 40.7489, lng: -73.9680 }
📍 Address selected for show 1: { address: "...", lat: 34.0522, lng: -118.2437 }
...

🔍 handleStartImport - showAddresses state: { 0: {...}, 1: {...}, ... }

✅ Show 0 has address data: { address: "...", lat: 40.7489, lng: -73.9680 }
✅ Show 1 has address data: { address: "...", lat: 34.0522, lng: -118.2437 }
...

🗺️  Total shows with coordinates: 5 / 5

🔍 handleStartImport - first show sample: {
  "date": "2026-04-15",
  "city": "New York",
  "venueName": "Brooklyn Steel",
  "venue_address": "319 Frost St, Brooklyn, NY 11222, USA",
  "venue_lat": 40.7197,
  "venue_lng": -73.9366,
  ...
}
```

**If you see:**
- `⚠️ Show X has no address data` → That show was skipped
- `🗺️ Total shows with coordinates: 0 / 5` → No addresses were properly selected

### 6. Check Network Request

**DevTools → Network tab → Filter: "execute"**

1. Click on the `/api/import/execute` request
2. Go to "Payload" or "Request" tab
3. Verify the shows array includes venue fields:

```json
{
  "entityId": "your-entity-id",
  "shows": [
    {
      "date": "2026-04-15",
      "city": "New York",
      "venueName": "Brooklyn Steel",
      "venue_address": "319 Frost St, Brooklyn, NY 11222, USA",
      "venue_lat": 40.7197,
      "venue_lng": -73.9366,
      "fee": 5000
    }
  ],
  "budgets": [...],
  "tour": {
    "name": "Tour Apr 2026"
  }
}
```

**❌ If you see:**
```json
{
  "venue_address": undefined,
  "venue_lat": undefined,
  "venue_lng": undefined
}
```
→ Addresses were not properly collected

### 7. Verify Backend Received Data

**Backend terminal (where `node server.js` is running)**

Look for:

```
📥 Bulk import request: {
  entityId: 'your-entity-id',
  showCount: 5,
  budgetCount: 5,
  tour: 'Tour Apr 2026'
}

✅ Created tour: <tour-id>
✅ Created 5 shows
✅ Created 5 budgets with 25 line items
```

**No errors should appear**

### 8. Verify Database

Run the verification script:

```bash
cd backend
./verify-venue-import.sh
```

**Expected output:**

```
4️⃣  Checking address coverage...
 total_shows | with_address | with_coordinates | missing_address | address_percentage
-------------+--------------+------------------+-----------------+--------------------
         327 |          327 |                5 |               0 |              100.0
```

Key metrics:
- `with_coordinates` should match the number of shows you entered addresses for
- If you entered addresses for all 5 shows, `with_coordinates` should be 5

**Manual database query:**

```bash
cd backend
psql "$DATABASE_URL" -c "
SELECT
  venue_name,
  LEFT(venue_address, 50) as address,
  ROUND(venue_lat::numeric, 4) as lat,
  ROUND(venue_lng::numeric, 4) as lng
FROM shows
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
"
```

**Expected:**
```
     venue_name      |                     address                     |    lat     |     lng
--------------------+-------------------------------------------------+------------+-------------
 Brooklyn Steel     | 319 Frost St, Brooklyn, NY 11222, USA          | 40.7197    | -73.9366
 The Fillmore       | 1805 Geary Blvd, San Francisco, CA 94115, USA  | 37.7839    | -122.4332
```

**❌ If you see:**
```
     venue_name      | address |  lat  |  lng
--------------------+---------+-------+-------
 Brooklyn Steel     | TBD     |       |
```
→ Addresses were not saved (coordinates are NULL)

### 9. Verify Map Visualization

1. Navigate to Tours page
2. Click on the newly imported tour
3. The map should show:
   - Markers for each venue with coordinates
   - Route lines connecting the venues (if ≥2 venues)
   - Click markers to see venue info

**❌ If you see:**
- "No venue coordinates available" → Coordinates weren't saved
- No markers → `venue_lat`/`venue_lng` are NULL in database

## Troubleshooting

### Issue: PlacesAutocomplete not showing suggestions

**Cause:** Google Maps API key missing or invalid

**Fix:**
1. Check `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key-here
   ```
2. Verify Places API is enabled in Google Cloud Console
3. Restart frontend: `npm run dev`

**Test:**
- Open browser console
- Look for errors like "Google Maps JavaScript API error"

### Issue: No checkmark appears after selecting address

**Cause:** PlacesAutocomplete onChange not firing

**Check console for:**
```
📍 Address selected for show 0: { address: "...", lat: ..., lng: ... }
```

**If missing:**
- Make sure you clicked on a dropdown suggestion (not just typed)
- Check for JavaScript errors in console

### Issue: Coordinates are NULL in database

**Possible causes:**

1. **Addresses not selected from dropdown**
   - Solution: Must click on Google Places suggestions

2. **State not being merged**
   - Check console for: `🗺️ Total shows with coordinates: 0 / 5`
   - Should show count > 0 if addresses were entered

3. **Backend not receiving data**
   - Check network request payload
   - Verify `venue_lat` and `venue_lng` are in the request

### Issue: Import succeeds but map doesn't show routes

**Check:**
1. Do venues have coordinates?
   ```sql
   SELECT COUNT(*) FROM shows WHERE tour_id = 'your-tour-id' AND venue_lat IS NOT NULL;
   ```
2. Are there at least 2 venues with coordinates? (need ≥2 for route)
3. Are coordinates valid? (lat: -90 to 90, lng: -180 to 180)

## Success Checklist

Before marking this feature as complete:

- [ ] Google Maps API key is configured
- [ ] Can search for venues using PlacesAutocomplete
- [ ] Dropdown suggestions appear when typing
- [ ] Clicking a suggestion shows:
  - [ ] Green border on show card
  - [ ] Green checkmark with "Verified" label
  - [ ] Lat/lng coordinates displayed
  - [ ] Counter increments
- [ ] Console shows: `📍 Address selected for show X: { address, lat, lng }`
- [ ] Console shows: `🗺️ Total shows with coordinates: X / Y` (where X > 0)
- [ ] Network request includes `venue_address`, `venue_lat`, `venue_lng`
- [ ] Backend logs show successful import
- [ ] Database query shows coordinates are NOT NULL
- [ ] Map displays markers and routes correctly
- [ ] Can test all three scenarios (all/partial/no addresses)

## Test Data

### Sample Venues for Testing

Use these real venues to test:

1. **Brooklyn Steel**
   - Search: "Brooklyn Steel 319 Frost"
   - Expected: 40.7197, -73.9366

2. **The Fillmore San Francisco**
   - Search: "Fillmore 1805 Geary"
   - Expected: 37.7839, -122.4332

3. **9:30 Club Washington DC**
   - Search: "9:30 Club 815 V Street"
   - Expected: 38.9173, -77.0230

4. **The Ryman Nashville**
   - Search: "Ryman Auditorium Nashville"
   - Expected: 36.1614, -86.7784

5. **Red Rocks Amphitheatre**
   - Search: "Red Rocks Morrison Colorado"
   - Expected: 39.6654, -105.2054

## Next Steps

After successful testing:
1. Document the feature for end users
2. Consider adding:
   - Bulk address entry
   - Address editing after import
   - Address validation
   - Smart defaults based on venue name + city
3. Train team on the workflow
