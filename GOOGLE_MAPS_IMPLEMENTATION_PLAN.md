# Google Maps Tour Route Implementation Plan

## ✅ Completed Steps

### 1. Database Schema Update
- **File**: `/backend/migrations/add_venue_address_fields.sql`
- **Status**: ✅ Migration executed successfully
- **Changes**:
  - Added `venue_address TEXT` column
  - Added `venue_lat DOUBLE PRECISION` column
  - Added `venue_lng DOUBLE PRECISION` column
  - Created indices on lat/lng columns for performance
  - Columns are nullable for backward compatibility

### 2. NPM Dependencies
- **Package**: `@react-google-maps/api`
- **Status**: ✅ Installed with `--legacy-peer-deps`
- **Purpose**: React wrapper for Google Maps JavaScript API

### 3. Utility Functions
- **File**: `/src/lib/maps/routeUtils.ts`
- **Status**: ✅ Created
- **Features**:
  - `segmentRoute()`: Splits tours with >25 shows into multiple route segments
  - `getSegmentColor()`: Assigns unique colors to each route segment
  - `calculateDistance()`: Calculates distance between two coordinates
  - `formatDistance()`: Formats distance in miles
  - `hasValidCoordinates()`: Validates show coordinates
  - `getShowsWithCoordinates()`: Filters shows with valid coords

### 4. Map Component
- **File**: `/src/components/maps/TourMap.tsx`
- **Status**: ✅ Created
- **Features**:
  - Renders Google Map with all tour stops as markers
  - Displays multi-segment routes with different colors
  - Shows distance banners between segments
  - Info windows for each marker with show details
  - Responsive map sizing
  - Loading and error states
  - Automatic map bounds fitting

### 5. UI Components
- **File**: `/src/components/ui/alert.tsx`
- **Status**: ✅ Created
- **Purpose**: Error and warning display in map component

### 6. Tour Details Modal Integration
- **File**: `/src/components/tours/TourDetailsModal.tsx`
- **Status**: ✅ Updated
- **Changes**:
  - Added `TourMap` import
  - Updated `Show` interface to include venue address fields
  - Replaced Route tab content with map component
  - Map displays in full tab height with proper overflow handling

## 🔄 Pending Implementation

### 1. CSV Import Flow - Address Entry

**Goal**: Allow users to enter venue addresses using Google Places Autocomplete during import validation.

#### Step A: Create Google Places Autocomplete Component
**File to create**: `/src/components/maps/PlacesAutocomplete.tsx`

```typescript
'use client';

import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const libraries: ("places")[] = ["places"];

interface PlacesAutocompleteProps {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  label?: string;
}

export function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Enter venue address",
  label
}: PlacesAutocompleteProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();

      if (place.geometry && place.geometry.location) {
        const address = place.formatted_address || '';
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        onChange(address, lat, lng);
      }
    }
  };

  if (loadError) {
    return <div>Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <Input disabled placeholder="Loading..." />;
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          defaultValue={value}
        />
      </Autocomplete>
    </div>
  );
}
```

#### Step B: Update Step3Validation Component
**File to update**: `/src/app/import/components/Step3Validation.tsx`

Add venue address input for each show:
1. Import `PlacesAutocomplete` component
2. Add address fields to the show data structure
3. Add address input in the validation form
4. Update the validation logic to require addresses
5. Store lat/lng coordinates from Places API

Key changes needed:
```typescript
// Add to imports
import { PlacesAutocomplete } from '@/components/maps/PlacesAutocomplete';

// Update show data structure to include:
interface ValidatedShow {
  // ...existing fields
  venue_address?: string;
  venue_lat?: number;
  venue_lng?: number;
}

// Add in the validation form for each show:
<PlacesAutocomplete
  value={show.venue_address || ''}
  onChange={(address, lat, lng) => {
    updateShow(show.id, {
      venue_address: address,
      venue_lat: lat,
      venue_lng: lng
    });
  }}
  label="Venue Address"
  placeholder="Search for venue address"
/>
```

#### Step C: Update Backend API
**Files to update**:
- `/backend/routes/shows.js` or similar
- Database insertion/update queries

Changes needed:
1. Accept `venue_address`, `venue_lat`, `venue_lng` in POST/PUT requests
2. Update SQL INSERT/UPDATE statements to include new fields
3. Add validation for coordinate ranges (-90 to 90 for lat, -180 to 180 for lng)

### 2. Data Migration for Existing Shows

**Goal**: Geocode existing shows that only have city/state data.

#### Option A: Manual Migration Script
**File to create**: `/backend/migrations/geocode_existing_shows.js`

