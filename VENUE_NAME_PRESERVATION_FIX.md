# Venue Name Preservation Fix

## Issue

When users selected a venue address from Google Places Autocomplete, only the **address** was being saved, not the **venue name**. This meant:

- Venue name field showed generic names (like city name)
- The actual venue name from Google Places (e.g., "Brooklyn Steel") was lost

## Root Cause

The `PlacesAutocomplete` component was only extracting and returning:
- `formatted_address` (the full address)
- `lat` (latitude)
- `lng` (longitude)

But NOT:
- `name` (the venue name like "Brooklyn Steel", "The Fillmore", etc.)

## Solution

Updated the entire flow to capture and save the venue name from Google Places.

### Changes Made

#### 1. PlacesAutocomplete.tsx

**Updated interface to include name parameter:**
```tsx
interface PlacesAutocompleteProps {
  value: string;
  onChange: (address: string, lat: number, lng: number, name?: string) => void; // ✅ Added name
  // ...
}
```

**Updated onPlaceChanged to extract and pass venue name:**
```tsx
const onPlaceChanged = () => {
  if (autocomplete) {
    const place = autocomplete.getPlace();

    if (place.geometry && place.geometry.location) {
      const address = place.formatted_address || '';
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const name = place.name || ''; // ✅ Extract venue name
      setInputValue(address);
      onChange(address, lat, lng, name); // ✅ Pass venue name
    }
  }
};
```

#### 2. Step3Validation.tsx

**Updated state to store venue name:**
```tsx
const [showAddresses, setShowAddresses] = useState<Record<
  number,
  { address: string; lat: number; lng: number; name?: string } // ✅ Added name
>>({});
```

**Updated handleAddressChange to receive and store name:**
```tsx
const handleAddressChange = (
  showIndex: number,
  address: string,
  lat: number,
  lng: number,
  name?: string // ✅ Added name parameter
) => {
  console.log(`📍 Address selected for show ${showIndex}:`, { address, lat, lng, name });
  setShowAddresses(prev => ({
    ...prev,
    [showIndex]: { address, lat, lng, name } // ✅ Store name
  }));
};
```

**Updated handleStartImport to merge venue name into show data:**
```tsx
const updatedShows = importData.shows.map((show, index) => {
  const addressData = showAddresses[index];
  if (addressData) {
    console.log(`✅ Show ${index} has address data:`, addressData);
    const updatedShow = {
      ...show,
      venue_address: addressData.address,
      venue_lat: addressData.lat,
      venue_lng: addressData.lng,
    };
    // ✅ Update venue name if we got one from Google Places
    if (addressData.name) {
      updatedShow.venueName = addressData.name;
    }
    return updatedShow;
  }
  return show;
});
```

**Updated PlacesAutocomplete call to pass name:**
```tsx
<PlacesAutocomplete
  value={showAddresses[index]?.address || ''}
  onChange={(address, lat, lng, name) => handleAddressChange(index, address, lat, lng, name)}
  placeholder={`Search for ${show.venueName || 'venue'} address`}
/>
```

## Data Flow (Before vs After)

### Before (Missing Venue Name)
```
User selects "Brooklyn Steel" from Google Places
    ↓
PlacesAutocomplete extracts:
  - formatted_address: "319 Frost St, Brooklyn, NY 11222, USA"
  - lat: 40.7197
  - lng: -73.9366
  ❌ name: NOT EXTRACTED
    ↓
Step3Validation stores:
  { address: "319...", lat: 40.7197, lng: -73.9366 }
  ❌ No venue name
    ↓
Backend receives:
  venueName: "New York" (from CSV city field) ❌
  venue_address: "319 Frost St..."
  venue_lat: 40.7197
  venue_lng: -73.9366
    ↓
Database stores:
  venue_name: "New York" ❌ WRONG!
```

### After (Preserves Venue Name)
```
User selects "Brooklyn Steel" from Google Places
    ↓
PlacesAutocomplete extracts:
  - formatted_address: "319 Frost St, Brooklyn, NY 11222, USA"
  - lat: 40.7197
  - lng: -73.9366
  ✅ name: "Brooklyn Steel"
    ↓
Step3Validation stores:
  { address: "319...", lat: 40.7197, lng: -73.9366, name: "Brooklyn Steel" }
  ✅ Venue name included
    ↓
Backend receives:
  venueName: "Brooklyn Steel" ✅
  venue_address: "319 Frost St..."
  venue_lat: 40.7197
  venue_lng: -73.9366
    ↓
Database stores:
  venue_name: "Brooklyn Steel" ✅ CORRECT!
```

## Console Logs

After this fix, you'll see the venue name in console logs:

```javascript
📍 Address selected for show 0: {
  address: "319 Frost St, Brooklyn, NY 11222, USA",
  lat: 40.7197,
  lng: -73.9366,
  name: "Brooklyn Steel"  // ✅ Now included!
}

✅ Show 0 has address data: {
  address: "319 Frost St, Brooklyn, NY 11222, USA",
  lat: 40.7197,
  lng: -73.9366,
  name: "Brooklyn Steel"  // ✅ Now included!
}
```

## Testing

1. **Import a tour:**
   - Upload CSV
   - Map fields
   - Enter venue addresses

2. **Select a venue from Google Places:**
   - Type venue name (e.g., "Brooklyn Steel")
   - Click on the dropdown suggestion
   - Check console logs for venue name

3. **Verify in database:**
   ```sql
   SELECT venue_name, venue_address, venue_lat, venue_lng
   FROM shows
   WHERE created_at > NOW() - INTERVAL '10 minutes'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Expected result:**
   ```
   venue_name      | venue_address                           | venue_lat | venue_lng
   ----------------+-----------------------------------------+-----------+-----------
   Brooklyn Steel  | 319 Frost St, Brooklyn, NY 11222, USA  | 40.7197   | -73.9366
   The Fillmore    | 1805 Geary Blvd, San Francisco, CA...  | 37.7839   | -122.4332
   ```

## What Gets Saved Now

When you select a venue from Google Places:

| Field | Source | Example |
|-------|--------|---------|
| `venue_name` | Google Places `name` | "Brooklyn Steel" |
| `venue_address` | Google Places `formatted_address` | "319 Frost St, Brooklyn, NY 11222, USA" |
| `venue_lat` | Google Places coordinates | 40.7197 |
| `venue_lng` | Google Places coordinates | -73.9366 |
| `city` | From CSV | "New York" |
| `state` | From CSV | "NY" |

## Fallback Behavior

If venue name is NOT selected from Google Places:
- `venue_name` falls back to CSV `venueName` field
- If CSV has no `venueName`, falls back to `city` (backend logic)

This ensures backward compatibility with:
- Existing shows without addresses
- Manual imports where users skip address entry

## Files Modified

1. `/src/components/maps/PlacesAutocomplete.tsx`
   - Updated interface to include `name` parameter
   - Updated `onPlaceChanged` to extract `place.name`
   - Pass venue name to `onChange` callback

2. `/src/app/import/components/Step3Validation.tsx`
   - Updated state type to include `name`
   - Updated `handleAddressChange` to receive and store name
   - Updated `handleStartImport` to merge venue name into show data
   - Updated `PlacesAutocomplete` component call

## Status

✅ **FIXED** - Venue names are now properly saved from Google Places

## Next Steps

1. Test the import flow
2. Verify venue names appear in console logs
3. Check database for correct venue names
4. View shows and confirm venue names display correctly
