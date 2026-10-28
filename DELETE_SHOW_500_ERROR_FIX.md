# Delete Show 500 Error - Root Cause and Fix

## Problem
When deleting a show in the SceneGen UI, users were experiencing a 500 Internal Server Error, even though the show was successfully deleted from the database.

## Root Cause
The issue was in the Next.js API route handler at `/src/app/api/shows/[id]/route.ts`.

### The Issue
1. The backend (`/backend/server.js`) correctly returns a **204 No Content** response after successfully deleting a show
2. A 204 response has **no body** by definition
3. The Next.js API route was attempting to parse the response body as JSON:
   ```typescript
   const data = await response.json();  // ❌ This fails because 204 has no body
   return NextResponse.json(data);
   ```
4. When `response.json()` is called on a response with no body, it throws an error
5. The error was caught by the catch block and returned as a 500 error to the frontend

### The Flow
```
Frontend DELETE request
  → Next.js API route (/api/shows/:id)
    → Backend DELETE endpoint (returns 204 No Content)
  ← Next.js tries to parse empty body as JSON → ERROR
← 500 Internal Server Error returned to frontend
```

## Solution
Modified the DELETE handler in `/src/app/api/shows/[id]/route.ts` to:
1. Check if the backend response is OK (status 204)
2. Return a success response to the frontend **without** trying to parse the body
3. Return `{ success: true }` with status 200 to the frontend

### The Fix
```typescript
// Before (line 188-190):
const data = await response.json();
console.log('Backend returned success:', data);
return NextResponse.json(data);

// After:
// Backend returns 204 No Content with no body
// Return success response to frontend
console.log('Backend returned success (204 No Content)');
return NextResponse.json({ success: true }, { status: 200 });
```

## Testing
To test the fix:
1. Start the backend: `cd backend && node server.js`
2. Start the frontend: `npm run dev`
3. Navigate to the Shows page
4. Create a test show
5. Delete the show
6. Verify:
   - No 500 error in the console
   - Show is immediately removed from the UI (no need to refresh)
   - Backend logs show successful DELETE operation

## Files Modified
- `/src/app/api/shows/[id]/route.ts` - Fixed DELETE handler to handle 204 responses correctly

## Previous Related Fix
A previous fix was made to `/src/hooks/useShows.ts` to add the `X-Entity-Id` header to the DELETE request, which resolved a 401 Unauthorized error. This fix resolves the subsequent 500 error that occurred after that was fixed.

## Status
✅ **FIXED** - Delete operations now work correctly without errors
