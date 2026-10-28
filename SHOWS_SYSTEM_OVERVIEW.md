# Shows System Overview

## Current Architecture

### Frontend (Next.js App)

#### 1. **Shows Page** (`/src/app/shows/page.tsx`)
- Main page component that displays all shows
- Manages state for shows, filters, calendar events, and modals
- Uses `useShows` hook to fetch data from the backend API

**Key Functions:**
```typescript
const loadData = async () => {
  const showsData = await fetchShows();  // Calls backend via hook
  setShows(showsData);
  setFilteredShows(showsData);
}

const refetchShows = async () => {
  const showsData = await fetchShows();  // Re-fetch after calendar sync
  setShows(showsData);
  setFilteredShows(showsData);
}
```

**Data Flow:**
1. Page loads → calls `fetchShows()` from `useShows` hook
2. Shows are stored in local state
3. Shows are filtered by status, tour, and search query
4. Filtered shows passed to `ShowsTable` component

---

#### 2. **useShows Hook** (`/src/hooks/useShows.ts`)

**Purpose:** Abstracts API calls to the backend

**Key Function - fetchShows():**
```typescript
const fetchShows = async (): Promise<Show[]> => {
  const entityId = getEntityId();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/shows?entity_id=${entityId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.json();
}
```

**What it does:**
- Gets the active entity ID from localStorage
- Makes authenticated GET request to backend `/shows` endpoint
- Returns array of Show objects

---

#### 3. **ShowsTable Component** (`/src/components/shows/ShowsTable.tsx`)

**Purpose:** Renders table of shows with actions

**Key Props:**
```typescript
interface ShowsTableProps {
  shows: Show[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onCancelShow: (showId: string) => void;
  onEditShow?: (show: Show) => void;
  onRefresh?: () => void;  // Callback to refetch shows
}
```

**What it renders:**
- Table with columns: checkbox, show details, date, location, status, actions
- For each show, renders:
  - Edit button (if `onEditShow` provided)
  - **CalendarSyncButton** (syncs to Google Calendar)
  - Cancel Show button

---

#### 4. **CalendarSyncButton Component** (`/src/components/shows/CalendarSyncButton.tsx`)

**Purpose:** Button to sync/unsync shows with Google Calendar

**Key State:**
```typescript
const [isConnected, setIsConnected] = useState(false);     // Is Google Calendar connected?
const [isSyncing, setIsSyncing] = useState(false);         // Currently syncing?
const [isSynced, setIsSynced] = useState(false);           // Is this show already synced?
const [isCheckingStatus, setIsCheckingStatus] = useState(true);  // Loading state
```

**Logic Flow:**

1. **On Mount:**
   ```typescript
   useEffect(() => {
     // Check if show already has google_calendar_event_id
     setIsSynced(!!show.google_calendar_event_id);

     // Check if calendar is connected via API
     checkCalendarStatus();
   }, [show.google_calendar_event_id]);
   ```

2. **Check Calendar Status:**
   ```typescript
   const checkCalendarStatus = async () => {
     const response = await fetch('/api/calendar/status');
     const data = await response.json();
     setIsConnected(data.connected);  // true if google_access_token cookie exists
   }
   ```

3. **Sync to Calendar:**
   ```typescript
   const handleSync = async () => {
     const response = await fetch('/api/calendar/sync', {
       method: 'POST',
       body: JSON.stringify({ showId: show.id, show: show }),
     });

     setIsSynced(true);

     // Trigger parent component to refetch shows
     if (onSyncSuccess) {
       onSyncSuccess();  // Calls refetchShows() in shows page
     }
   }
   ```

**Button States:**
- `isCheckingStatus=true` → Shows loading spinner
- `!isConnected` → Shows "Connect Calendar" button
- `isSynced=true` → Shows "Synced ✓" (green, secondary variant)
- Default → Shows "Add to Calendar" button

---

### Backend API Routes

#### 1. **GET `/api/shows`** (via `useShows` hook)

**Expected behavior:**
- Query shows from database filtered by `entity_id`
- Return array of Show objects with all fields including `google_calendar_event_id`

**Example Response:**
```json
[
  {
    "id": "abc123",
    "venueName": "The Venue",
    "showDate": "2026-02-27T20:00:00Z",
    "google_calendar_event_id": "xyz789",  // ← Should be here if synced
    // ...other fields
  }
]
```

---

#### 2. **POST `/api/calendar/sync`** (`/src/app/api/calendar/sync/route.ts`)

**Purpose:** Create Google Calendar event and save event ID to database

**Current Implementation:**
```typescript
export async function POST(request: NextRequest) {
  const session = await auth();
  const accessToken = request.cookies.get('google_access_token')?.value;
  const { showId, show } = await request.json();

  // 1. Create event in Google Calendar
  const calendarService = new GoogleCalendarService(accessToken, refreshToken);
  const event = showToCalendarEvent(show);
  const eventId = await calendarService.createEvent(event);

  console.log(`✅ Show ${showId} synced to Google Calendar (event ID: ${eventId})`);

  // 2. Save eventId to database
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

  if (!updateResponse.ok) {
    console.error(`⚠️ Failed to save calendar event ID to database`);
  } else {
    console.log(`✅ Calendar event ID saved to database`);
  }

  return NextResponse.json({ success: true, eventId });
}
```

