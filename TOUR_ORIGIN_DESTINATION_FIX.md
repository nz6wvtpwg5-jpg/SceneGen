# Tour Origin & Destination Autocomplete Fix

## Problem Identified

The Google Places Autocomplete was not capturing selections properly. When users selected a city from the dropdown, the state variables remained empty (`customOriginCity: ''`, `customOriginState: ''`, etc.).

### Root Cause

The autocomplete initialization had a timing issue:

1. Modal opens with `useFirstShowAsOrigin = true` → Autocomplete **doesn't initialize**
2. User clicks "Enter a custom origin city" radio → `useFirstShowAsOrigin = false`
3. useEffect runs and creates autocomplete **BUT** the input field might already have text from previous interactions
4. When user selects from dropdown, the `place_changed` event wasn't firing or state wasn't updating

## Solution Implemented

### 1. Added Radio Button Handlers with State Reset

Created dedicated functions that:
- Clear all custom city state variables
- Clear the input field value
- Clear and reinitialize the autocomplete instance

```typescript
const handleEnableCustomOrigin = () => {
  console.log('🔄 [Origin] Switching to custom origin mode');
  setUseFirstShowAsOrigin(false);
  setCustomOriginCity('');
  setCustomOriginState('');
  setCustomOriginLat(undefined);
  setCustomOriginLng(undefined);

  // Clear the input field
  if (originInputRef.current) {
    originInputRef.current.value = '';
  }

  // Clear the autocomplete instance so it reinitializes
  if (originAutocompleteRef.current) {
    google.maps.event.clearInstanceListeners(originAutocompleteRef.current);
    originAutocompleteRef.current = null;
  }
};
```

### 2. Enhanced Logging Throughout

Added comprehensive console logging at every step:

**useEffect initialization:**
- Logs when triggered and all dependency values
- Logs whether initialization is skipped or proceeding
- Logs when autocomplete instance is created
- Logs when event listener is attached

**place_changed event:**
- Logs when event fires
- Logs the complete place object
- Logs geometry and address_components
- Logs extracted city/state/lat/lng
- Logs before and after setState calls

**handleConfirm:**
- Logs complete state at the start
- Logs each step of validation and geocoding
- Logs final values before calling parent's onConfirm

### 3. Updated Radio Buttons

Changed from inline anonymous functions to dedicated handlers:

**Before:**
```tsx
onChange={() => setUseFirstShowAsOrigin(false)}
```

**After:**
```tsx
onChange={handleEnableCustomOrigin}
```

## Testing Instructions

### Step 1: Open the Modal
1. Navigate to the import wizard
2. Click "Start Import" to open the Tour Origin & Destination modal
3. **Look for these logs in console:**
   ```
   🔧 [Origin Autocomplete useEffect] Triggered
   ⏭️ [Origin Autocomplete useEffect] Skipping initialization
   ```
   (It skips because useFirstShowAsOrigin is true initially)

### Step 2: Enable Custom Origin
1. Click the "Enter a custom origin city" radio button
2. **Look for these logs:**
   ```
   🔄 [Origin] Switching to custom origin mode
   🔧 [Origin Autocomplete useEffect] Triggered
   ✅ [Origin Autocomplete useEffect] Initializing autocomplete...
   ✅ [Origin Autocomplete useEffect] Autocomplete created, adding listener...
   ✅ [Origin Autocomplete useEffect] Setup complete!
   ```

### Step 3: Select a City
1. Type "Atlanta" in the origin city input
2. Wait for the Google Places dropdown to appear
3. Click on "Atlanta, GA, USA" from the dropdown
4. **Look for these logs:**
   ```
   🎯 [Origin Autocomplete] place_changed event fired!
   🌎 [Origin Autocomplete] Place object: {...}
   🌎 [Origin Autocomplete] Place geometry: {...}
   🌎 [Origin Autocomplete] Place address_components: [...]
   ✅ [Origin Autocomplete] Extracted: {city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388}
   📝 [Origin Autocomplete] About to call setState...
   ✅ [Origin Autocomplete] setState calls completed
   ```
5. **Check the UI:** You should see green text: `✓ Selected: Atlanta, GA`

### Step 4: Repeat for Destination
1. Click "Enter a custom destination city" radio
2. Type and select a city
3. Verify similar logs appear with `[Destination Autocomplete]` prefix

