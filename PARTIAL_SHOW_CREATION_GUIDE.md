# Partial Show Creation Guide

## Overview
When creating a show from a calendar event, you can now save it **even if venue details aren't complete yet**. The show will be created with placeholder values that can be updated later.

## What Changed

### Required Fields (Always)
- ✅ **Show Date** - Required
- ✅ **Set Length** - Required (e.g., "45 minutes")

### Optional Fields (When Creating from Calendar)
- 🔄 **Venue Name** - Defaults to "TBD" if empty
- 🔄 **Venue Address** - Defaults to "TBD" if empty
- 🔄 **City** - Defaults to "TBD" if empty
- 🔄 **State** - Defaults to empty string
- 🔄 **Country** - Defaults to "USA"
- 🔄 **Show Time** - Defaults to "20:00" (8:00 PM)
- 🔄 **Doors Time** - Defaults to "19:00" (7:00 PM)

## How It Works

### Creating from Calendar Event

```
1. VIEW CALENDAR EVENT
   └─ Click "Add as a Show"

2. CREATE SHOW FORM OPENS
   ├─ Date pre-filled from calendar event
   ├─ Venue fields may be partially filled
   └─ Notice: Fields marked without * can be filled in later

3. SAVE INCOMPLETE SHOW
   ├─ Fill in: Show Date, Set Length (required)
   ├─ Leave empty: Venue details, times
   └─ Click "Create Show"

4. SHOW SAVED TO DATABASE
   ├─ Empty venue name → "TBD"
   ├─ Empty address → "TBD"
   ├─ Empty city → "TBD"
   ├─ Empty show time → "20:00"
   └─ Empty doors time → "19:00"

5. SHOW APPEARS IN LIST
   ├─ Status: Confirmed
   ├─ Venue shows as "TBD" if not filled
   └─ Can be edited later to add missing details
```

## Visual Guide

### Calendar Event → Partial Show

```
Calendar Event:
┌────────────────────────────────┐
│ Event: CONAN AT HPS FESTS      │
│ Date: 27/02/2026               │
│ Location: (partially filled)   │
└────────────────────────────────┘
         ↓ Add as Show

Create Show Form:
┌────────────────────────────────┐
│ Show Date: 27/02/2026  ✅      │
│ Show Time: [empty]      ⚠️     │← Will use 20:00
│ Doors Time: [empty]     ⚠️     │← Will use 19:00
│ Set Length: [required]  ✅     │← Must fill
│                                │
│ Venue Name: [empty]     ⚠️     │← Will use "TBD"
│ Venue Address: [empty]  ⚠️     │← Will use "TBD"
│ City: [empty]           ⚠️     │← Will use "TBD"
│ State: [empty]          ⚠️     │← Will be empty
│ Country: [empty]        ⚠️     │← Will use "USA"
└────────────────────────────────┘
         ↓ Save

Saved Show:
┌────────────────────────────────┐
│ Show: CONAN AT HPS FESTS       │
│ Date: 27/02/2026               │
│ Time: 20:00 (doors 19:00)      │
│ Venue: TBD                     │
│ Location: TBD, TBD, USA        │
│ Status: Confirmed ✅           │
└────────────────────────────────┘
         ↓ Can be edited later

Updated Show (after editing):
┌────────────────────────────────┐
│ Show: CONAN AT HPS FESTS       │
│ Date: 27/02/2026               │
│ Time: 21:00 (doors 20:00)      │
│ Venue: Burgerweeshuis          │
│ Location: Bagijnenstraat,      │
│           Deventer, NL         │
│ Status: Confirmed ✅           │
└────────────────────────────────┘
```

## Field Labels

### Creating from Calendar Event
Fields show different labels:

**Without asterisk** (optional):
- Venue Name (can be filled in later)
- Venue Address (can be filled in later)
- City (can be filled in later)
- State (can be filled in later)
- Country (can be filled in later)
- Show Time (defaults to 8:00 PM if not specified)
- Doors Time (defaults to 7:00 PM if not specified)

**With asterisk** (required):
- Show Date *
- Set Length *

### Creating Normally (Not from Calendar)
All fields remain required as before:
- Show Date *
- Show Time *
- Doors Time *
- Set Length *
- Venue Name *
- Venue Address *
- City *
- State *
- Country *

## Default Values

| Field | Empty Value | Default Used | Notes |
|-------|-------------|--------------|-------|
| Venue Name | (empty) | "TBD" | Can be updated later |
| Venue Address | (empty) | "TBD" | Can be updated later |
| City | (empty) | "TBD" | Can be updated later |
| State | (empty) | "" | Empty string |
| Country | (empty) | "USA" | Default country |
| Show Time | (empty) | "20:00" | 8:00 PM |
| Doors Time | (empty) | "19:00" | 7:00 PM |

## Use Cases

### Use Case 1: Quick Show Creation
```
Scenario: Artist sees calendar event, wants to save it as a show to track it
Action: Click "Add as Show", fill in Set Length only, save
Result: Show created with TBD venue, can be filled in later
```

### Use Case 2: Incomplete Venue Information
```
Scenario: Calendar event has date but venue not confirmed yet
Action: Create show with partial info, edit later when venue is confirmed
Result: Show exists in database, venue shows as "TBD" until updated
```

### Use Case 3: Bulk Calendar Import
```
Scenario: Converting multiple calendar events to shows quickly
Action: Convert all events, fill in minimal required fields
Result: All shows created, details can be added progressively
```

## Testing Steps

1. **Create Calendar Event**
   - Add event with just title and date
   - Don't fill in location fields

2. **Convert to Show**
   - Click "Add as a Show"
   - Notice venue fields are optional (no asterisk)
   - Fill in only: Set Length (e.g., "45 minutes")
   - Leave venue fields empty

3. **Save Show**
   - Click "Create Show"
   - Should save successfully

4. **Verify in Database**
   - Check shows list
   - Show should appear with:
     - Venue: "TBD"
     - Location: "TBD, TBD, USA"
     - Time: "20:00"
     - Doors: "19:00"

5. **Edit Show Later**
   - Click on show to edit
   - Add proper venue details
   - Save changes

## Important Notes

### Database Storage
- Shows are saved with placeholder values
- Database requires venue_name, venue_address, city (NOT NULL)
- We use "TBD" to satisfy database constraints
- These can be updated later through edit functionality

### Display
- Shows with "TBD" venue will display as such in the list
- Easy to identify shows that need venue information
- Can filter/search for "TBD" to find incomplete shows

### Workflow
1. Quick save from calendar → Show created
2. Fill in details progressively → Update show
3. All information complete → Show ready

## Benefits

✅ **Faster workflow** - Save shows immediately
✅ **Progressive data entry** - Add details as you get them
✅ **No data loss** - Calendar events always convertible to shows
✅ **Clear indicators** - "TBD" shows what needs filling
✅ **Flexible** - Works for quick saves or detailed entries

## When to Use

**Use partial creation when:**
- 📅 You want to quickly save a calendar event as a show
- 🏢 Venue details aren't confirmed yet
- ⚡ You're importing multiple events and want speed
- 🔄 You'll add details progressively

**Use complete creation when:**
- ✅ You have all venue information ready
- 📋 You're creating a fully detailed show
- 📝 You want complete records immediately
- 🎯 The show is confirmed and finalized

## Related Documentation
- CALENDAR_VENUE_FIELDS_GUIDE.md
- CALENDAR_VENUE_MAPPING.md
- CALENDAR_EVENT_TO_SHOW_CONVERSION.md
