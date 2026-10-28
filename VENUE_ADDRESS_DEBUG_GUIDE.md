# Venue Address Import - Debug & Verification Guide

## Overview
This guide helps you verify that venue addresses are being properly collected during CSV import and saved to the database.

## Data Flow Summary

```
PlacesAutocomplete (Step3Validation.tsx)
    ↓ [User selects address]
handleAddressChange() - Stores in showAddresses state
    ↓ [User clicks "Start Import"]
handleStartImport() - Merges addresses into show data
    ↓ [Updates importData with venue fields]
ImportWizard.handleStartImport() - Sends to backend
    ↓ [POST /api/import/execute]
Backend (server.js:2923) - Saves to database
    ↓ [INSERT INTO shows]
Database (shows table) - venue_address, venue_lat, venue_lng
```

## Field Mapping

### Frontend → Backend
```javascript
// Step3Validation.tsx (lines 119-129)
{
  ...show,
  venue_address: addressData.address,  // ✓ Full address string
  venue_lat: addressData.lat,          // ✓ Latitude (number)
  venue_lng: addressData.lng,          // ✓ Longitude (number)
}
```

### Backend → Database
```javascript
// server.js (lines 2914-2933)
INSERT INTO shows (
  entity_id, tour_id, date, city, state, country,
  venue_name, venue_address, venue_lat, venue_lng, fee, status, start_time, end_time
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
```

### Database Schema
```sql
-- Column definitions
venue_address TEXT          -- Full address from Google Places
venue_lat     DECIMAL(10,8) -- Latitude coordinate
venue_lng     DECIMAL(11,8) -- Longitude coordinate
```

## Verification Steps

### 1. Check Console Logs (Frontend)

In `Step3Validation.tsx`, the following logs are present:

```javascript
// Line 113-119: When user clicks "Start Import"
console.log('🔍 handleStartImport - tourOption:', tourOption);
console.log('🔍 handleStartImport - tourName:', tourName);
console.log('🔍 handleStartImport - selectedTourId:', selectedTourId);
console.log('🔍 handleStartImport - importData.tour:', importData.tour);
console.log('🔍 handleStartImport - updatedData.tour:', updatedData.tour);
console.log('🔍 handleStartImport - shows with addresses:',
  updatedShows.filter((s: any) => s.venue_address).length);
```

**What to look for:**
- Last log should show: "shows with addresses: X" where X is the number of addresses entered
- Each show should have `venue_address`, `venue_lat`, `venue_lng` properties

### 2. Check Console Logs (Backend)

In `server.js`, the following logs are present:

```javascript
// Line 2859-2865: When import request is received
console.log('📥 Bulk import request:', {
  entityId,
  showCount: shows?.length || 0,
  budgetCount: budgets?.length || 0,
  tour: tour?.name || tour?.id,
});

// Line 2945: After shows are created
console.log(`✅ Created ${showIds.length} shows`);
```

**What to look for:**
- Confirm showCount matches the number of rows in your CSV
- Check that shows are being created successfully

### 3. Inspect Network Request

Open Browser DevTools → Network tab → Filter by "execute"

**Request Payload:**
```json
{
  "entityId": "your-entity-id",
  "shows": [
    {
      "date": "2026-04-15",
      "city": "New York",
      "state": "NY",
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

### 4. Query Database

After import, verify data was saved:

```bash
cd backend
psql "$DATABASE_URL" -c "SELECT
  venue_name,
  venue_address,
  venue_lat,
  venue_lng,
  city,
  state
FROM shows
ORDER BY created_at DESC
LIMIT 5;"
```

**Expected output:**
```
     venue_name      |                venue_address                |  venue_lat  |  venue_lng   |    city    | state
--------------------+---------------------------------------------+-------------+--------------+------------+-------
 Brooklyn Steel     | 319 Frost St, Brooklyn, NY 11222, USA      | 40.71970000 | -73.93660000 | New York   | NY
 The Fillmore       | 1805 Geary Blvd, San Francisco, CA 94115   | 37.78390000 | -122.43320000| San Francisco| CA
