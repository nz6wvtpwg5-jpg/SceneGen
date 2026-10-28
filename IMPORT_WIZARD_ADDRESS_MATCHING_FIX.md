# Import Wizard: Show Address Matching Fix ✅

## Problem
When adding shows to an existing tour via CSV import, the coordinate counter showed "0 of 29 venues have valid coordinates" even though the shows already existed in the database with valid coordinates.

## Root Cause
The issue was in how existing show addresses were being mapped to CSV show indices:

### Before (Incorrect)
```typescript
// In fetchExistingTourShows()
shows.forEach((show: any, index: number) => {
  if (show.venue_lat && show.venue_lng) {
    addresses[index] = {  // ❌ Using existingShow index
      address: show.venue_address,
      lat: show.venue_lat,
      lng: show.venue_lng,
      // ...
    };
  }
});
```

**Problem:**
- `existingShows[0]` = First show from database (e.g., "Los Angeles show")
- `importData.shows[0]` = First show from CSV (e.g., "New York show")
- `addresses[0]` was set to Los Angeles coordinates
- But the code displayed `importData.shows[0]` (New York) with `addresses[0]` (Los Angeles coords)
- **Result:** Mismatched indices, so coordinates appeared to be missing!

## Solution
Created a new `useEffect` that properly matches existing shows to CSV shows by **date and venue**, not by array position:

```typescript
useEffect(() => {
  if (!importData || !existingShows || existingShows.length === 0) {
    return;
  }

  const addresses: Record<number, any> = {};
  const types: Record<number, 'show' | 'off_day' | 'travel_day'> = {};

  // For each CSV show, find matching existing show
  importData.shows.forEach((csvShow, csvIndex) => {
    const matchingExistingShow = existingShows.find((existingShow: any) => {
      const dateMatch = existingShow.date === csvShow.date;
      const venueMatch = existingShow.venueName?.toLowerCase() === csvShow.venueName?.toLowerCase();
      const cityMatch = existingShow.city?.toLowerCase() === csvShow.city?.toLowerCase();
      return dateMatch && (venueMatch || cityMatch);
    });

    if (matchingExistingShow) {
      // ✅ Use CSV index, not existing show index
      if (matchingExistingShow.venue_lat && matchingExistingShow.venue_lng) {
        addresses[csvIndex] = {
          address: matchingExistingShow.venue_address,
          lat: matchingExistingShow.venue_lat,
          lng: matchingExistingShow.venue_lng,
          name: matchingExistingShow.venueName,
          city: matchingExistingShow.city,
          state: matchingExistingShow.state,
        };
      }
      types[csvIndex] = matchingExistingShow.show_type || 'show';
    }
  });

  setShowAddresses(addresses);
  setShowTypes(types);
}, [importData, existingShows]);
```

## How It Works Now

### Scenario: Adding shows to existing tour with 29 shows

1. **CSV has 29 shows:**
   - Index 0: "Venue A" on "2026-03-15"
   - Index 1: "Venue B" on "2026-03-16"
   - ...
   - Index 28: "Venue Z" on "2026-04-12"

2. **Database has 29 existing shows:**
   - Array index 0: "Venue A" on "2026-03-15" (lat: 34.0, lng: -118.0)
   - Array index 1: "Venue B" on "2026-03-16" (lat: 36.0, lng: -115.0)
   - ...

3. **Matching Process:**
   - For CSV show 0 ("Venue A" on "2026-03-15"):
     - Find existing show where date="2026-03-15" AND venue="Venue A"
     - Found! Set `addresses[0]` = existing show's coordinates
   - For CSV show 1 ("Venue B" on "2026-03-16"):
     - Find existing show where date="2026-03-16" AND venue="Venue B"
     - Found! Set `addresses[1]` = existing show's coordinates
   - Repeat for all 29 shows...

4. **Result:**
   - `showAddresses` now has 29 entries with correct lat/lng
   - Counter displays: "29 of 29 venues have valid coordinates" ✅
   - All shows show "Already Saved" badge ✅
   - Address inputs are disabled by default ✅

## Benefits
✅ **Correct coordinate counting** - Shows proper "X of Y venues have valid coordinates"
✅ **Proper index alignment** - CSV show indices match address indices
✅ **Accurate "Already Saved" detection** - Shows are correctly identified as existing
✅ **Pre-filled addresses** - Existing coordinates are displayed immediately
✅ **Handles mixed imports** - Works when CSV has both new and existing shows

## Example Console Output
```
🔍 Matching existing shows to CSV shows...
   Existing shows: 29
   CSV shows: 29
   ✅ CSV show 0 matches existing show: Lexington
   ✅ CSV show 1 matches existing show: Murfreesboro
   ✅ CSV show 2 matches existing show: Nashville
   ...
   ✅ CSV show 28 matches existing show: Charlotte
   📍 Pre-filled 29 addresses
```

## Files Modified
- `/src/app/import/components/Step3Validation.tsx`
  - Removed incorrect index-based matching in `fetchExistingTourShows`
  - Added new `useEffect` with proper date/venue-based matching
  - Moved tour origin/destination setting to new useEffect

## Testing
1. Navigate to existing tour with shows
2. Click "Edit Tour" → "Add Shows from CSV"
3. Upload CSV with same shows
4. On Step 3, verify:
   - Counter shows "29 of 29 venues have valid coordinates" (or correct count)
   - All existing shows have "Already Saved" badge
   - Addresses are displayed in read-only inputs
   - Console shows matching logs

## Status: ✅ COMPLETE
The coordinate counting now works correctly by properly matching CSV shows to existing shows by date and venue, not by array position.
