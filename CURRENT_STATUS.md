# Current Status - Google Calendar Sync Issue

**Last Updated:** Feb 4, 2026

## 🎯 Where We Are

### The Problem
When you click "Add to Calendar":
1. ✅ Event is created in Google Calendar successfully
2. ✅ Success toast appears
3. ✅ Frontend calls `refetchShows()`
4. ❌ **Button still shows "Add to Calendar" (should show "Synced ✓")**
5. ❌ **After refresh, button still shows "Add to Calendar"**

**Root Cause:** The `google_calendar_event_id` is NOT being persisted to the database.

---

## 🔍 What We've Done So Far

### 1. ✅ Frontend Implementation (Complete)
- Added `google_calendar_event_id` field to Show TypeScript type
- Updated CalendarSyncButton to check for `show.google_calendar_event_id`
- Added `onSyncSuccess` callback that triggers `refetchShows()`
- CalendarSyncButton properly shows different states based on sync status

### 2. ✅ API Route Implementation (Complete)
- `/api/calendar/sync` creates event in Google Calendar
- Gets event ID from Google
- **Attempts to PATCH backend to save event ID** ← This is failing
- Returns success to frontend

### 3. ❓ Backend PATCH Endpoint (Unknown Status)
- **We don't know if `PATCH /shows/:id` exists on the backend**
- **We don't know if it accepts `google_calendar_event_id` field**
- **We haven't checked the server logs to see if PATCH is failing**

---

## 🐛 Current Bug in Code

### Bug in `refetchShows()` function

**File:** `/src/app/shows/page.tsx` line ~177-184

```typescript
const refetchShows = async () => {
  try {
    // 🐛 BUG: Using showsData before it's defined!
    console.log("🔄 Refetched shows after calendar sync:", showsData?.length || 0);
    console.log("📊 Show data details:", showsData?.map(s => ({ id: s.id, venue: s.venueName, calendar_id: s.google_calendar_event_id })));
    console.log("🔄 Refetched shows after calendar sync:", showsData?.length || 0);
    // ☝️ Missing: const showsData = await fetchShows();
    setShows(showsData);  // showsData is undefined!
    setFilteredShows(showsData);
  } catch (err) {
    console.error("Failed to refetch shows:", err);
    toast.error("Failed to refresh shows");
  }
};
```

**This needs to be fixed to:**
```typescript
const refetchShows = async () => {
  try {
    const showsData = await fetchShows();  // ← Add this line
    console.log("🔄 Refetched shows after calendar sync:", showsData?.length || 0);
    console.log("📊 Show data details:", showsData?.map(s => ({
      id: s.id,
      venue: s.venueName,
      calendar_id: s.google_calendar_event_id
    })));
    setShows(showsData);
    setFilteredShows(showsData);
  } catch (err) {
    console.error("Failed to refetch shows:", err);
    toast.error("Failed to refresh shows");
  }
};
```

---

## 🔬 Next Steps to Debug

### Step 1: Fix the refetchShows Bug ⚠️ URGENT
The function is broken and won't refetch anything.

### Step 2: Check Server Logs
When you click "Add to Calendar", check the terminal where `npm run dev` is running.

**Look for:**
```bash
✅ Show <id> synced to Google Calendar (event ID: <eventId>)
```

**Then look for EITHER:**
```bash
✅ Calendar event ID saved to database for show <id>
```

**OR:**
```bash
⚠️ Failed to save calendar event ID to database for show <id>
Response status: 404
Error details: ...
```

### Step 3: Test Backend PATCH Endpoint
We need to verify the backend actually supports updating shows.

```bash
# Get your access token from browser console:
# session.access_token

# Get a show ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://scenegen-api.azurewebsites.net/shows?entity_id=1f60064e-3dc6-4612-a5c4-2be834806277"

# Try to PATCH it
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"google_calendar_event_id": "test_event_123"}' \
  "https://scenegen-api.azurewebsites.net/shows/SHOW_ID_HERE"
```

### Step 4: Check Database
Query NeonDB directly to see if the field exists:

```sql
SELECT
  id,
  venue_name,
  google_calendar_event_id
FROM shows
WHERE entity_id = '1f60064e-3dc6-4612-a5c4-2be834806277'
LIMIT 5;
```

If the column doesn't exist, we need to add it to the database schema first.

---

## 📋 Questions We Need Answered

### 1. Does the Backend Support PATCH /shows/:id?
- Check API documentation
- Check backend code
- Test with curl

### 2. Does the `shows` Table Have the Column?
```sql
\d shows  -- PostgreSQL
-- Look for google_calendar_event_id column
```

### 3. What Does NEXT_PUBLIC_API_URL Point To?
Check `.env.local`:
```bash
grep NEXT_PUBLIC_API_URL .env.local
```

Is it the same backend that returns shows when you load the page?

---

## 🎯 Action Items

### Immediate (Do Now)
1. ✅ Fix refetchShows bug (add missing `await fetchShows()`)
2. 📝 Click "Add to Calendar" and check server logs
3. 📝 Paste server logs here so we can see if PATCH is failing

### Short Term (Today)
1. Test PATCH endpoint with curl
2. Check if database column exists
3. Add column to database if missing
4. Update backend API to accept `google_calendar_event_id` if needed

### Long Term (This Week)
1. Add database migration for `google_calendar_event_id` column
2. Add backend API endpoint documentation
3. Add integration tests for calendar sync flow

---

## 📊 System Architecture Summary

```
┌──────────────────┐
│  Shows Page      │
│  - Displays 2    │
│    shows         │
└────────┬─────────┘
         │
         │ fetchShows()
         ▼
┌──────────────────────────────────┐
│  useShows Hook                   │
│  GET /shows?entity_id=...        │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Backend API (Azure/NeonDB)      │
│  Returns shows with fields:      │
│  - id                            │
│  - venueName                     │
│  - showDate                      │
│  - google_calendar_event_id ❓   │← Missing!
└──────────────────────────────────┘
```

**When syncing:**
```
User clicks          Next.js API         Google          Backend
"Add to Calendar" → /calendar/sync  →  Calendar  →     PATCH /shows/:id
                                         ✅              ❌ ???
```

---

## 💡 Hypothesis

**Most Likely Issue:** The backend doesn't have the `google_calendar_event_id` column yet.

**Evidence:**
- Frontend code is correct
- Google Calendar event is created successfully
- Shows are being returned from backend without the field
- PATCH may be succeeding but backend ignores unknown fields

**To Confirm:** Check database schema and backend API code.