```

### 5. Verify Map Display

After import, open the tour details:

1. Navigate to Tours page
2. Click on the newly imported tour
3. The TourMap component should display:
   - All shows with addresses as markers
   - Route lines connecting the venues
   - Venue names in info windows

## Troubleshooting

### Issue: Addresses not showing in database

**Check 1:** Verify addresses were entered
```javascript
// In browser console after entering addresses
console.log('Addresses:', showAddresses);
// Should show: { 0: { address: "...", lat: X, lng: Y }, 1: {...}, ... }
```

**Check 2:** Verify data structure before import
```javascript
// In Step3Validation.tsx:handleStartImport(), add:
console.log('Updated shows:', JSON.stringify(updatedShows, null, 2));
```

**Check 3:** Verify backend received the data
```javascript
// In backend/server.js (line 2859), add:
console.log('Shows received:', JSON.stringify(shows.slice(0, 2), null, 2));
```

### Issue: PlacesAutocomplete not working

**Check 1:** Google Maps API key is set
```bash
# Check .env.local
cat .env.local | grep GOOGLE_MAPS_API_KEY
```

**Check 2:** API key has Places API enabled
- Go to Google Cloud Console
- APIs & Services → Enabled APIs
- Verify "Places API" is listed

**Check 3:** Console errors
- Open Browser DevTools → Console
- Look for Google Maps errors
- Common: "This API key is not authorized to use this service"

### Issue: Fields are NULL in database

**Possible causes:**

1. **Field name mismatch** - Backend expects `venue_address` but receives `venueAddress`
   - Fix: Backend handles both (line 2920)

2. **Data not merged** - `showAddresses` state not being applied
   - Check: `handleStartImport()` properly merges data (lines 119-131)

3. **Database constraint** - `venue_address` might be NOT NULL
   - Check: `\d shows` - venue_address should allow NULL

## Testing Checklist

- [ ] Google Maps API key is configured
- [ ] PlacesAutocomplete component loads without errors
- [ ] Can search and select addresses for each show
- [ ] Checkmarks appear after selecting addresses
- [ ] Progress counter shows correct count (e.g., "3 of 5 venues have addresses")
- [ ] Console log shows correct number of shows with addresses
- [ ] Network request includes venue_address, venue_lat, venue_lng fields
- [ ] Backend logs show shows were created successfully
- [ ] Database query returns venue address fields
- [ ] TourMap displays markers and routes correctly

## Quick Test Script

Run this after an import to verify everything:

```bash
#!/bin/bash
cd /Users/jon/Desktop/scenegen/SceneGenUIV2/backend

echo "=== Recently Imported Shows ==="
psql "$DATABASE_URL" -c "
SELECT
  id,
  venue_name,
  LEFT(venue_address, 50) as address,
  venue_lat,
  venue_lng,
  date,
  created_at
FROM shows
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
"

echo ""
echo "=== Address Coverage ==="
psql "$DATABASE_URL" -c "
SELECT
  COUNT(*) as total_shows,
  COUNT(venue_address) as shows_with_address,
  COUNT(venue_lat) as shows_with_coordinates,
  ROUND(100.0 * COUNT(venue_address) / COUNT(*), 1) as address_percentage
FROM shows
WHERE created_at > NOW() - INTERVAL '10 minutes';
"
```

Save this as `test-venue-import.sh` and make executable:
```bash
chmod +x test-venue-import.sh
./test-venue-import.sh
```

## Common Scenarios

### Scenario 1: Import with all addresses
- Enter address for each show
- All shows should have venue_address, venue_lat, venue_lng
- Map displays complete route

### Scenario 2: Import with partial addresses
- Enter address for some shows (e.g., 3 out of 5)
- Only those 3 shows have coordinates
- Map displays only those 3 markers (no route if < 2)

### Scenario 3: Import with no addresses
- Skip all address inputs
- All shows have NULL for venue fields
- Map shows message: "No venue coordinates available"

## Success Criteria

✅ User can enter addresses during import
✅ Addresses are stored in state correctly
✅ Data is merged before sending to backend
✅ Backend receives and stores all fields
✅ Database contains venue_address, venue_lat, venue_lng
✅ TourMap displays venues correctly

## Next Steps

If all verification steps pass:
1. Test with a real CSV file
2. Verify map visualization works
3. Test editing addresses after import (if implemented)
4. Document user workflow in user guide

If issues persist:
1. Share console logs (frontend and backend)
2. Share network request payload
3. Share database query results
4. Check this guide's troubleshooting section
