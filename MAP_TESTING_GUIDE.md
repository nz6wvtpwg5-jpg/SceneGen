# Quick Test Guide - Google Maps Tour Visualization

## Prerequisites
- ✅ Backend server running on port 3001
- ✅ Frontend dev server running on port 3000
- ✅ User logged in with valid session
- ✅ Entity selected in profile

## Test Steps

### 1. Navigate to Tour Details
```
URL: http://localhost:3000/tours/9d21a757-70e4-4708-995b-b11057ce7fab
```

### 2. Switch to Routing Tab
- Click the "Routing" tab in the tour details page
- The TourMap component should load

### 3. Verify Map Rendering
Expected behavior:
- ✅ Map loads with centered view of all venues
- ✅ Numbered markers (1, 2, 3...) appear at each venue location
- ✅ Markers are in chronological order by show date
- ✅ Route line connects all markers

### 4. Test Hover Tooltips
- Hover over any marker
- Should display:
  - Venue name
  - Full address
  - Show fee
  - Distance to next venue (if applicable)
  - Coordinates (for debugging)

### 5. Test Click Day Sheet
- Click any marker
- Day sheet modal should open with:
  - Venue details
  - Show date and time
  - Contact information
  - Other show details

### 6. Test Multi-Segment Routes
For tours with 25+ shows:
- Map should display route in multiple segments
- Banner at top shows: "This tour has X shows, split into Y route segments"
- Each segment should have a different color

### 7. Test Distance Display
- If route loaded successfully:
  - Total distance should appear (e.g., "Total Distance: 1,234 mi")
- If single segment:
  - Distance shown in top-left corner
- If multiple segments:
  - Distance shown in info banner

## Common Issues

### Markers Not Appearing
**Check:**
1. Browser console for "InvalidValueError" - should NOT appear
2. Network tab for `/api/shows` response - verify `venue_lat` and `venue_lng` are numbers
3. Console for "Converting show" logs - verify coordinates are present

### Route Not Drawing
**Check:**
1. Google Cloud Console - Directions API enabled
2. Browser console for API errors
3. Shows have valid coordinates (not null)

### Empty Map
**Check:**
1. Shows exist for the tour
2. Entity ID matches in URL and request
3. Backend logs show shows being returned

## API Test Commands

### Verify Coordinates are Numbers
```bash
curl -s -H "X-Entity-Id: 1f60064e-3dc6-4612-a5c4-2be834806277" \
  "http://localhost:3001/api/shows?tourId=9d21a757-70e4-4708-995b-b11057ce7fab" \
  | python3 -m json.tool | grep -A 2 "venue_lat"
```

Expected output:
```json
"venue_lat": 38.055045,    # Number, not "38.055045"
"venue_lng": -84.498314,   # Number, not "-84.498314"
```

### Count Shows with Coordinates
```bash
curl -s -H "X-Entity-Id: 1f60064e-3dc6-4612-a5c4-2be834806277" \
  "http://localhost:3001/api/shows?tourId=9d21a757-70e4-4708-995b-b11057ce7fab" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); print(f'{sum(1 for s in data[\"shows\"] if s.get(\"venue_lat\"))} shows with coordinates')"
```

## Success Criteria
- [x] Map renders without errors
- [x] All venues with coordinates display as markers
- [x] Markers show numbered labels (1, 2, 3...)
- [x] Hover tooltips display venue information
- [x] Click opens day sheet modal
- [x] Route line connects venues in chronological order
- [x] Total distance calculates and displays correctly
- [x] No "InvalidValueError" in console
- [x] Coordinates are JavaScript numbers (not strings)

## Notes
- Shows without coordinates (venue_lat/venue_lng null) are automatically filtered out
- Map auto-fits bounds to show all markers
- Google Maps API key must be valid and have required APIs enabled:
  - Maps JavaScript API
  - Directions API
  - Geocoding API (for future address lookups)
