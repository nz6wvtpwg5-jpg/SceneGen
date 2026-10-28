# Google Calendar Sync Fix

## ⚠️ IMPORTANT: This is NOT an error!

If you see "Connect Calendar" buttons on your shows, **this is expected behavior** when you haven't connected Google Calendar yet.

## What Was Fixed

The calendar sync button was showing a 401 error because it wasn't properly checking if Google Calendar was connected before attempting to sync.

### Changes Made

1. **Updated `CalendarSyncButton.tsx`**:
   - Now properly checks calendar connection status using `/api/calendar/status` endpoint
   - Shows "Connect Calendar" button when not connected ← **THIS IS WHAT YOU'RE SEEING NOW**
   - Shows "Add to Calendar" button when connected but not synced
   - Shows "Synced ✓" when the show is already synced
   - Better error handling: if sync fails with 401, shows helpful message and updates button state

## How to Connect Google Calendar

### Step 1: Click "Connect Google Calendar"
At the top right of the Shows page, you'll see a blue button that says "Connect Google Calendar". Click it.

### Step 2: Authorize on Google
You'll be redirected to Google where you need to:
- Select your Google account
- Review the permissions (SceneGen needs access to create calendar events)
- Click "Allow" or "Authorize"

### Step 3: Return to SceneGen
After authorizing, you'll be automatically redirected back to the Shows page with the URL parameter `?calendar_connected=true`

### Step 4: Sync Your Shows
Now each show will have an "Add to Calendar" button instead of "Connect Calendar". Click it to sync!

## Troubleshooting

### "Please connect your Google Calendar first" Error

This means:
- You haven't connected Google Calendar yet, OR
- Your access token has expired, OR
- The cookies were cleared

**Solution**: Click "Connect Calendar" to reconnect

### Shows Not Appearing in Google Calendar

This means:
- The event was created but not linked to the show in the database
- This is a TODO in the backend (see comment in `/src/app/api/calendar/sync/route.ts`)

**Current Status**: Events are created in Google Calendar, but the `google_calendar_event_id` isn't being saved back to the database yet.

### 401 Errors in Console

If you see 401 errors when clicking "Add to Calendar":
- Check cookies in DevTools → Application → Cookies
- Look for `google_access_token` and `google_refresh_token`
- If missing, you need to reconnect Google Calendar

## Technical Details

### Calendar Connection Flow

1. User clicks "Connect Calendar"
2. Redirected to `/api/calendar/connect`
3. Redirected to Google OAuth consent screen
4. User authorizes SceneGen
5. Google redirects to `/api/calendar/callback` with auth code
6. Backend exchanges code for access/refresh tokens
7. Tokens stored in HTTP-only cookies
8. User redirected back to Shows page

### Cookie Storage

Tokens are stored in HTTP-only cookies for security:
- `google_access_token` - Used to make API calls to Google Calendar
- `google_refresh_token` - Used to get new access tokens when they expire
- `google_token_expires_at` - Timestamp when access token expires
- All cookies are secure, HTTP-only, and expire after 60 days

### API Endpoints

- `GET /api/calendar/connect` - Initiates OAuth flow
- `GET /api/calendar/callback` - Handles OAuth redirect
- `GET /api/calendar/status` - Check if calendar is connected
- `POST /api/calendar/sync` - Sync a show to calendar
- `DELETE /api/calendar/sync` - Remove a show from calendar (TODO)

## TODO (Future Improvements)

1. **Save Event ID to Database**: When a show is synced, save the `google_calendar_event_id` back to the database
2. **Update Events**: If a show is updated, update the calendar event too
3. **Delete Events**: Implement the "Remove from Calendar" functionality
4. **Token Refresh**: Auto-refresh access tokens when they expire
5. **Better UI Feedback**: Show calendar event link in the UI
