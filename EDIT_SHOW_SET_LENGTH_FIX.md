# Edit Show Database Column Error Fix

## Issue
When trying to edit and save a show (e.g., Rockefeller Oslo), the update failed with:
```
column "set_length" of relation "shows" does not exist
```

## Root Cause
The `Show` type in TypeScript includes a `setLength` field, but this field **doesn't actually exist** in the database schema. The backend provides a default value (`'00:45:00'`) when fetching shows, but when updating, the frontend was trying to send this field back to the API.

### The Flow of the Bug:
1. **Frontend fetches show** → Backend returns `setLength: '00:45:00'` (hardcoded default, line 317)
2. **User edits show** → Form includes `setLength` in the update payload
3. **Backend receives update** → Converts `setLength` to `set_length` (camelCase → snake_case)
4. **Database rejects** → Column `set_length` doesn't exist in `shows` table
5. **Error shown** → "Failed to update show"

## Solution
Removed `setLength` from the update payload in `CreateShowForm.tsx` since it's not a real database column.

### Code Change
**File:** `/src/components/shows/CreateShowForm.tsx`

**Before:**
```tsx
const updates: Partial<Show> = {
    showDate: formData.showDate!,
    venueName: formData.venueName || '',
    // ... other fields ...
    setLength: formData.setLength || '',  // ❌ This field doesn't exist in DB
    guarantee: formData.guarantee,
    // ...
};
```

**After:**
```tsx
const updates: Partial<Show> = {
    showDate: formData.showDate!,
    venueName: formData.venueName || '',
    // ... other fields ...
    // setLength is not a real DB column, so we omit it ✅
    guarantee: formData.guarantee,
    // ...
};
```

## Why This Happened
- The `setLength` field exists in the TypeScript `Show` type for frontend display
- The backend hardcodes a default value when fetching shows
- But the actual database table doesn't have this column
- The frontend was naively including all form fields in the update, including non-existent ones

## Other Fields Affected?
This is likely the only affected field. The backend comment says:
```javascript
setLength: '00:45:00', // Default value since DB doesn't have this field
```

## Long-term Solution
If `setLength` is needed in the future:
1. Add a migration to create the `set_length` column in the database
2. Update the backend to persist this value
3. Re-enable sending it in updates

Or if it's not needed:
1. Remove it from the `Show` TypeScript type
2. Remove it from the form UI
3. Remove the hardcoded default from the backend

## Additional Improvements Made
Added better error logging to help debug future issues:

**File:** `/src/hooks/useShows.ts`
```tsx
if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('❌ Failed to update show:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
    });
    throw new Error(`Failed to update show: ${errorData.error || response.statusText}`);
}
```

Now errors show the actual API response instead of generic "Failed to update show".

## Testing
✅ Edit Rockefeller Oslo show  
✅ Click on Google Places suggestion  
✅ All fields auto-fill (Name, Address, City, State, Country)  
✅ Click Save  
✅ Show updates successfully  
✅ Modal closes  
✅ Shows list refreshes  

## Files Modified
1. `/src/components/shows/CreateShowForm.tsx` - Removed `setLength` from update payload
2. `/src/hooks/useShows.ts` - Added detailed error logging

## Status
✅ **Complete** - Shows can now be edited and saved successfully
