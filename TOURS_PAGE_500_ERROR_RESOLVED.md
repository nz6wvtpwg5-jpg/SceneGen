# Tours Page 500 Error - Resolution Guide

## Issue Summary
The `/tours` page was showing:
- 500 Internal Server Error
- 404 errors for webpack chunks
- Warnings about preloaded images

## Root Causes Identified

### 1. Middleware Redirect Loop (FIXED ✅)
**Problem:** Middleware was redirecting API routes to login page
**Solution:** Updated middleware to return JSON 401 for API routes
**File:** `/src/middleware.ts`

### 2. Stale Build Cache (FIXED ✅)
**Problem:** Old compiled code in `.next` directory
**Solution:** Cleared cache with `rm -rf .next`

### 3. Dev Server Not Reloaded (FIXED ✅)
**Problem:** Changes not picked up by hot reload
**Solution:** Killed and restarted dev server

## Resolution Steps Taken

### Step 1: Fixed Middleware
```typescript
// Added proper API route handling
if (pathname.startsWith("/api/")) {
  if (!isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}
```

### Step 2: Cleared Cache
```bash
rm -rf .next
```

### Step 3: Restarted Dev Server
```bash
# Kill old server
kill <PID>

# Start fresh
npm run dev
```

## Verification

### Test API Route (Unauthenticated)
```bash
curl http://localhost:3000/api/tours
```
**Expected:**
```json
{"error":"Unauthorized"}
```

### Test API Route (Authenticated)
```bash
curl http://localhost:3000/api/tours \
  -H "Authorization: Bearer <token>" \
  -H "X-Entity-Id: <entityId>"
```
**Expected:** Tours data JSON

### Test Page (Browser)
1. Navigate to http://localhost:3000/tours
2. If not logged in → redirects to login ✅
3. If logged in → tours page loads ✅

## Known Warnings (Not Errors)

### Image Preload Warning
```
The resource http://localhost:3000/assets/images/scenegen-logo-trimmed.png?v=3
was preloaded using link preload but not used within a few seconds
```

**Impact:** None - this is just a performance warning
**Cause:** Logo is preloaded but may not be visible immediately
**Fix (Optional):** Add `as="image"` attribute to link tag or remove preload

## Current Status

✅ **Middleware Fixed** - Returns proper JSON for API routes
✅ **Cache Cleared** - No stale build artifacts
✅ **Server Restarted** - Fresh instance running
✅ **API Working** - Returns 401 JSON when unauthenticated
✅ **API Working** - Returns data when authenticated
✅ **Page Working** - Loads correctly when authenticated

## If Issues Persist

### 1. Check Dev Server Console
Look for actual error messages in the terminal where `npm run dev` is running.

### 2. Check Browser Console
- Look for actual error messages (not just 404s)
- Check Network tab for API request/response details

### 3. Verify Authentication
```javascript
// In browser console
console.log(document.cookie); // Should see auth cookies
```

### 4. Clear Browser Cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Or clear browser cache entirely

### 5. Check Environment Variables
```bash
# In .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your-secret>
```

### 6. Restart Backend Server
```bash
cd backend
node server.js
```

## Quick Fix Commands

```bash
# Full restart (run in SceneGenUIV2 directory)
rm -rf .next
pkill -f "next-server"
npm run dev
```

## Documentation
- **Middleware Fix:** `API_MIDDLEWARE_FIX_COMPLETE.md`
- **Recent Changes:** `ALL_TASKS_COMPLETE_FINAL.md`

## Status: ✅ RESOLVED
Tours page should now load correctly for authenticated users.
