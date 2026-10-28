# Testing the Google Maps Implementation

## Quick Test Guide

### 1. Verify Environment Setup

Check `.env.local`:
```bash
cat .env.local | grep GOOGLE_MAPS
```

Should see:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test the Map Component

#### Option A: With Existing Data

1. Navigate to the Tours page
2. Click on any tour to open Tour Details Modal
3. Click the "Route" tab
4. You should see:
   - If shows have coordinates: Map with markers and routes
   - If no coordinates: Message "No shows with valid coordinates found"

#### Option B: Create Test Data

Insert a test show with coordinates directly in the database:

```sql
-- Example: Add a show in New York City
INSERT INTO shows (
  entity_id,
  tour_id,
  date,
  venue_name,
  venue_address,
  venue_lat,
  venue_lng,
  fee
) VALUES (
  'your_entity_id',
  'your_tour_id',
  '2024-06-15',
  'Madison Square Garden',
  '4 Pennsylvania Plaza, New York, NY 10001',
  40.7505,
  -73.9934,
  5000.00
);
```

Then view that tour in the app.

### 4. Verify File Structure

Check that all files were created:

```bash
# Map components
ls -la src/components/maps/
# Should see: TourMap.tsx, PlacesAutocomplete.tsx

# Utilities
ls -la src/lib/maps/
# Should see: routeUtils.ts

# UI components
ls -la src/components/ui/
# Should see: alert.tsx, input.tsx, label.tsx

# Migration
ls -la backend/migrations/
# Should see: add_venue_address_fields.sql
```

### 5. Test PlacesAutocomplete

To test the autocomplete component in isolation, create a test page:

```tsx
// src/app/test-places/page.tsx
'use client';

import { useState } from 'react';
import { PlacesAutocomplete } from '@/components/maps/PlacesAutocomplete';

export default function TestPlacesPage() {
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Places Autocomplete</h1>

      <PlacesAutocomplete
        value={address}
        onChange={(addr, lat, lng) => {
          setAddress(addr);
          setCoords({ lat, lng });
        }}
        label="Venue Address"
        placeholder="Search for a venue"
      />

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p><strong>Address:</strong> {address}</p>
        <p><strong>Latitude:</strong> {coords.lat}</p>
        <p><strong>Longitude:</strong> {coords.lng}</p>
      </div>
    </div>
  );
}
```

Then visit: `http://localhost:3000/test-places`

### 6. Common Issues

#### Map doesn't load
- **Check**: Browser console for errors
- **Check**: API key is correct and has billing enabled
- **Check**: Required APIs are enabled in Google Cloud Console

#### "Cannot find module" errors
- **Fix**: Restart TypeScript server in VS Code (Cmd+Shift+P → "TypeScript: Restart TS Server")
- **Fix**: Delete `.next` folder and restart dev server

#### No markers appear
- **Check**: Shows have valid `venue_lat` and `venue_lng` values
- **Check**: Coordinates are in valid range (-90 to 90 for lat, -180 to 180 for lng)

#### Route doesn't display
- **Check**: Shows are sorted by date
- **Check**: At least 2 shows have valid coordinates

### 7. Database Verification

Check if migration ran successfully:

```sql
-- Check if columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'shows'
  AND column_name IN ('venue_address', 'venue_lat', 'venue_lng');

-- Check for shows with coordinates
SELECT id, venue_name, venue_address, venue_lat, venue_lng
FROM shows
WHERE venue_lat IS NOT NULL
  AND venue_lng IS NOT NULL
LIMIT 10;
```

### 8. Test Multi-Segment Routes

To test route segmentation with >25 shows:

1. Create a tour with 30+ shows
2. Add venue addresses and coordinates to all shows
3. Open the tour details
4. You should see:
   - Multiple colored route segments
   - Distance banners between segments
   - All markers numbered 1-30+

### Expected Results

#### Small Tour (1-24 shows)
- ✅ Single blue route
- ✅ All markers visible
- ✅ No segment banners

#### Medium Tour (25-50 shows)
- ✅ 2-3 colored segments
- ✅ Distance banners between segments
- ✅ Overlapping waypoints for continuity

#### Large Tour (50+ shows)
- ✅ Multiple colored segments
- ✅ Clear visual distinction between segments
- ✅ Map auto-fits to show all stops

### Performance Benchmarks

Expected load times:
- **Map initialization**: < 2 seconds
- **Marker rendering**: < 1 second for 100 markers
- **Route calculation**: < 2 seconds per segment

If slower, check:
- Network speed (Google Maps API calls)
- Browser console for errors
- Database query performance

### Success Criteria

✅ Map loads without errors
✅ Markers appear for all shows with coordinates
✅ Info windows show on marker click
✅ Routes display between consecutive shows
✅ Multi-segment routes have different colors
✅ Distance banners appear between segments
✅ Map auto-fits to show all markers

### Next: Test Import Flow

Once basic map functionality is verified:

1. Test CSV import
2. Add PlacesAutocomplete to Step3Validation
3. Enter venue addresses during import
4. Verify coordinates are saved
5. Check map displays correctly after import

---

**All tests passing?** You're ready to integrate address entry into the import flow!
