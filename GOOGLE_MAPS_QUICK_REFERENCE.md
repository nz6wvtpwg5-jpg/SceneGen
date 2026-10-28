# Google Maps Integration - Quick Reference

## 🎯 What Was Built

A complete Google Maps tour route visualization system that:
- Displays all tour stops on an interactive map
- Automatically segments routes with >25 stops to comply with Google Maps API limits
- Shows numbered markers, routes, and distances
- Integrates into the Tour Details Modal

## 📦 Package Installation

```bash
npm install @react-google-maps/api --legacy-peer-deps
```

## 🗄️ Database Migration

```bash
# Run this migration (already executed):
psql -d your_database -f backend/migrations/add_venue_address_fields.sql
```

Adds to `shows` table:
- `venue_address TEXT`
- `venue_lat DOUBLE PRECISION`
- `venue_lng DOUBLE PRECISION`

## 🔑 Environment Variable

Add to `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## 📁 File Structure

```
src/
├── components/
│   ├── maps/
│   │   ├── TourMap.tsx              # Main map component
│   │   └── PlacesAutocomplete.tsx   # Address search input
│   ├── tours/
│   │   └── TourDetailsModal.tsx     # Updated with map integration
│   └── ui/
│       ├── alert.tsx                # New: error display
│       ├── input.tsx                # New: text input
│       └── label.tsx                # New: form label
└── lib/
    └── maps/
        └── routeUtils.ts            # Route segmentation utilities

backend/
└── migrations/
    └── add_venue_address_fields.sql # Database schema update
```

## 🚀 Usage

### Display Tour Route

```tsx
import { TourMap } from '@/components/maps/TourMap';

// In your component:
<TourMap shows={shows} />
```

Where `shows` is an array of:
```typescript
interface Show {
  id: string;
  date: string;
  venue_name: string;
  venue_address?: string | null;
  venue_lat?: number | null;
  venue_lng?: number | null;
  city?: string;
  state?: string;
  fee: number;
}
```

### Address Input with Autocomplete

```tsx
import { PlacesAutocomplete } from '@/components/maps/PlacesAutocomplete';

<PlacesAutocomplete
  value={address}
  onChange={(address, lat, lng) => {
    // Handle the selected address and coordinates
    console.log('Address:', address);
    console.log('Coordinates:', lat, lng);
  }}
  label="Venue Address"
  placeholder="Search for venue"
/>
```

## 🔧 Utility Functions

```typescript
import {
  segmentRoute,
  getSegmentColor,
  calculateDistance,
  formatDistance,
  hasValidCoordinates,
  getShowsWithCoordinates
} from '@/lib/maps/routeUtils';

// Segment a route with >25 shows
const segments = segmentRoute(shows);

// Get color for segment index
const color = getSegmentColor(0); // Returns '#3B82F6' (blue)

// Calculate distance between coordinates
const miles = calculateDistance(
  { lat: 40.7589, lng: -73.9851 },
  { lat: 34.0522, lng: -118.2437 }
);

// Format distance for display
const formatted = formatDistance(2789.4); // Returns "2,789 mi"

// Check if show has valid coordinates
if (hasValidCoordinates(show)) {
  // Show can be displayed on map
}

