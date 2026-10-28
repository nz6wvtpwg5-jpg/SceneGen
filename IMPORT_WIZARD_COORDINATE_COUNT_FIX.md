# Import Wizard Coordinate Count Fix

## Issue Identified
The import wizard was showing "27 of 29 venues have valid coordinates" which appeared incorrect.

## Investigation Results

### Database State (✅ VERIFIED)
- **Total shows in database:** 27
- **Shows with coordinates:** 27 (100%)
- **All shows have complete address and coordinate data**

Verified by running `backend/check-all-shows-coordinates.js`:
```
=== SUMMARY ===
Shows with coordinates: 27
Shows without coordinates: 0
```

### CSV State (✅ VERIFIED)
- **Total rows in CSV:** 29
- **Actual show dates:** 27
- **Off days/Travel days:** 2
  - March 31, 2026 (off day)
  - April 6, 2026 (off day or travel day)

Verified by running `backend/compare-csv-to-db.js`:
```
📊 CSV shows: 29
📊 DB shows: 27
📊 Summary: 27 out of 29 CSV dates matched
```

### Matching Logic (✅ CORRECT)
The matching logic in Step3Validation.tsx correctly:
1. Compares CSV shows to DB shows by **date AND city** (not venue name)
2. Only adds shows to `showAddresses` if they have coordinates
3. Pre-fills addresses for all 27 matched shows

## Root Cause
The coordinate count was **technically correct** but **misleading**:
- It counted all 29 CSV rows, including 2 off days
- Off days don't need venue coordinates
- So "27 of 29" was correct, but should have been "27 of 27 shows" (excluding off days)

## Fix Applied

### Updated Coordinate Count Logic
Changed the count in `Step3Validation.tsx` (lines 1188-1210) to:
- **Only count regular shows** (type === 'show')
- **Exclude off days and travel days** from both numerator and denominator

```tsx
{(() => {
  // Count only regular shows (not off days or travel days)
  let totalRegularShows = 0;
  let regularShowsWithCoords = 0;

  importData.shows.forEach((_, idx) => {
    const type = showTypes[idx] || 'show';
    if (type === 'show') {
      totalRegularShows++;
      const addr = showAddresses[idx];
      if (addr && addr.lat && addr.lng) {
        regularShowsWithCoords++;
      }
    }
  });

  return `${regularShowsWithCoords} of ${totalRegularShows} venues have valid coordinates`;
})()}
```

## Expected Result
After this fix, the import wizard should show:
- **"27 of 27 venues have valid coordinates"** ✅
- Off days will still be shown in the list but won't be counted in the coordinate tally
- All already-saved shows will display as read-only with an "Edit" button
- New shows (off days) will have editable address fields

## Verification Steps
1. Load the import wizard with the test CSV
2. Verify the coordinate count shows "27 of 27" instead of "27 of 29"
3. Verify that:
   - All 27 show dates display as "Already Saved" with pre-filled addresses
   - March 31 and April 6 display as "Off Day" or "Travel Day" with editable fields
   - The address fields for already-saved shows are read-only unless "Edit" is clicked

## Files Modified
- `/src/app/import/components/Step3Validation.tsx` - Updated coordinate count logic

## Related Scripts
- `/backend/check-all-shows-coordinates.js` - Verifies all DB shows have coordinates
- `/backend/compare-csv-to-db.js` - Compares CSV dates to DB shows
- `/backend/check-specific-shows.js` - Inspects specific shows by date

## Status
✅ **FIX COMPLETE** - Coordinate count now correctly excludes off days and travel days
