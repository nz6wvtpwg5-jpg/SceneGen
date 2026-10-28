# Google Maps Marker Fix - Complete

## Issue Summary
Google Maps markers were not displaying in the TourMap component due to an **InvalidValueError: setPosition: not a LatLng or LatLngLiteral: in property lat: not a number** error.

## Root Cause
The PostgreSQL database was returning `venue_lat` and `venue_lng` as **strings** (NUMERIC/DECIMAL type) instead of numbers, causing Google Maps to reject the coordinates.

Example of the problem:
```javascript
// What the database returned:
venue_lat: "38.05504500"  // String!
venue_lng: "-84.49831400" // String!

// What Google Maps expects:
venue_lat: 38.055045  // Number
venue_lng: -84.498314 // Number
```

## Solution Implemented

### 1. Backend Fix (server.js)
**File:** `/backend/server.js`

Added coordinate type conversion in the `/api/shows` endpoint:

```javascript
// Convert lat/lng to numbers (they come from DB as strings/numeric)
const venueLat = camelShow.venueLat ? parseFloat(camelShow.venueLat) : null;
const venueLng = camelShow.venueLng ? parseFloat(camelShow.venueLng) : null;

const mapped = {
  ...camelShow,
  // ... other fields ...
  venue_lat: venueLat,  // Include coordinates for map (as number)
  venue_lng: venueLng,  // Include coordinates for map (as number)
};
```

### 2. Backend Auth Fix (server.js)
**File:** `/backend/server.js`

Fixed entity ID resolution to work with both header and query parameter:

```javascript
// Use entityId from authMiddleware (req.entityId), fallback to query param
const entityId = req.entityId || req.query.entityId;
```

This allows the frontend to pass `X-Entity-Id` as a header (which the authMiddleware extracts) instead of requiring it as a query parameter.

### 3. Frontend Coordinate Mapping (routeUtils.ts)
**File:** `/src/lib/maps/routeUtils.ts`

The `convertShowForMap` function already had flexible field name checking:

```typescript
const lat = (show as any).venue_lat
  ?? (show as any).venueLat
  ?? (show as any).latitude
  ?? (show as any).lat;

const lng = (show as any).venue_lng
  ?? (show as any).venueLng
  ?? (show as any).longitude
  ?? (show as any).lng;
```

This ensures compatibility with various field naming conventions.

## Verification

Test the API response:
```bash
curl -H "X-Entity-Id: 1f60064e-3dc6-4612-a5c4-2be834806277" \
  "http://localhost:3001/api/shows?tourId=9d21a757-70e4-4708-995b-b11057ce7fab" \
  | python3 -m json.tool
```

Verify coordinates are numbers:
```json
{
  "venueName": "The Green Lantern",
  "venueAddress": "497 W 3rd St, Lexington, KY 40508, USA",
  "venue_lat": 38.055045,  // ✅ Number (float)
  "venue_lng": -84.498314   // ✅ Number (float)
}
```

## Files Modified

1. `/backend/server.js` - Added `parseFloat()` conversion for coordinates
2. `/backend/server.js` - Fixed entity ID resolution in `/api/shows` endpoint
3. `/src/lib/maps/routeUtils.ts` - Removed debug logging (functionality unchanged)
4. `/src/hooks/useShows.ts` - Removed debug logging (functionality unchanged)

## Map Features Now Working

✅ **Markers Display** - Shows now render as numbered markers on the map
✅ **Hover Tooltips** - Venue name, address, fee, and distance to next show
✅ **Clickable Day Sheets** - Click markers to view show details
✅ **Route Visualization** - Multi-segment routes for tours with 25+ shows
✅ **Distance Calculation** - Total tour distance displayed
✅ **Auto-fit Bounds** - Map automatically zooms to show all venues

## Testing

To test the map:
1. Navigate to a tour details page (e.g., `/tours/9d21a757-70e4-4708-995b-b11057ce7fab`)
2. Click the "Routing" tab
3. Verify that:
   - Markers appear at each venue location
   - Hovering shows tooltip with venue details
   - Clicking opens day sheet modal
   - Route line connects all venues in chronological order
   - Total distance is displayed

## Database Schema Reference

The `shows` table includes these coordinate fields:
- `venue_lat` - NUMERIC(10, 8) - Stored as decimal, returned as string
- `venue_lng` - NUMERIC(11, 8) - Stored as decimal, returned as string

These are now properly converted to JavaScript numbers before sending to the frontend.

## Status
✅ **COMPLETE** - Google Maps markers now display correctly with proper numeric coordinates.
