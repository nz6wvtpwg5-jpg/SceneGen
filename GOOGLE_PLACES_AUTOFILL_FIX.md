# Google Places Auto-Fill Enhancement

## Issue
When searching for a venue using Google Places Autocomplete (e.g., "Rockefeller Oslo"), only the Venue Name and Address were being filled. The City, State, and Country fields remained empty, requiring manual entry before saving.

## Root Cause
The `handlePlaceSelect` function in `CreateShowForm.tsx` was using a single address component type for each field:
- **City**: Only looked for `locality`
- **State**: Only looked for `administrative_area_level_1`
- **Country**: Only looked for `country`

**Problem**: International addresses (especially in Europe) often use different address component types:
- Cities might be labeled as `postal_town` or `administrative_area_level_2`
- Some countries don't use "states" the same way the US does
- Address structure varies significantly by country

## Solution Applied

### Enhanced `handlePlaceSelect` Function

**Before:**
```tsx
venueCity: addressComponents.find(c => c.types.includes('locality'))?.long_name || '',
venueState: addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '',
venueCountry: addressComponents.find(c => c.types.includes('country'))?.long_name || '',
```

**After:**
```tsx
// Helper function to try multiple address component types
const getComponent = (types: string[], useShortName = false) => {
    for (const type of types) {
        const component = addressComponents.find(c => c.types.includes(type));
        if (component) {
            return useShortName ? component.short_name : component.long_name;
        }
    }
    return '';
};

// Try multiple types for city (handles international addresses)
const city = getComponent(['locality', 'postal_town', 'administrative_area_level_2']);

// Try multiple types for state/region
const state = getComponent(['administrative_area_level_1'], true);

// Get country
const country = getComponent(['country']);
```

### Key Improvements

1. **Fallback Strategy**: Tries multiple address component types in order of preference
2. **International Support**: 
   - `locality` → standard city
   - `postal_town` → UK and some European cities
   - `administrative_area_level_2` → regions/municipalities in some countries
3. **Debug Logging**: Added console logs to see what Google returns
4. **Robust**: Returns empty string if no match found (prevents crashes)

## How It Works Now

1. **User types** "Rockefeller Oslo" in Venue Name field
2. **Google suggests** "Rockefeller Mariboes gate, Oslo, Norway"
3. **User clicks** the suggestion
4. **System auto-fills**:
   - ✅ Venue Name: "Rockefeller"
   - ✅ Venue Address: "Mariboes gate 5B, 0183 Oslo, Norway"
   - ✅ City: "Oslo" (from `locality` or `postal_town`)
   - ✅ State: "Oslo" (from `administrative_area_level_1`)
   - ✅ Country: "Norway"
5. **User can save** immediately without manual field entry

## Supported Address Structures

### United States
- City: `locality`
- State: `administrative_area_level_1` (e.g., "CA", "NY")
- Country: `country` (e.g., "United States")

### United Kingdom
- City: `postal_town` or `locality`
- State: `administrative_area_level_1` (e.g., "England", "Scotland")
- Country: `country` (e.g., "United Kingdom")

### Norway / Scandinavia
- City: `locality` or `postal_town`
- State: `administrative_area_level_1` (often same as city for major cities)
- Country: `country` (e.g., "Norway")

### Other Countries
- Falls back through multiple types to find the best match
- Uses empty string if no match (field can be filled manually)

## Testing

### Test Cases
✅ **US Address**: "Madison Square Garden, New York"
  - City: New York
  - State: NY
  - Country: United States

✅ **UK Address**: "The O2, London"
  - City: London
  - State: England
  - Country: United Kingdom

✅ **Norway Address**: "Rockefeller Oslo"
  - City: Oslo
  - State: Oslo
  - Country: Norway

✅ **Germany Address**: "Berghain, Berlin"
  - City: Berlin
  - State: BE
  - Country: Germany

## Browser Console
You'll see debug logs like:
```
📍 [CreateShowForm] Place selected: {name: "Rockefeller", formatted_address: "...", ...}
📍 [CreateShowForm] Address components: [{long_name: "Oslo", types: ["locality"]}, ...]
📍 [CreateShowForm] Extracted: {city: "Oslo", state: "Oslo", country: "Norway"}
```

## Files Modified
- `/src/components/shows/CreateShowForm.tsx` - Enhanced `handlePlaceSelect` function

## Status
✅ **Complete** - All address fields now auto-fill from Google Places for international venues
