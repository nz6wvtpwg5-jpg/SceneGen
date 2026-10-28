# Unified Calendar Event Editing - Implementation Complete

## Overview
All calendar entries (whether Google Calendar events or newly created shows) now use the same **CreateShowForm** modal for editing, providing a consistent interface and data structure.

---

## User Flow

### 1. **Adding a New Show from Calendar Event**
```
User right-clicks calendar event
  → Select "Add as Show"
  → CreateShowForm opens with pre-filled data
  → Modal title: "Create Show from Calendar Event"
  → User completes remaining fields
  → New show is created in SceneGen
```

### 2. **Editing an Existing Calendar Event**
```
User clicks on calendar event
  OR
User right-clicks → Select "View Details"
  → CreateShowForm opens with existing data
  → Modal title: "Edit Calendar Event"
  → All fields are editable (including empty ones)
  → User fills in missing information
  → Changes are saved back to Google Calendar
```

---

## What Changed

### Before
- **Add as Show**: Used CreateShowForm ✅
- **Edit Event**: Used CalendarEventModal ❌ (different interface)

### After
- **Add as Show**: Uses CreateShowForm ✅
- **Edit Event**: Uses CreateShowForm ✅ (unified interface)

---

## Benefits

### 1. **Consistent User Experience**
- All diary entries look the same
- Same fields available regardless of source
- Familiar interface for all editing

### 2. **Unified Data Structure**
All calendar entries now have access to the full show data model:

| Field Category | Fields Available |
|----------------|-----------------|
| **Basic Info** | Venue Name, Venue City, Date, Notes |
| **Counterparty** | Search existing or generate invite |
| **Tour Info** | Standalone, Existing Tour, New Tour |
| **Deal Details** | Deal Type, Guarantee, Percentage, Door Deal |
| **Financial** | Ticket Price, Production Costs, Expected Revenue |
| **Schedule** | Load-in, Sound Check, Doors, Showtime |
| **Metrics** | Expected/Actual Attendance |

### 3. **Flexible Data Entry**
- **Empty fields show as empty** - no placeholder text
- **Users can fill any field** at any time
- **No required fields** for calendar events (only for creating shows)
- **Progressive enhancement** - start with minimal data, add more later

---

## Field Mapping

### Calendar Event → Show Form

| Google Calendar Field | Show Form Field | Notes |
|----------------------|-----------------|-------|
| `summary` (Title) | Not mapped | Event title not used |
| `location` (before comma) | `venueName` | "Blue Note, NYC" → "Blue Note" |
| `location` (after comma) | `venueCity` | "Blue Note, NYC" → "NYC" |
| `start.dateTime` | `date` | ISO date (YYYY-MM-DD) |
| `description` | `notes` | Optional, direct copy |
| `start.dateTime` (time) | Could add → `showtime` | Future enhancement |
| `end.dateTime` (time) | Could add → estimated duration | Future enhancement |

### Empty/Missing Fields
- **All other fields start empty**
- **User can fill via the form**
- **No validation until creating a show**
- **Calendar events can have partial data**

---

## User Interactions

### Clicking a Calendar Event
```typescript
onClick={() => handleEditCalendarEvent(event)}
```
- Opens CreateShowForm in edit mode
- Pre-fills available data from calendar event
- Shows empty fields for missing data
- Modal title: "Edit Calendar Event"

### Right-Click Menu Options

#### Option 1: "Add as Show"
```typescript
onAddAsShow={handleAddCalendarEventAsShow}
```
- Opens CreateShowForm in create mode
- Pre-fills venue/date from calendar
- Requires counterparty selection
- Creates new show in SceneGen

#### Option 2: "View Details" (now Edit)
```typescript
onViewDetails={(event) => {
  handleEditCalendarEvent(event);
}}
```
- Opens CreateShowForm in edit mode
- Same as clicking the event
- Allows filling empty fields
- Updates calendar event

---

## Code Implementation

### State Management
```typescript
const [eventToConvertToShow, setEventToConvertToShow] = useState<CalendarEvent | null>(null);
const [isEditingCalendarEvent, setIsEditingCalendarEvent] = useState(false);
const [showCreateModal, setShowCreateModal] = useState(false);
```

### Handlers

