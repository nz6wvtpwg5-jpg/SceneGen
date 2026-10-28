# Calendar Event Venue Fields Guide

## Overview
The Calendar Event Modal now uses separate venue fields that mirror the "Add a Show" form structure. This ensures accurate data mapping when converting calendar events to shows.

## What Changed

### Before
- **Single "Location" field** with Google Places autocomplete
- Location stored as one combined string in Google Calendar
- When converting to show, the string was split by commas with unpredictable results
- Partial/incomplete addresses (e.g., "Burgerw") caused data loss

### After
- **Separate venue fields**:
  1. **Venue Name** (with Google Places autocomplete)
  2. **Street Address**
  3. **City**
  4. **State**
  5. **Country**
- Fields are combined into a comma-separated string for Google Calendar storage
- When converting to show, each field maps directly to the corresponding show field
- No data loss or truncation

## How It Works

### 1. Creating/Editing a Calendar Event

When you create or edit a calendar event, you'll see:

```
Venue Name
├─ Google Places Autocomplete input
└─ Select a venue to auto-fill all fields below

Street Address
├─ Text input for street address

City          State         Country
├─ Text       ├─ Text       └─ Text
```

### 2. Using Google Places Autocomplete

When you type in the **Venue Name** field:
1. Google Places suggestions appear
2. Select a venue from the dropdown
3. All fields auto-fill automatically:
   - **Venue Name**: Venue name only (e.g., "Burgerweeshuis")
   - **Street Address**: Street number + route (e.g., "Bagijnenstraat")
   - **City**: City name (e.g., "Deventer")
   - **State**: State/province abbreviation (e.g., "OV")
   - **Country**: Country name (e.g., "Netherlands")

### 3. Manual Entry

You can also manually type in each field:
- Type venue name
- Type street address
- Type city, state, country

### 4. Saving to Google Calendar

When you save:
- Fields are combined: `"Venue Name, Street Address, City, State, Country"`
- This string is stored in the Google Calendar event's `location` field
- Example: `"Burgerweeshuis, Bagijnenstraat, Deventer, OV, Netherlands"`

### 5. Converting to Show

When you click **"Add as a Show"**:
1. Location string is parsed by splitting on commas
2. Each part maps to the corresponding show field:
   - Part 1 → Venue Name
   - Part 2 → Street Address
   - Part 3 → City
   - Part 4 → State
   - Part 5 → Country
3. All fields pre-fill correctly in the Create Show form

## Data Flow Diagram

```
Calendar Event Modal (Edit)
├─ Venue Name: "Burgerweeshuis"
├─ Street Address: "Bagijnenstraat"
├─ City: "Deventer"
├─ State: "OV"
└─ Country: "Netherlands"
         ↓
    (Save Event)
         ↓
Google Calendar Storage
└─ location: "Burgerweeshuis, Bagijnenstraat, Deventer, OV, Netherlands"
         ↓
   (View Event)
         ↓
Calendar Event Modal (Display)
└─ Shows: "Burgerweeshuis, Bagijnenstraat, Deventer, OV, Netherlands"
         ↓
  (Add as a Show)
         ↓
   Parse Location
         ↓
Create Show Form
├─ Venue Name: "Burgerweeshuis"
├─ Venue Address: "Bagijnenstraat"
├─ City: "Deventer"
├─ State: "OV"
└─ Country: "Netherlands"
```

## Testing Guide

### Test 1: Create Event with Autocomplete
1. Go to Shows page
2. Click on a calendar date to create event
3. In the Venue Name field, type "Burger"
4. Select "Burgerweeshuis" from dropdown
5. Verify all fields auto-fill
6. Click "Save Changes"
7. Click on the event to view it
8. Verify location displays as full address

### Test 2: Create Event Manually
1. Create new calendar event
2. Manually type in all fields:
   - Venue Name: "My Venue"
   - Street Address: "123 Main St"
   - City: "Portland"
   - State: "OR"
   - Country: "USA"
3. Save event
4. View event - verify location shows all fields

### Test 3: Convert to Show
1. View existing calendar event
2. Click "Add as a Show"
3. Verify Create Show form has:
   - ✅ Venue Name: correct
   - ✅ Venue Address: correct
   - ✅ City: correct
   - ✅ State: correct
   - ✅ Country: correct
4. No truncation or "Burgerw" issues

### Test 4: Edit Existing Event
1. Open existing calendar event (created before this update)
2. Click Edit
3. Old location string is parsed into separate fields
4. Make changes
5. Save
6. Verify changes are preserved

## Common Issues & Solutions

### Issue: Autocomplete doesn't work
**Solution**:
- Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env.local`
- Ensure Places API is enabled in Google Cloud Console
- Wait for "Loading location services..." message to disappear

### Issue: Fields don't auto-fill after selecting from dropdown
**Solution**:
- Make sure you click on a suggestion, not just type and press Enter
- Check browser console for errors
- Try a different venue search

### Issue: Old events show weird parsing
**Solution**:
- Old events used single location field format
- Edit the event and re-enter venue details using new fields
- Save to update to new format

### Issue: State shows full name instead of abbreviation
**Solution**:
- Google Places sometimes returns full state name
- Manually edit to use abbreviation if needed
- This is cosmetic and doesn't affect functionality

## Technical Details

### File Changes
- `src/components/shows/CalendarEventModal.tsx`: Added separate venue fields
- `src/app/shows/page.tsx`: Updated location parsing logic
- `src/components/ui/PlacesAutocomplete.tsx`: Unchanged (already supports name-only mode)

### Data Format
- **Storage**: Comma-separated string in Google Calendar `location` field
- **Format**: `"Name, Street, City, State, Country"`
- **Parsing**: Split on commas, trim whitespace, map to fields

### Backward Compatibility
- Old events with single-string locations still work
- Parsing handles 1-5 comma-separated parts
- Missing parts result in empty fields (not errors)

## Best Practices

1. **Always use autocomplete** for most accurate results
2. **Review auto-filled fields** before saving
3. **Use consistent formatting** (e.g., state abbreviations)
4. **Fill in all fields** when possible
5. **Test conversion** before creating actual show

## Related Documentation
- `GOOGLE_PLACES_SETUP.md` - Setting up Google Places API
- `CALENDAR_EVENT_TO_SHOW_CONVERSION.md` - Conversion flow details
- `VENUE_NAME_FIX_TESTING_GUIDE.md` - Previous truncation fix
