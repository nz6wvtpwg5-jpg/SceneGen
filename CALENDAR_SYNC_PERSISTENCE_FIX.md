# Google Calendar Sync Persistence Fix

## Problem

You reported that after syncing a show to Google Calendar, when you refresh the page, it asks you to add the show to calendar again. The shows were being successfully created in Google Calendar, but the button state wasn't persisting across page reloads.

## Root Cause

The calendar sync endpoint (`/api/calendar/sync`) was creating events in Google Calendar but **not saving the event ID back to the database**. There was even a TODO comment in the code:

```typescript
// TODO: Save eventId to database (show.calendarEventId = eventId)
```

Without the event ID being saved:
1. Show syncs to Google Calendar ✅
2. Event is created in Google Calendar ✅
3. Event ID is returned to frontend ✅
4. **Event ID is NOT saved to database** ❌
5. On page refresh, `show.google_calendar_event_id` is `null`
6. Button shows "Add to Calendar" again
7. User clicks button → duplicate event created 😞

## Solution

### 1. **Save Event ID to Database** (`/api/calendar/sync/route.ts`)

After creating the calendar event, the API now makes a PATCH request to save the event ID:

```typescript
// Create calendar event
const eventId = await calendarService.createEvent(event);

// Save eventId to database so we know this show is synced
const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shows/${showId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    google_calendar_event_id: eventId,
  }),
});
```

### 2. **Add Field to Type Definition** (`/types/show.ts`)

Added `google_calendar_event_id` to the Show type:

```typescript
export interface Show {
  // ...existing fields...

  // Google Calendar integration
  google_calendar_event_id?: string;

  // ...rest of fields...
}
```

### 3. **Pass Event ID to Button** (`ShowsTable.tsx`)

Updated ShowsTable to pass the `google_calendar_event_id` to the CalendarSyncButton:

```typescript
<CalendarSyncButton
  show={{
    id: show.id,
    name: show.venueName,
    date: show.showDate,
    venue: { /*...*/ },
    notes: show.notes,
    google_calendar_event_id: show.google_calendar_event_id, // ← Added this
  }}
  variant="outline"
  size="sm"
  onSyncSuccess={onRefresh} // ← Added this
/>
```

### 4. **Refetch Shows After Sync** (`page.tsx`)

Added a `refetchShows()` function that reloads show data after successful sync:

```typescript
// Refetch shows data (used after calendar sync)
const refetchShows = async () => {
  try {
    const showsData = await fetchShows();
    console.log("🔄 Refetched shows after calendar sync:", showsData?.length || 0);
    setShows(showsData);
    setFilteredShows(showsData);
  } catch (err) {
    console.error("Failed to refetch shows:", err);
    toast.error("Failed to refresh shows");
  }
};
```

And passed it to ShowsTable:

```typescript
<ShowsTable
  shows={filteredShows}
  selectedIds={selectedShowIds}
  onSelectionChange={setSelectedShowIds}
  onCancelShow={handleCancelShow}
  onRefresh={refetchShows} // ← Added this
/>
```

### 5. **Trigger Refetch on Success** (`CalendarSyncButton.tsx`)

Updated the button to call `onSyncSuccess` after successfully syncing:

```typescript
const handleSync = async () => {
  setIsSyncing(true);
  try {
    // ...sync logic...

    if (!response.ok) {
      // ...error handling...
    }

    setIsSynced(true);
    toast.success('Show synced to Google Calendar successfully!');

    // Trigger refetch of shows data
    if (onSyncSuccess) {
      onSyncSuccess(); // ← Added this
    }
  } catch (error) {
    // ...error handling...
  } finally {
    setIsSyncing(false);
  }
};
```

## How It Works Now

### First Time Syncing

1. User clicks "Add to Calendar" button
2. Frontend sends show data to `/api/calendar/sync`
3. Backend creates event in Google Calendar
4. Backend receives event ID from Google
5. **Backend saves event ID to database** ✅
6. Frontend receives success response
7. Button changes to "Synced ✓"
8. **Frontend refetches shows data** ✅
9. Updated show (with event ID) is displayed

### After Page Refresh

1. Shows are loaded from database
2. Show has `google_calendar_event_id` field set
3. CalendarSyncButton sees the event ID
4. Button shows "Synced ✓" immediately
5. **No duplicate events created** ✅

## Testing

1. **Sync a show to calendar**:
   - Button should show "Add to Calendar"
   - Click button
   - See "Syncing..." spinner
   - See "Show synced to Google Calendar successfully!" toast
   - Button changes to "Synced ✓"

2. **Refresh the page**:
   - Shows reload from database
   - Button still shows "Synced ✓"
   - Event ID is persisted

3. **Check database**:
   ```sql
   SELECT id, venue_name, google_calendar_event_id FROM shows;
   ```
   Should see the event IDs populated

4. **Check Google Calendar**:
   - Event should appear in calendar
   - Only one event (no duplicates)

## Debugging

If you see "Add to Calendar" after refresh:

1. **Check server logs** for PATCH request:
   ```
   ✅ Show <id> synced to Google Calendar (event ID: <eventId>)
   ✅ Calendar event ID saved to database for show <id>
   ```

2. **Check database** directly:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "$BACKEND_URL/shows/$SHOW_ID"
   ```
   Look for `google_calendar_event_id` field

3. **Check browser console** for refetch:
   ```
   🔄 Refetched shows after calendar sync: 2
   ```

4. **Check PATCH endpoint** is working:
   ```bash
   curl -X PATCH \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"google_calendar_event_id": "test123"}' \
     "$BACKEND_URL/shows/$SHOW_ID"
   ```

## Files Changed

- `/src/app/api/calendar/sync/route.ts` - Save event ID to database
- `/src/types/show.ts` - Add `google_calendar_event_id` field
- `/src/components/shows/ShowsTable.tsx` - Pass event ID and refetch callback
- `/src/components/shows/CalendarSyncButton.tsx` - Accept and call refetch callback
- `/src/app/shows/page.tsx` - Add refetchShows function

## Next Steps

1. ✅ Save event ID to database (DONE)
2. ✅ Button state persists across refreshes (DONE)
3. 🔜 Update calendar event when show is edited
4. 🔜 Delete calendar event when show is cancelled
5. 🔜 Link existing calendar events to shows (reverse sync)

## Commit

```
Fix: Save Google Calendar event ID to database after sync

PROBLEM:
- Shows were being synced to Google Calendar successfully
- But after page refresh, they showed 'Add to Calendar' again
- The google_calendar_event_id wasn't being saved to the database

SOLUTION:
1. Updated /api/calendar/sync to save event ID back to database via PATCH request
2. Added google_calendar_event_id field to Show type definition
3. Updated CalendarSyncButton to accept onSyncSuccess callback
4. Updated ShowsTable to pass google_calendar_event_id and onRefresh callback
5. Added refetchShows() function to shows page to reload data after sync
6. CalendarSyncButton now triggers refetch after successful sync

RESULT:
- After syncing to calendar, the button immediately shows 'Synced ✓'
- After page refresh, button still shows 'Synced ✓' (persisted in database)
- No more duplicate calendar events from re-syncing
```
