# Calendar Event to Show Conversion - Data Flow

## What Happens When You Right-Click "Add as Show"

### Step-by-Step Flow

```
1. User right-clicks on calendar event
   ↓
2. CalendarEventContextMenu opens with event data
   ↓
3. User clicks "Add as Show"
   ↓
4. handleAddCalendarEventAsShow(event) is called
   ↓
5. Shows page sets eventToConvertToShow state
   ↓
6. Shows page opens CreateShowForm modal
   ↓
7. Calendar event data is transformed and passed as initialData
   ↓
8. CreateShowForm pre-fills the form fields
   ↓
9. User completes remaining fields and submits
   ↓
10. New show is created with calendar data included
```

---

## Data Transformation

### Calendar Event Structure
```typescript
{
  id: "calendar_event_123",
  summary: "Concert at Blue Note Jazz Club",
  description: "Special holiday performance",
  location: "Blue Note Jazz Club, New York",
  start: {
    dateTime: "2026-02-15T20:00:00-05:00",
    timeZone: "America/New_York"
  },
  end: {
    dateTime: "2026-02-15T23:00:00-05:00",
    timeZone: "America/New_York"
  }
}
```

### Transformed to initialData for CreateShowForm
```typescript
{
  venueName: "Blue Note Jazz Club",        // From location (before comma)
  venueCity: "New York",                   // From location (after comma)
  date: "2026-02-15",                      // From start.dateTime (date only)
  notes: "Special holiday performance"     // From description (optional)
}
```

---

## Code Flow

### 1. Context Menu Handler (CalendarEventContextMenu.tsx)
```typescript
<button
  onClick={() => {
    onAddAsShow(event);  // Passes entire CalendarEvent
    onClose();
  }}
>
  Add as Show
</button>
```

### 2. Shows Page Handler (page.tsx)
```typescript
const handleAddCalendarEventAsShow = (event: CalendarEvent) => {
  setEventToConvertToShow(event);  // Store event in state
  setShowCreateModal(true);         // Open modal
};
```

### 3. Modal with Transformed Data (page.tsx)
```typescript
<CreateShowForm
  onSuccess={handleCreateSuccess}
  onCancel={() => {
    setShowCreateModal(false);
    setEventToConvertToShow(null);
  }}
  initialData={eventToConvertToShow ? {
    // Data transformation happens here:
    venueName: eventToConvertToShow.location?.split(',')[0]?.trim() || '',
    venueCity: eventToConvertToShow.location?.split(',')[1]?.trim() || '',
    date: new Date(eventToConvertToShow.start.dateTime).toISOString().split('T')[0],
    ...(eventToConvertToShow.description && {
      notes: eventToConvertToShow.description
    }),
  } : undefined}
/>
```

### 4. Form Pre-Population (CreateShowForm.tsx)
```typescript
const [formData, setFormData] = useState<Partial<CreateShowInput>>({
  dealType: 'guarantee',
  ...(initialData && {
    venueName: initialData.venueName || '',   // Pre-filled
    venueCity: initialData.venueCity || '',   // Pre-filled
    date: initialData.date || '',              // Pre-filled
    notes: initialData.notes || '',            // Pre-filled (if exists)
  }),
});
```

---

## What Gets Pre-Filled

| Calendar Event Field | Show Form Field | Transformation |
|---------------------|-----------------|----------------|
| `location` (before comma) | `venueName` | Split by comma, take first part, trim |
| `location` (after comma) | `venueCity` | Split by comma, take second part, trim |
| `start.dateTime` | `date` | Convert to ISO date string (YYYY-MM-DD) |
| `description` | `notes` | Direct copy (optional) |
| `summary` | ❌ Not used | Event title not mapped to show |

---

## What User Still Needs to Fill

The user must still complete:

### Required Fields
1. **Counterparty Selection**
   - Search for existing promoter/venue
   - OR Generate invite for new contact

2. **Tour Selection** (Artists only)
   - Standalone show
   - Existing tour
   - Create new tour

3. **Deal Details**
   - Deal type (guarantee, percentage, door deal, etc.)
   - Financial terms (guarantee amount, percentage, etc.)
   - Ticket price
   - Production costs

### Optional Fields
- Load-in time
- Sound check time
- Door time
- Showtime
- Attendance (expected)
- Additional notes (can append to calendar description)

---

## Example Scenario

### Calendar Event
```
Title: "Summer Festival Headlining Set"
Location: "Red Rocks Amphitheatre, Morrison, CO"
Date: August 15, 2026, 8:00 PM - 10:00 PM
Description: "Main stage performance with full production"
```

### Pre-Filled Show Form
```
Venue Name: Red Rocks Amphitheatre ✅
Venue City: Morrison, CO ✅
Date: 2026-08-15 ✅
Notes: Main stage performance with full production ✅

Counterparty: [User must select/invite] ❌
Deal Type: Guarantee (default) ⚠️
Guarantee Amount: [User must enter] ❌
Ticket Price: [User must enter] ❌
```

---

## Benefits of This Approach

1. **Time Saving** - Venue and date auto-filled
2. **Accuracy** - No manual typing errors for date/venue
3. **Context Preserved** - Calendar description becomes show notes
4. **Flexible** - User can edit pre-filled data if needed
5. **Complete Control** - User still confirms all financial/business details

---

## Notes

- **Original calendar event is NOT modified** - Only used as a template
- **No automatic sync** - The show is independent once created
- **Location parsing** - Assumes format "Venue Name, City" (common for calendar events)
- **Time information** - Currently not transferred (could be added to notes/times)
- **Event ID** - Not stored (no link back to calendar event)

---

## Potential Enhancements

### Could Add in Future
1. **Parse time from calendar event** to pre-fill showtime
2. **Link show to calendar event** for two-way sync
3. **Smarter location parsing** (handle various formats)
4. **Extract ticket URLs** from event description
5. **Auto-populate capacity** if venue is in database
6. **Suggest promoters** based on venue location
