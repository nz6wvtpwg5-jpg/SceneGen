# Venue Name/Address Truncation Fix - Testing Guide

**Date**: February 2, 2026
**Issue**: Venue name and address were being abbreviated/truncated (e.g., "Burgerw") when converting calendar events to shows.

## Root Cause Identified

When a calendar event location was saved without a comma separator (e.g., just "Burgerw"), the parsing logic would incorrectly set both venue name AND venue address to the same truncated value.

## Changes Made

### 1. Fixed Location Parsing Logic (`src/app/shows/page.tsx`)
- **Before**: `venueAddress = parts.length > 1 ? parts.slice(1).join(', ') : location;`
- **After**: `venueAddress = parts.length > 1 ? parts.slice(1).join(', ') : '';`
- **Effect**: If location has no comma, venue address is now empty instead of duplicating the venue name

### 2. Added Debug Logging
- `CalendarEventModal.tsx`: Logs location value being saved
- `shows/page.tsx`: Logs parsed venue name and address when converting to show

## Testing Instructions

### Step 1: Open Developer Console
1. Open the app at `http://localhost:3000/shows`
2. Press **F12** (or **Cmd+Option+I** on Mac) to open Developer Console
3. Go to the **Console** tab
4. Keep this open throughout testing to see debug logs

### Step 2: Test Scenario A - Manual Text Entry (The "Burgerw" Problem)

**Objective**: Test what happens when you manually type an incomplete/abbreviated location

1. **Create a new calendar event**:
   - Click on a date in the calendar view
   - Title: "Test Show - Manual Entry"
   - Location: Type "Burgerw" manually (DON'T select from autocomplete)
   - Click "Save Changes"

2. **Check Console Output**:
   ```
   Saving calendar event with location: Burgerw
   ```

3. **Convert to Show**:
   - Right-click the calendar event
   - Click "Add as a show"
   - **Check Console Output**:
     ```
     Converting calendar event to show:
       Location string: Burgerw
       Parsed venue name: Burgerw
       Parsed venue address: (empty)
     ```

4. **Verify Form Fields**:
   - ✅ Venue Name: Should show "Burgerw"
   - ✅ Venue Address: Should be EMPTY (not "Burgerw")
   - ✅ City: Should be empty
   - ✅ State: Should be empty

5. **Complete the Show Creation**:
   - Now use the Google Places Autocomplete in the Venue Name field
   - Type "Burgerworks" (or the full venue name)
   - SELECT from the autocomplete dropdown
   - All venue fields should auto-fill with complete information
   - Fill in remaining required fields
   - Submit the form

### Step 3: Test Scenario B - Google Places Autocomplete (Correct Way)

**Objective**: Test the proper flow using autocomplete from the start

1. **Create a new calendar event**:
   - Click on a different date
   - Title: "Test Show - Autocomplete"
   - Location: Type "Burgerworks Reno" (or any venue)
   - **WAIT for autocomplete dropdown to appear**
   - **SELECT a venue from the dropdown**

2. **Check Console Output**:
   ```
   Selected place: {name: "Burgerworks", formatted_address: "123 Main St, Reno, NV 89501, USA", ...}
   Saving calendar event with location: Burgerworks, 123 Main St, Reno, NV 89501, USA
   ```

3. **Convert to Show**:
   - Right-click the calendar event
   - Click "Add as a show"
   - **Check Console Output**:
     ```
     Converting calendar event to show:
       Location string: Burgerworks, 123 Main St, Reno, NV 89501, USA
       Parsed venue name: Burgerworks
       Parsed venue address: 123 Main St, Reno, NV 89501, USA
     ```

4. **Verify Form Fields**:
   - ✅ Venue Name: Should show "Burgerworks"
   - ✅ Venue Address: Should show "123 Main St, Reno, NV 89501, USA"
   - All fields properly populated

### Step 4: Test Scenario C - Comma-Separated Manual Entry

**Objective**: Test manual entry with proper comma formatting

1. **Create a new calendar event**:
   - Title: "Test Show - Manual Comma"
   - Location: Type "Burgerworks, 123 Main St, Reno, NV"
   - Click "Save Changes"

2. **Check Console Output**:
   ```
   Saving calendar event with location: Burgerworks, 123 Main St, Reno, NV
   ```

3. **Convert to Show**:
   - Right-click the event
   - Click "Add as a show"
   - **Check Console Output**:
     ```
     Converting calendar event to show:
       Location string: Burgerworks, 123 Main St, Reno, NV
       Parsed venue name: Burgerworks
       Parsed venue address: 123 Main St, Reno, NV
     ```

4. **Verify Form Fields**:
   - ✅ Venue Name: "Burgerworks"
   - ✅ Venue Address: "123 Main St, Reno, NV"
   - Properly split by comma

## Expected Results Summary

| Scenario | Location Saved | Venue Name | Venue Address | Result |
|----------|---------------|------------|---------------|--------|
| **Manual "Burgerw"** | `Burgerw` | `Burgerw` | *(empty)* | ✅ Fixed - no duplication |
| **Autocomplete** | `Burgerworks, 123 Main St...` | `Burgerworks` | `123 Main St...` | ✅ Correct |
| **Manual with commas** | `Burgerworks, 123 Main St...` | `Burgerworks` | `123 Main St...` | ✅ Correct |

## Best Practices for Users

### ✅ Recommended: Always Use Google Places Autocomplete
1. Start typing a venue name in the location field
2. Wait for the autocomplete dropdown to appear
3. **SELECT a venue from the dropdown**
4. This ensures complete address information is saved

### ⚠️ Acceptable: Manual Entry with Commas
- Format: `Venue Name, Street Address, City, State, Country`
- Example: `Burgerworks, 123 Main St, Reno, NV, USA`
- Must include commas to separate venue name from address

### ❌ Avoid: Incomplete Manual Entry
- Don't save partial text like "Burgerw"
- Don't save without proper formatting
- While the fix prevents duplication, you'll still need to complete the address manually when creating the show

## Files Modified

1. **`/src/app/shows/page.tsx`** (Lines 916-933)
   - Fixed venue address parsing logic
   - Added console logging for debugging

2. **`/src/components/shows/CalendarEventModal.tsx`** (Line 126)
   - Added console logging when saving location

## Troubleshooting

### Issue: Autocomplete not appearing
- **Check**: Google Maps API key is set in `.env.local`
- **Check**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable
- **Solution**: Restart the development server after adding API key

### Issue: Still seeing truncated names
- **Check**: Console logs to see actual data being saved and parsed
- **Check**: Did you select from autocomplete or just type?
- **Solution**: Edit the calendar event, use autocomplete properly, save again

### Issue: "No location specified" when converting to show
- **Check**: Did you fill in the location field before saving?
- **Solution**: Edit the calendar event, add location, save

## Next Steps

After testing, if you encounter any issues:
1. Check the console logs for the exact data flow
2. Take screenshots of console output
3. Note which scenario failed
4. Report back with specific details

The fix is now live and ready to test! 🎉
