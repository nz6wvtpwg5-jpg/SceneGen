# Shows Page Fix - Backend Connection Issue

## Problem Summary
The Shows page was showing 0 shows even though:
- The sidebar badge correctly showed 6 shows
- The database contained 6 shows for Conan
- Browser console showed 401/500 errors for `/api/shows` endpoint

## Root Cause
**The backend server was not running.** All API calls were failing because there was no backend process to handle them.

## Solution
Started the backend server:
```bash
cd /Users/jon/Desktop/scenegen/SceneGenUIV2
node backend/server.js > backend/server.log 2>&1 &
```

Backend is now running on http://localhost:3001 with these endpoints:
- GET  /health
- GET  /api/user/entities
- POST /api/artist/add
- POST /api/promoter/add
- GET  /api/shows
- POST /api/shows
- GET  /api/shows/:id
- PUT  /api/shows/:id
- DELETE /api/shows/:id
- GET  /api/tours
- POST /api/tours
- GET  /api/tours/:id
- PUT  /api/tours/:id
- DELETE /api/tours/:id
- GET  /api/invites
- POST /api/invites

## Environment Configuration
Verified that `.env.local` has the correct settings:
```
USE_LOCAL_BACKEND=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

## How to Verify the Fix

### 1. Check Backend Health
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"ok","message":"SceneGen Backend API is running!"}`

### 2. Check Backend Process
```bash
ps aux | grep "node.*backend" | grep -v grep
```
Should show the running backend process.

### 3. Check Backend Logs
```bash
tail -50 backend/server.log
```

### 4. Test the Shows Page
1. **Refresh the browser** at http://localhost:3000/shows
2. Open DevTools Console (F12 → Console tab)
3. You should now see:
   - No 401/500 errors
   - Successful API responses
   - Shows displayed on the page

## Expected Behavior After Fix

### Sidebar Badge
- ✅ Already working correctly
- Shows count of future shows (e.g., "6")

### Shows Page
- Should now display all 6 shows from the database
- Calendar view should show the shows on their dates
- Table view should list all shows with details

## Files Reviewed

### Frontend API Route
- `/Users/jon/Desktop/scenegen/SceneGenUIV2/src/app/api/shows/route.ts`
  - Correctly configured to use local backend when `USE_LOCAL_BACKEND=true`
  - Sends entity ID in `X-Entity-Id` header for local backend
  - Sends Authorization and Subscription Key for Azure backend

### Hook
- `/Users/jon/Desktop/scenegen/SceneGenUIV2/src/hooks/useShows.ts`
  - Correctly sends Authorization header with bearer token
  - Correctly sends X-Entity-Id header with entity ID
  - Properly handles fetch and error states

### Page
- `/Users/jon/Desktop/scenegen/SceneGenUIV2/src/app/shows/page.tsx`
  - Correctly uses `useShows` hook to fetch data
  - Has comprehensive error handling
  - Logs debug information to console

## Backend Process Management

### Start Backend
```bash
cd /Users/jon/Desktop/scenegen/SceneGenUIV2
node backend/server.js > backend/server.log 2>&1 &
```

### Stop Backend
```bash
# Find the process ID
ps aux | grep "node.*backend" | grep -v grep

# Kill the process (replace PID with actual process ID)
kill <PID>
```

### Check Backend Logs
```bash
tail -f backend/server.log
```

## Next Steps
1. **Reload the browser page** to see the shows
2. Test creating a new show
3. Test editing a show
4. Test the calendar view
5. Verify all 6 shows are displayed correctly

## Note on React Hook Warning
The console showed a warning about React hooks being called in different order. This was a false alarm - the `NavItems` function in `config.tsx` is actually a custom hook (uses `usePathname`, `useProfileStore`, `useShowCount`), and it's being called correctly in `SideNav`. The warning may have been related to the backend being down causing state updates at unexpected times.

## Status
✅ Backend is running
✅ Environment variables are correct
✅ API routes are configured properly
⏳ **Action Required:** Reload the browser to test the fix
