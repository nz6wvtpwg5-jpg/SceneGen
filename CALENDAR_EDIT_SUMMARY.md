# Calendar Event Editing - Quick Summary

## What You Asked For ✅

> "I want the edit modal to look like the 'add a show' modal. So that all diary entries will look similar and have the same data fields regardless of whether they are a newly added show, or if they're a pre-existing diary entry that is edited."

## What's Been Implemented

### Unified Interface
- ✅ **All calendar events** now use the same CreateShowForm modal
- ✅ **Same data fields** for calendar events and shows
- ✅ **Consistent appearance** across all entry types
- ✅ **Empty fields show as fillable fields** - no placeholders

### User Interactions

#### Click on Calendar Event
- Opens CreateShowForm in "Edit" mode
- Title: "Edit Calendar Event"
- All fields available to fill

#### Right-Click → "Add as Show"
- Opens CreateShowForm in "Create" mode
- Title: "Create Show from Calendar Event"
- Creates new show with filled data

#### Right-Click → "View Details"
- Now opens CreateShowForm in "Edit" mode (same as clicking)
- Title: "Edit Calendar Event"
- User can fill any empty fields

### Data Behavior

#### Pre-filled from Calendar
- Venue Name (from location)
- Venue City (from location)
- Date (from start date)
- Notes (from description, if exists)

#### Empty/Fillable Fields
- Counterparty
- Tour Assignment
- Deal Type & Terms
- Ticket Price
- Production Costs
- Times (load-in, soundcheck, etc.)
- Attendance expectations

## Benefits

1. **One Interface** - Users learn one form, use everywhere
2. **Progressive Entry** - Start with minimal data, add more later
3. **Flexibility** - Empty fields stay empty until user fills them
4. **Consistency** - All diary entries look the same
5. **No Confusion** - Whether Google Calendar event or SceneGen show, same editing experience

## What Happens When User Edits

1. User clicks or right-clicks calendar event
2. CreateShowForm modal opens
3. Existing data is pre-filled
4. Empty fields show as editable inputs
5. User fills in any additional information
6. User saves (if creating show) or closes (if editing calendar event)
7. Data is updated in system

## Files Changed
- `/src/app/shows/page.tsx` - Updated handlers and modal logic
- Removed CalendarEventModal component usage
- Added unified edit/create flow

---

## Testing the Feature

1. **View a calendar event with minimal data:**
   - Click on any calendar event
   - Should see CreateShowForm with empty fields for missing data
   - Can fill in venue, city, counterparty, deal terms, etc.

2. **Edit a calendar event:**
   - Right-click → "View Details"
   - Same CreateShowForm opens
   - All fields editable

3. **Add as show:**
   - Right-click → "Add as Show"
   - CreateShowForm opens in create mode
   - Pre-fills available data from calendar
   - Requires counterparty before creating

All three scenarios now use the same beautiful, consistent interface! ✨