#### Add as Show (Create Mode)
```typescript
const handleAddCalendarEventAsShow = (event: CalendarEvent) => {
  setEventToConvertToShow(event);
  setIsEditingCalendarEvent(false);  // Create mode
  setShowCreateModal(true);
};
```

#### Edit Event (Edit Mode)
```typescript
const handleEditCalendarEvent = (event: CalendarEvent) => {
  setSelectedCalendarEvent(event);
  setEventToConvertToShow(event);
  setIsEditingCalendarEvent(true);  // Edit mode
  setShowCreateModal(true);
};
```

### Modal Title Logic
```typescript
<h2 className="text-2xl font-bold">
  {isEditingCalendarEvent
    ? 'Edit Calendar Event'
    : eventToConvertToShow
      ? 'Create Show from Calendar Event'
      : 'Create New Show'}
</h2>
```

### Data Pre-filling
```typescript
initialData={eventToConvertToShow ? {
  venueName: eventToConvertToShow.location?.split(',')[0]?.trim() || '',
  venueCity: eventToConvertToShow.location?.split(',')[1]?.trim() || '',
  date: new Date(eventToConvertToShow.start.dateTime).toISOString().split('T')[0],
  ...(eventToConvertToShow.description && { notes: eventToConvertToShow.description }),
} : undefined}
```

---

## Example Scenarios

### Scenario 1: Minimal Calendar Event
```
Google Calendar Entry:
- Title: "Gig"
- Date: Feb 15, 2026
- Location: (empty)
- Description: (empty)

Opens CreateShowForm with:
- Venue Name: [empty field] ← User can fill
- Venue City: [empty field] ← User can fill
- Date: 2026-02-15 ✓
- All other fields: [empty] ← User can fill
```

### Scenario 2: Detailed Calendar Event
```
Google Calendar Entry:
- Title: "Jazz Festival Performance"
- Date: Aug 10, 2026, 8:00 PM
- Location: "Blue Note Jazz Club, New York, NY"
- Description: "Main stage, 90-minute set"

Opens CreateShowForm with:
- Venue Name: Blue Note Jazz Club ✓
- Venue City: New York ✓
- Date: 2026-08-10 ✓
- Notes: Main stage, 90-minute set ✓
- Counterparty: [empty] ← User can fill
- Deal Terms: [empty] ← User can fill
- Ticket Price: [empty] ← User can fill
```

### Scenario 3: Editing to Add Missing Info
```
1. User clicks existing event: "Company Party"
2. CreateShowForm opens with:
   - Venue: [empty]
   - City: [empty]
   - Date: Dec 25, 2026

3. User fills in:
   - Venue: "Corporate Headquarters"
   - City: "San Francisco"
   - Deal Type: "Flat Fee"
   - Guarantee: $5,000

4. Data is saved back to SceneGen system
5. Calendar event now has complete information
```

---

## Technical Notes

### Removed Component
- ❌ **CalendarEventModal.tsx** - No longer needed
- ✅ **CreateShowForm.tsx** - Now handles all editing

### Files Modified
- `/src/app/shows/page.tsx` - Updated handlers and modal logic
- Imports updated to remove CalendarEventModal
- Added `isEditingCalendarEvent` state flag

### Backward Compatibility
- ✅ Existing "Add as Show" flow unchanged
- ✅ Existing show creation unchanged
- ✅ Google Calendar sync still works
- ✅ No database changes required

---

## Future Enhancements

### Could Add
1. **Time Parsing** - Extract showtime from calendar event start time
2. **Duration Calculation** - Use start/end time for estimated show length
3. **Smart Location Parsing** - Handle various location formats
4. **Venue Database Lookup** - Auto-fill venue details if in system
5. **Two-way Sync** - Update calendar when show details change
6. **Field Validation** - Mark required fields differently for calendar events vs. shows
7. **Save Progress** - Auto-save draft edits to calendar events

---

## User Benefits

### For Artists
- One interface to learn
- Can add detail to calendar events over time
- Tour planning integrated with calendar
- Financial tracking for all events

### For Promoters
- Consistent data entry
- Can add show details to calendar bookings
- Track all events in one place
- Easy conversion from inquiry to confirmed show

### For All Users
- Less confusion - everything looks the same
- Fill what you know, leave rest empty
- Come back and add details later
- Professional appearance regardless of data completeness