// Filter shows to only those with coordinates
const validShows = getShowsWithCoordinates(shows);
```

## 🎨 Segment Colors

Routes are automatically colored based on segment:
1. Blue (#3B82F6)
2. Green (#10B981)
3. Purple (#8B5CF6)
4. Orange (#F59E0B)
5. Pink (#EC4899)
6. Teal (#14B8A6)

## 📊 Route Segmentation

For tours with >25 shows:
- Each segment: 25 locations max (1 origin + 23 waypoints + 1 destination)
- Segments overlap by 2 shows for continuity
- Each segment gets a unique color
- Distance banners show total miles per segment

Example for 60 shows:
```
Segment 1: Shows 1-25   (Blue)
Segment 2: Shows 23-48  (Green)
Segment 3: Shows 46-60  (Purple)
```

## 🔍 Features

### TourMap Component
- ✅ Numbered markers for each show
- ✅ Info windows with show details
- ✅ Multi-colored route polylines
- ✅ Distance banners between segments
- ✅ Auto-fit bounds to show all markers
- ✅ Loading states
- ✅ Error handling

### PlacesAutocomplete Component
- ✅ Google Places search integration
- ✅ Automatic coordinate extraction
- ✅ Form validation support
- ✅ Error messages
- ✅ Loading states

## 🐛 Troubleshooting

### Map doesn't load
```bash
# Check API key
echo $NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Restart dev server
npm run dev
```

### TypeScript errors
```bash
# Restart TS server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild
rm -rf .next
npm run dev
```

### No markers appear
Check database:
```sql
SELECT COUNT(*) FROM shows
WHERE venue_lat IS NOT NULL
  AND venue_lng IS NOT NULL;
```

## 📚 Documentation

- **Summary**: `GOOGLE_MAPS_SUMMARY.md`
- **Implementation Plan**: `GOOGLE_MAPS_IMPLEMENTATION_PLAN.md`
- **Testing Guide**: `GOOGLE_MAPS_TESTING_GUIDE.md`

## ✅ What's Working

- [x] Database schema with venue address fields
- [x] Map component with route visualization
- [x] Multi-segment route handling for large tours
- [x] Marker info windows
- [x] Distance calculations
- [x] Google Places autocomplete component
- [x] Integration into Tour Details Modal

## 🔄 Next Steps

- [ ] Integrate PlacesAutocomplete into CSV import flow
- [ ] Update backend API to accept venue address fields
- [ ] Geocode existing shows (optional migration)
- [ ] Add validation requiring addresses for new shows
- [ ] Test end-to-end import → view route workflow

## 💻 Code Examples

### Complete Example: Tour Details with Map

```tsx
'use client';

import { TourMap } from '@/components/maps/TourMap';

export function TourDetails({ tourId }: { tourId: string }) {
  const [shows, setShows] = useState([]);

  useEffect(() => {
    fetchShows(tourId).then(setShows);
  }, [tourId]);

  return (
    <div className="h-[600px] w-full">
      <TourMap shows={shows} />
    </div>
  );
}
```

### Complete Example: Address Input Form

```tsx
'use client';

import { useState } from 'react';
import { PlacesAutocomplete } from '@/components/maps/PlacesAutocomplete';
import { Button } from '@/components/ui/button';

export function VenueForm() {
  const [venue, setVenue] = useState({
    address: '',
    lat: 0,
    lng: 0
  });

  const handleSubmit = async () => {
    await fetch('/api/shows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_address: venue.address,
        venue_lat: venue.lat,
        venue_lng: venue.lng,
        // ...other show fields
      })
    });
  };

  return (
    <form>
      <PlacesAutocomplete
        value={venue.address}
        onChange={(address, lat, lng) => {
          setVenue({ address, lat, lng });
        }}
        label="Venue Address"
      />

      <Button onClick={handleSubmit}>Save Show</Button>
    </form>
  );
}
```

## 🎓 API Documentation

### Google APIs Required
Enable in Google Cloud Console:
- Maps JavaScript API
- Places API
- Directions API
- Geocoding API (for migrations)

### API Key Restrictions
Recommended restrictions:
- **Application restrictions**: HTTP referrers
- **Website restrictions**: `localhost:3000`, `yourapp.com`
- **API restrictions**: Select only needed APIs

## 📱 Responsive Design

The map component is responsive:
- Desktop: Full modal width/height
- Tablet: Optimized layout
- Mobile: May need testing/adjustments

## 🎯 Performance

Optimizations included:
- Database indices on lat/lng columns
- Client-side route calculation (no backend calls)
- Lazy loading of Google Maps API
- Filtered queries (only shows with coordinates)

---

**Ready to use!** See testing guide for verification steps.
