# Tour Origin & Destination Dropdown Test Guide

## Overview
This guide will help you verify that the Google Places Autocomplete dropdowns in the Tour Origin & Destination modal are working correctly and saving the selected cities with their coordinates.

## Setup
Make sure your frontend dev server is running and you have the browser console open (right-click > Inspect > Console tab).

## Test Procedure

### Test 1: Origin City Selection from Dropdown

1. **Open the modal**: Navigate to the import wizard and get to the point where the Tour Origin & Destination modal appears
2. **Select custom origin**: Click the "Enter a custom origin city" radio button
3. **Type in the city field**: Start typing "Atlanta" in the origin city field
4. **Wait for dropdown**: A dropdown should appear with city suggestions (e.g., "Atlanta, GA, USA")
5. **Select from dropdown**: Click on "Atlanta, GA, USA" from the dropdown (don't just type and hit Enter)
6. **Check console**: Look for these log messages:
   ```
   🌎 [Origin Autocomplete] Place selected: {object with geometry and address_components}
   ✅ [Origin Autocomplete] Extracted: {city: "Atlanta", state: "GA", lat: ..., lng: ...}
   ```
7. **Check UI feedback**: Below the input field, you should see:
   ```
   ✓ Selected: Atlanta, GA
   ```

### Test 2: Destination City Selection from Dropdown

1. **Select custom destination**: Click the "Enter a custom destination city" radio button
2. **Type in the city field**: Start typing "Atlanta" in the destination city field
3. **Wait for dropdown**: A dropdown should appear with city suggestions
4. **Select from dropdown**: Click on "Atlanta, GA, USA" from the dropdown
5. **Check console**: Look for these log messages:
   ```
   🌎 [Destination Autocomplete] Place selected: {object}
   ✅ [Destination Autocomplete] Extracted: {city: "Atlanta", state: "GA", lat: ..., lng: ...}
   ```
6. **Check UI feedback**: You should see:
   ```
   ✓ Selected: Atlanta, GA
   ```

### Test 3: Verify Data is Saved on Continue

1. **With both cities selected from dropdowns**, click the "Continue" button
2. **Check console for handleConfirm logs**:
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
3. **Check parent component logs**:
   ```
   📍 [Step3] Tour origin/destination selected: {origin: {...}, destination: {...}}
   📍 [Step3] Origin details: Atlanta, GA (33.749, -84.388)
   📍 [Step3] Destination details: Atlanta, GA (33.749, -84.388)
   ✅ [Step3] Custom origin saved to state
   ✅ [Step3] Custom destination saved to state
   ```

### Test 4: Fallback Geocoding (User Types but Doesn't Select)

1. **Open the modal again**
2. **Select custom origin**
3. **Type a city name** (e.g., "Los Angeles") but **DO NOT select from dropdown**
   - Just type and then immediately click "Continue"
4. **You should get an alert**: "Please enter both city and state for the origin"
   - This is expected because without selecting from the dropdown, the state variables aren't populated
5. **Alternative**: If you want to test fallback geocoding, you'd need to manually set both city and state fields (but currently we only have one field with autocomplete)

## Expected Behaviors

### ✅ What Should Work
- [ ] Typing in the city field shows Google Places suggestions
- [ ] Clicking a suggestion from the dropdown populates the city, state, lat, and lng in component state
- [ ] Green checkmark "✓ Selected: City, State" appears below the input after selection
- [ ] Clicking "Continue" with valid selections passes the data to the parent component
- [ ] Console shows all the debug logs confirming data flow
- [ ] Modal closes after clicking "Continue"
- [ ] Import proceeds with the custom origin/destination coordinates for distance calculations

### ❌ What Should NOT Happen
- [ ] Dropdown doesn't appear (check: is Google Maps script loaded? Check console for errors)
- [ ] Selecting from dropdown doesn't update the "Selected:" text below the input
- [ ] Console shows `⚠️ [Origin/Destination Autocomplete] Incomplete place data`
- [ ] Clicking "Continue" shows alert "Please enter both city and state"
- [ ] Console logs show empty or undefined values for city/state/lat/lng

## Troubleshooting

### Issue: Dropdown doesn't appear
- **Check**: Is Google Maps API key set in environment variables?
- **Check console** for: "Google Maps API key not found" or script loading errors
- **Solution**: Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env.local`

### Issue: Selection doesn't update state
- **Check console** for the autocomplete logs
- **If logs show place_changed event but no city/state**: The place might be missing address_components
- **Try a different city**: Some places might not have all the required data

### Issue: Alert appears even after selecting from dropdown
- **This means state wasn't updated**
- **Check**: Did you actually click a suggestion, or just type and press Enter?
- **Check console**: Look for the "✅ Extracted" log to confirm data was captured

### Issue: Coordinates are undefined
- **Check**: The place object must have `geometry.location`
- **Some places** might not have coordinates - try a major city like "Atlanta, GA" or "Los Angeles, CA"

## Visual Confirmation

In your screenshot, I can see:
- ✅ The modal is open
- ✅ Custom origin radio is selected
- ✅ Custom destination radio is selected
- ✅ "atlanta" is typed in both fields (lowercase)
- ❌ I don't see the green "✓ Selected: Atlanta, GA" text below either field

**This suggests**: You typed "atlanta" but didn't select from the autocomplete dropdown yet.

**Next step**:
1. Look for the dropdown menu that should appear below the input
2. Click on "Atlanta, GA, USA" from that dropdown
3. The "✓ Selected:" text should appear
4. Then click Continue

## Success Criteria

The test is successful when:
1. ✅ You can select a city from the autocomplete dropdown for origin
2. ✅ You can select a city from the autocomplete dropdown for destination
3. ✅ The "✓ Selected: City, State" confirmation appears for both
4. ✅ All console logs show complete data with coordinates
5. ✅ Clicking Continue passes the data to the parent component
6. ✅ The modal closes and import proceeds
7. ✅ Distance calculations use the custom origin/destination coordinates

## Additional Notes

- The autocomplete only works when the radio button for custom city is selected
- You must click a suggestion from the dropdown - typing alone won't work
- The inputs are uncontrolled (no value prop) to allow Google Places to manage them
- If Google Maps script isn't loaded yet, the input will be disabled and show "Loading location search..."