### Step 5: Click Continue
1. Click the "Continue" button
2. **Look for these logs:**
   ```
   🔍 [handleConfirm] Starting confirmation with state: {
     customOriginCity: "Atlanta",
     customOriginState: "GA",
     customOriginLat: 33.749,
     customOriginLng: -84.388,
     customDestinationCity: "Atlanta",
     customDestinationState: "GA",
     customDestinationLat: 33.749,
     customDestinationLng: -84.388
   }
   ✅ [handleConfirm] Origin set to: {city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388}
   ✅ [handleConfirm] Destination set to: {city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388}
   🚀 [handleConfirm] Calling onConfirm with: {origin: {...}, destination: {...}}
   ```
3. **In the parent component (Step3Validation):**
   ```
   📍 [Step3] Tour origin/destination selected: {origin: {...}, destination: {...}}
   📍 [Step3] Origin details: Atlanta, GA (33.749, -84.388)
   📍 [Step3] Destination details: Atlanta, GA (33.749, -84.388)
   ✅ [Step3] Custom origin saved to state
   ✅ [Step3] Custom destination saved to state
   ```

## Troubleshooting

### Issue: No logs appear when clicking radio button
**Cause:** JavaScript error or component not rendering
**Solution:** Check browser console for errors

### Issue: "place_changed event fired!" never appears
**Cause:** Autocomplete not initialized or event listener not attached
**Check logs for:**
- `✅ [Origin Autocomplete useEffect] Setup complete!` - If missing, autocomplete didn't initialize
- Any error logs starting with `❌`

### Issue: Event fires but state is empty
**Cause:** Place object missing required data
**Check logs for:**
- `⚠️ [Origin Autocomplete] Incomplete place data` warning
- The logged place object - does it have geometry and address_components?

### Issue: State still empty after selection
**Cause:** Maybe you're not selecting from the dropdown, just typing
**Solution:**
1. Clear the input (click the radio button again to reset)
2. Type the city name
3. **Wait for the dropdown to appear**
4. **Click on a suggestion** (don't just press Enter)

## Files Modified

1. **TourOriginDestinationModal.tsx**
   - Added `handleEnableCustomOrigin()` function
   - Added `handleEnableCustomDestination()` function
   - Enhanced all console logging
   - Updated radio button onChange handlers

2. **Step3Validation.tsx** (from previous changes)
   - Enhanced logging in `handleOriginDestinationConfirm()`

## Expected Console Output (Success Case)

```
🔧 [Origin Autocomplete useEffect] Triggered {isScriptLoaded: true, hasInputRef: true, hasAutocompleteRef: false, useFirstShowAsOrigin: false}
✅ [Origin Autocomplete useEffect] Initializing autocomplete...
✅ [Origin Autocomplete useEffect] Autocomplete created, adding listener...
✅ [Origin Autocomplete useEffect] Setup complete!

[User types and selects from dropdown]

🎯 [Origin Autocomplete] place_changed event fired!
🌎 [Origin Autocomplete] Place object: {address_components: Array(4), formatted_address: "Atlanta, GA, USA", geometry: {…}, ...}
🌎 [Origin Autocomplete] Place geometry: {location: LatLng, viewport: LatLngBounds}
🌎 [Origin Autocomplete] Place address_components: [{long_name: "Atlanta", short_name: "Atlanta", types: ["locality", "political"]}, ...]
✅ [Origin Autocomplete] Extracted: {city: "Atlanta", state: "GA", lat: 33.7489954, lng: -84.3879824}
📝 [Origin Autocomplete] About to call setState...
✅ [Origin Autocomplete] setState calls completed

[User clicks Continue]

🔍 [handleConfirm] Starting confirmation with state: {useFirstShowAsOrigin: false, customOriginCity: "Atlanta", customOriginState: "GA", customOriginLat: 33.7489954, ...}
✅ [handleConfirm] Origin set to: {city: "Atlanta", state: "GA", lat: 33.7489954, lng: -84.3879824}
🚀 [handleConfirm] Calling onConfirm with: {origin: {city: "Atlanta", state: "GA", lat: 33.7489954, lng: -84.3879824}, destination: null}

📍 [Step3] Tour origin/destination selected: {origin: {city: "Atlanta", state: "GA", lat: 33.7489954, lng: -84.3879824}, destination: null}
📍 [Step3] Origin details: Atlanta, GA (33.7489954, -84.3879824)
✅ [Step3] Custom origin saved to state
```

## Next Steps

1. Clear browser cache if needed
2. Refresh the page
3. Try the complete flow again
4. Watch the console logs at each step
5. Report back which log messages you see (or don't see)

The verbose logging will help us identify exactly where the flow is breaking if it still doesn't work.
