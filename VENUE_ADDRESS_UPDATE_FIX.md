# Venue Address Update - City Mismatch Detection Fix

## Issue
When updating a venue address after initially entering one, the city mismatch dialog was not working correctly. The system was always comparing against the original CSV city instead of the currently stored city.

## Root Cause
The `handleAddressChange` function was comparing the new city from Google Places against `show.city` (the original CSV city), even if the user had already updated the city through a previous address selection.

## Solution
Updated the city mismatch detection to check against the **currently stored city** in `showAddresses[index]` if it exists, otherwise fall back to the CSV city.

### Changes Made

#### 1. Updated `handleAddressChange` function
**File:** `/src/app/import/components/Step3Validation.tsx`

```typescript
const handleAddressChange = (
  showIndex: number,
  address: string,
  lat: number,
  lng: number,
  name?: string,
  city?: string,
  state?: string
) => {
  console.log(`📍 Address selected for show ${showIndex}:`, { address, lat, lng, name, city, state });

  // Check if city from Google Places matches the currently stored city
  const show = importData?.shows[showIndex];
  const currentStoredCity = showAddresses[showIndex]?.city || show?.city;

  if (show && city && currentStoredCity && city.toLowerCase() !== currentStoredCity.toLowerCase()) {
    // City mismatch detected - show confirmation dialog
    const currentStoredState = showAddresses[showIndex]?.state || show?.state;
    setCityMismatch({
      showIndex,
      csvCity: currentStoredCity,  // Now uses currently stored city
      csvState: currentStoredState, // Now uses currently stored state
      newCity: city,
      newState: state,
      addressData: { address, lat, lng, name, city, state }
    });
    return; // Don't save yet - wait for user confirmation
  }

  // No mismatch or user confirmed - save the address
  setShowAddresses(prev => ({
    ...prev,
    [showIndex]: { address, lat, lng, name, city, state }
  }));
};
```

#### 2. Fixed `handleCityMismatchConfirm` function
**File:** `/src/app/import/components/Step3Validation.tsx`

```typescript
const handleCityMismatchConfirm = (useNewCity: boolean) => {
  if (!cityMismatch) return;

  const { showIndex, addressData, csvCity, csvState } = cityMismatch;

  // Save the address data
  setShowAddresses(prev => ({
    ...prev,
    [showIndex]: useNewCity
      ? addressData // Use city/state from Google Places
      : { ...addressData, city: csvCity, state: csvState } // Keep current city/state
  }));

  setCityMismatch(null); // Close dialog
};
```

**Previous bug:** When user chose to keep the current city, we were setting `city: undefined` and `state: undefined`, which caused confusion on subsequent updates.

**Fix:** Now explicitly stores the city/state that the user wants to keep (either from CSV or previous selection).

## Behavior After Fix

### Scenario 1: First Address Entry
1. User enters venue address via Google Places Autocomplete
2. If Google Places city doesn't match CSV city → City mismatch dialog appears
3. User chooses to keep CSV city or use new city
4. Address saved with the chosen city/state

### Scenario 2: Updating Address (after initial entry)
1. User updates the venue address
2. System compares new Google Places city against **currently stored city** (not CSV)
3. If cities don't match → City mismatch dialog appears
4. User confirms which city to use
5. Address updated with the chosen city/state

### Scenario 3: Multiple Updates
1. Each time the user updates an address, the comparison is always against the **last confirmed city**
2. This prevents false positives where the dialog would appear even when re-selecting the same venue
3. The dialog only appears when there's a genuine city change

## Testing Checklist
- [ ] Import CSV with city "Atlanta, GA"
- [ ] Enter address for a venue in "Athens, GA" → Dialog should appear
- [ ] Choose "Use New City (Athens)" → Address saved with Athens, GA
- [ ] Update same show with another Athens venue → No dialog (same city)
- [ ] Update same show with Atlanta venue → Dialog appears (city changed from Athens to Atlanta)
- [ ] Choose "Keep Current City (Athens)" → Address saved with Athens, GA but new coordinates
- [ ] Verify all coordinates and cities are saved correctly in the database

## Files Changed
- `/src/app/import/components/Step3Validation.tsx`

## Related Documentation
- [VENUE_NAME_PRESERVATION_FIX.md](./VENUE_NAME_PRESERVATION_FIX.md)
- [GOOGLE_CALENDAR_VENUE_FIELDS_COMPLETE.md](./GOOGLE_CALENDAR_VENUE_FIELDS_COMPLETE.md)
- [CALENDAR_VENUE_FIELDS_GUIDE.md](./CALENDAR_VENUE_FIELDS_GUIDE.md)