**Expected Flow:**
1. Receives show data from frontend
2. Creates event in Google Calendar
3. Gets event ID back from Google
4. **Makes PATCH request to backend to save event ID**
5. Returns success to frontend

---

#### 3. **PATCH `/api/shows/:id`** (Backend API - NOT Next.js)

**Expected Endpoint:** `https://backend-url.com/shows/:id`

**Expected Behavior:**
```http
PATCH /shows/abc123
Authorization: Bearer <token>
Content-Type: application/json

{
  "google_calendar_event_id": "xyz789"
}
```

**Expected Response:**
```json
{
  "id": "abc123",
  "venueName": "The Venue",
  "google_calendar_event_id": "xyz789",
  // ...updated show
}
```

---

#### 4. **GET `/api/calendar/status`** (`/src/app/api/calendar/status/route.ts`)

**Purpose:** Check if Google Calendar is connected

**Implementation:**
```typescript
export async function GET(request: NextRequest) {
  const session = await auth();
  const accessToken = request.cookies.get('google_access_token')?.value;

  return NextResponse.json({
    connected: !!accessToken,
    email: session.user?.email,
  });
}
```

**Returns:**
- `{ connected: true }` if `google_access_token` cookie exists
- `{ connected: false }` otherwise

---

## Current Problem

### Symptom
After clicking "Add to Calendar":
1. ✅ Event is created in Google Calendar
2. ✅ Success toast appears
3. ✅ `refetchShows()` is called
4. ❌ Button still shows "Add to Calendar" instead of "Synced ✓"
5. ❌ After page refresh, button still shows "Add to Calendar"

### Diagnosis
The `google_calendar_event_id` is **NOT** being saved to the database.

**Possible Causes:**

1. **PATCH endpoint doesn't exist on backend**
   - Backend API may not have a `PATCH /shows/:id` route
   - Or route exists but doesn't accept `google_calendar_event_id` field

2. **PATCH request is failing silently**
   - Error is logged to console but not blocking the response
   - Frontend gets success, but database wasn't updated

3. **Show is being refetched before database update completes**
   - Race condition: refetch happens too quickly
   - Database needs time to commit the transaction

4. **Backend returns 200 but doesn't actually update**
   - PATCH succeeds but ignores the `google_calendar_event_id` field
   - Some backends ignore unknown fields in PATCH requests

5. **Environment variable mismatch**
   - `NEXT_PUBLIC_API_URL` points to wrong backend
   - Different backend than the one `useShows` uses for GET

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  USER CLICKS "ADD TO CALENDAR"                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CalendarSyncButton.handleSync()                            │
│  - POST /api/calendar/sync                                  │
│  - Body: { showId, show }                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Route: /api/calendar/sync                      │
│  1. Create event in Google Calendar                         │
│  2. Get eventId from Google                                 │
│  3. PATCH ${BACKEND}/shows/${showId}                        │
│     Body: { google_calendar_event_id: eventId }             │
│  4. Return { success: true, eventId }                       │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌─────────────────────┐         ┌────────────────────────┐
│  Google Calendar    │         │  Backend API (NeonDB)  │
│  - Event created ✅ │         │  - Should update show  │
│                     │         │  - Add event_id field  │
└─────────────────────┘         │  - ❌ NOT HAPPENING   │
                                └────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend receives success                                  │
│  - setIsSynced(true)  ✅                                    │
│  - onSyncSuccess() → refetchShows()  ✅                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  refetchShows()                                             │
│  - GET ${BACKEND}/shows?entity_id=...                       │
│  - Returns shows WITHOUT google_calendar_event_id ❌        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  ShowsTable re-renders                                      │
│  - show.google_calendar_event_id is undefined ❌            │
│  - CalendarSyncButton checks: !!undefined = false           │
│  - Button shows "Add to Calendar" again ❌                  │
└─────────────────────────────────────────────────────────────┘
```

---

## What We Need to Debug

### 1. Check Backend PATCH Endpoint
```bash
# Test if PATCH endpoint exists and works
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"google_calendar_event_id": "test123"}' \
  "$BACKEND_URL/shows/$SHOW_ID"
```

### 2. Check Server Logs
When you click "Add to Calendar", look for:
```
✅ Show <id> synced to Google Calendar (event ID: <eventId>)
⚠️ Failed to save calendar event ID to database for show <id>
```
OR
```
✅ Calendar event ID saved to database for show <id>
```

### 3. Check Database Directly
```sql
SELECT id, venue_name, google_calendar_event_id
FROM shows
WHERE entity_id = '1f60064e-3dc6-4612-a5c4-2be834806277';
```

### 4. Check GET /shows Response
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$BACKEND_URL/shows?entity_id=1f60064e-3dc6-4612-a5c4-2be834806277"
```

Look for `google_calendar_event_id` field in the response.

---

## Environment Variables

Check your `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.com
```

**Questions:**
- What is the actual value of `NEXT_PUBLIC_API_URL`?
- Is it the same backend that `useShows` fetches from?
- Does it match the backend database you're querying?
