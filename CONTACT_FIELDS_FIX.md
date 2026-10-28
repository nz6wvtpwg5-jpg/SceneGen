# Contact Fields Fix - Quick Summary

## Problem
User couldn't save show from calendar event because Contact Name, Phone, and Email were required fields, but they weren't filled in yet.

## Solution
Made contact fields **optional** when creating a show from a calendar event.

## Changes

### Contact Fields Now Optional (Calendar Event Only)
When creating from calendar event (`fromCalendarEvent=true`):
- ✅ Contact Name - No asterisk, optional
- ✅ Contact Phone - No asterisk, optional
- ✅ Contact Email - No asterisk, optional
- ℹ️ Helper text: "Can be filled in later"

When creating normally:
- ❗ Contact Name* - Required
- ❗ Contact Phone* - Required
- ❗ Contact Email* - Required

### Placeholder Values
If fields are empty when saving from calendar:
- **Contact Name** → "TBD"
- **Contact Phone** → "TBD"
- **Contact Email** → "noreply@scenegen.com"

## Before vs After

### Before (Blocking)
```
❌ User enters:
- Show Date: ✅
- Set Length: ✅
- Contact Name: (empty)
- Contact Phone: (empty)
- Contact Email: (empty)

❌ Click "Create Show"
→ Browser validation: "Please fill out this field"
→ Cannot save!
```

### After (Non-blocking)
```
✅ User enters:
- Show Date: ✅
- Set Length: ✅
- Contact Name: (empty) ← OK!
- Contact Phone: (empty) ← OK!
- Contact Email: (empty) ← OK!

✅ Click "Create Show"
→ Saves with placeholders:
  - contactName: "TBD"
  - contactPhone: "TBD"
  - contactEmail: "noreply@scenegen.com"
→ Show created successfully! ✅
```

## UI Changes

### Contact Fields Labels
```
Before:
Contact Name *
Contact Phone *
Contact Email *

After (Calendar Event):
Contact Name
Contact Phone
Contact Email
ℹ️ Can be filled in later
```

## Progressive Data Entry

Shows can now be created with minimal info and completed later:

```
Stage 1: Quick Save
├─ Date: Required ✅
├─ Set Length: Required ✅
├─ Contact: TBD (optional)
└─ Venue: TBD (optional)

Stage 2: Add Venue
├─ Edit show
├─ Add venue details
└─ Still TBD contact

Stage 3: Complete
├─ Edit show
├─ Add actual contact info
└─ Update TBD → Real contact
```

## Related Optional Fields

All these fields are now optional when creating from calendar:
- Venue Name, Address, City, State, Country
- Show Time, Doors Time
- Contact Name, Phone, Email
- Financial details (Guarantee, Ticket Prices)
- Notes, Technical Requirements

## Minimal Required Fields

Only these are absolutely required:
- ✅ Show Date
- ✅ Set Length

Everything else can be TBD!

## Git Commit
- **1528c51** - fix: make contact fields optional when creating show from calendar

## Status
✅ **FIXED AND DEPLOYED**

You can now save shows with minimal information. All fields can be filled in progressively!

## Test It
1. View calendar event
2. Click "Add as a Show"
3. Fill only: Date (pre-filled) + Set Length
4. Leave contact fields empty
5. Click "Create Show"
6. **Expected**: Show saves successfully with TBD placeholders ✅