```javascript
// This script would:
// 1. Fetch all shows without venue_address
// 2. Use Google Geocoding API to convert "city, state" to coordinates
// 3. Update the database with geocoded data
// Note: Be mindful of Google API quotas
```

#### Option B: Lazy Loading
- Keep city/state as fallback
- Display message in map: "Some shows are missing addresses"
- Allow users to manually update addresses in the UI

### 3. Backend API Updates

**Files to update**:
- `/backend/routes/shows.js`
- `/backend/models/Show.js` (if using models)

#### Changes Required:

1. **Add venue address fields to API responses**:
```javascript
// Include in SELECT queries
SELECT
  id, date, venue_name, venue_address, venue_lat, venue_lng,
  city, state, fee, ...
FROM shows
```

2. **Update create/update endpoints**:
```javascript
// Accept new fields in request body
const { venue_address, venue_lat, venue_lng } = req.body;

// Validate coordinates
if (venue_lat && (venue_lat < -90 || venue_lat > 90)) {
  return res.status(400).json({ error: 'Invalid latitude' });
}
if (venue_lng && (venue_lng < -180 || venue_lng > 180)) {
  return res.status(400).json({ error: 'Invalid longitude' });
}
```

3. **Deprecation Path for city/state**:
- Keep city/state for backward compatibility
- Extract city/state from venue_address for new shows
- Eventually remove city/state columns (in future migration)

### 4. Environment Variables

**Status**: ✅ Already configured

Verify `.env.local` contains:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

**Important**: Ensure the API key has these APIs enabled:
- Maps JavaScript API
- Places API
- Directions API
- Geocoding API (for migration)

### 5. Testing Checklist

#### Unit Tests
- [ ] Route segmentation with <25, =25, >25, >50 shows
- [ ] Distance calculations
- [ ] Coordinate validation

#### Integration Tests
- [ ] CSV import with address entry
- [ ] Show creation with venue address
- [ ] Map rendering with real coordinates
- [ ] Multi-segment route display

#### Manual Testing
1. [ ] Import a tour CSV
2. [ ] Enter venue addresses using Places Autocomplete
3. [ ] Validate all shows have addresses
4. [ ] Complete import
5. [ ] Open tour details modal
6. [ ] Verify map displays all stops
7. [ ] Test with tour >25 shows (verify segments)
8. [ ] Click markers to see info windows
9. [ ] Verify distance banners between segments

## 📋 Implementation Order

1. ✅ Database migration (DONE)
2. ✅ Install dependencies (DONE)
3. ✅ Create utility functions (DONE)
4. ✅ Create map component (DONE)
5. ✅ Integrate map into Tour Details Modal (DONE)
6. 🔄 Create PlacesAutocomplete component (NEXT)
7. 🔄 Update CSV import validation step
8. 🔄 Update backend API endpoints
9. 🔄 Test import flow end-to-end
10. 🔄 Migrate existing data (optional)
11. 🔄 Add error handling and edge cases
12. 🔄 Performance optimization and caching

## 🚀 Quick Start for Remaining Work

### To implement address entry in import:

1. Create `/src/components/maps/PlacesAutocomplete.tsx` (use code above)
2. Update `/src/app/import/components/Step3Validation.tsx`:
   - Add PlacesAutocomplete for each show
   - Update validation to require addresses
3. Update backend show creation endpoint to accept new fields
4. Test the flow

### To test the current implementation:

1. Ensure `.env.local` has `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. Start the dev server: `npm run dev`
3. Create or open a tour
4. Open Tour Details Modal
5. Click "Route" tab
6. You should see the map (will show fallback if no coordinates yet)

## 🐛 Known Issues / Edge Cases

1. **Shows without coordinates**: Currently displays a message. Consider:
   - Fallback to city/state geocoding on the fly
   - Allow inline editing in the map view

2. **API Rate Limits**: Google Maps APIs have quotas
   - Implement caching for geocoded addresses
   - Consider batch geocoding for migrations

3. **Very long tours**: Tours with 100+ shows may be slow
   - Consider pagination or virtual scrolling
   - Lazy load route segments

4. **Mobile responsiveness**: Test map component on mobile devices

## 📚 Resources

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Places Autocomplete](https://developers.google.com/maps/documentation/javascript/place-autocomplete)
- [Directions API](https://developers.google.com/maps/documentation/javascript/directions)
- [@react-google-maps/api Docs](https://react-google-maps-api-docs.netlify.app/)

## 💡 Future Enhancements

- Real-time distance calculation as user enters addresses
- Alternative route suggestions
- Integration with mapping services (MapQuest, Waze)
- Export route to Google Maps mobile app
- Estimated travel time between stops
- Hotel/restaurant suggestions along route
- Weather forecast integration
