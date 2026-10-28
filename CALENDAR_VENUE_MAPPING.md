# Calendar Event → Show: Field Mapping

## Quick Reference

### Calendar Event Modal (Separate Fields)
```
┌─────────────────────────────────────┐
│ Venue Name                          │
│ ┌─────────────────────────────────┐ │
│ │ 🔍 Search for a venue...        │ │ ← Google Places Autocomplete
│ └─────────────────────────────────┘ │
│                                     │
│ Street Address                      │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ City        State      Country     │
│ ┌─────────┐ ┌────────┐ ┌─────────┐ │
│ │         │ │        │ │         │ │
│ └─────────┘ └────────┘ └─────────┘ │
└─────────────────────────────────────┘
```

### Saved to Google Calendar
```
location: "Venue Name, Street, City, State, Country"
Example: "Burgerweeshuis, Bagijnenstraat, Deventer, OV, Netherlands"
```

### Create Show Form (After Conversion)
```
┌─────────────────────────────────────┐
│ Venue Name *                        │
│ ┌─────────────────────────────────┐ │
│ │ Burgerweeshuis                  │ │ ← Mapped from part 1
│ └─────────────────────────────────┘ │
│                                     │
│ Venue Address *                     │
│ ┌─────────────────────────────────┐ │
│ │ Bagijnenstraat                  │ │ ← Mapped from part 2
│ └─────────────────────────────────┘ │
│                                     │
│ City *      State *    Country *   │
│ ┌─────────┐ ┌────────┐ ┌─────────┐ │
│ │Deventer │ │   OV   │ │Netherl…││ │ ← Mapped from parts 3, 4, 5
│ └─────────┘ └────────┘ └─────────┘ │
└─────────────────────────────────────┘
```

## Before vs After

### ❌ BEFORE (Single Location Field)
```
Calendar Event:
┌────────────────────────────┐
│ Location                   │
│ ┌────────────────────────┐ │
│ │ Burgerw                │ │ ← User typed incomplete name
│ └────────────────────────┘ │
└────────────────────────────┘
         ↓ Save
Google Calendar:
  location: "Burgerw"
         ↓ Add as Show
Create Show:
  Venue Name: "Burgerw"       ← Truncated! ❌
  Venue Address: ""           ← Empty! ❌
```

### ✅ AFTER (Separate Fields)
```
Calendar Event:
┌────────────────────────────────────┐
│ Venue Name                         │
│ ┌────────────────────────────────┐ │
│ │ 🔍 Burger...                   │ │ ← User starts typing
│ │   Burgerweeshuis ⬅ Select     │ │
│ └────────────────────────────────┘ │
│                                    │
│ Street Address                     │
│ ┌────────────────────────────────┐ │
│ │ Bagijnenstraat (auto-filled)   │ │ ← Auto-filled!
│ └────────────────────────────────┘ │
│                                    │
│ City    State      Country        │
│ Deventer   OV       Netherlands    │ ← All auto-filled!
└────────────────────────────────────┘
         ↓ Save
Google Calendar:
  location: "Burgerweeshuis, Bagijnenstraat, Deventer, OV, Netherlands"
         ↓ Add as Show
Create Show:
  Venue Name: "Burgerweeshuis"       ← Perfect! ✅
  Venue Address: "Bagijnenstraat"    ← Perfect! ✅
  City: "Deventer"                   ← Perfect! ✅
  State: "OV"                        ← Perfect! ✅
  Country: "Netherlands"             ← Perfect! ✅
```

## Field Mapping Table

| Calendar Event Field | Google Calendar Storage | Show Form Field    | Notes                    |
|---------------------|-------------------------|--------------------|--------------------------|
| Venue Name          | Part 1 (before 1st ,)   | Venue Name         | Uses Places autocomplete |
| Street Address      | Part 2 (after 1st ,)    | Venue Address      | Auto-filled from Places  |
| City                | Part 3 (after 2nd ,)    | City               | Auto-filled from Places  |
| State               | Part 4 (after 3rd ,)    | State              | Auto-filled from Places  |
| Country             | Part 5 (after 4th ,)    | Country            | Auto-filled from Places  |

## Usage Flow

```
1. CREATE EVENT
   ├─ Type in Venue Name field
   ├─ Select from Google Places dropdown
   ├─ All fields auto-fill
   └─ Click "Save Changes"

2. EVENT SAVED
   └─ location: "Name, Address, City, State, Country"

3. VIEW EVENT
   ├─ Click on calendar event
   └─ See full location displayed

4. ADD AS SHOW
   ├─ Click "Add as a Show"
   ├─ Location string split by commas
   ├─ Each part mapped to correct field
   └─ All show fields pre-filled correctly

5. COMPLETE SHOW
   ├─ Fill in remaining required fields
   ├─ Add show details (deal type, fees, etc.)
   └─ Save show
```

## Console Logging (for debugging)

When you save an event, check browser console:
```javascript
"Saving calendar event with location: Burgerweeshuis, Bagijnenstraat, Deventer, OV, Netherlands"
```

When you convert to show, check browser console:
```javascript
Converting calendar event to show:
  Location string: Burgerweeshuis, Bagijnenstraat, Deventer, OV, Netherlands
  Parsed venue name: Burgerweeshuis
  Parsed venue address: Bagijnenstraat
  Parsed city: Deventer
  Parsed state: OV
  Parsed country: Netherlands
```

## Tips

✅ **DO**:
- Use Google Places autocomplete
- Select from dropdown (don't just type)
- Verify auto-filled fields before saving
- Check console logs if data looks wrong

❌ **DON'T**:
- Save incomplete venue names like "Burgerw"
- Skip fields (fill in all 5 when possible)
- Ignore autocomplete suggestions
- Mix formats (be consistent)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Autocomplete not working | Check Google API key in `.env.local` |
| Fields don't auto-fill | Click dropdown suggestion, don't press Enter |
| Old events parse wrong | Edit event and re-enter using new fields |
| Show form missing data | Check console logs for parsing details |
| Truncated venue names | Use autocomplete, not manual typing |
