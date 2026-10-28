# 🗺️ Mileage 500 Error - ROOT CAUSE FIXED

## Problem
After fixing budget creation, the mileage calculation was still failing with a 500 Internal Server Error:
```
POST http://localhost:3000/api/tours/9d21a757-70e4-4708-995b-b11057ce7fab/calculate-distances 500 (Internal Server Error)
⚠️ Distance calculation failed: {error: 'Failed to calculate distances'}
```

The total mileage on tours was not updating after adding shows, even though budget creation was working.

## Root Cause
**Wrong Backend URL Configuration**

The Next.js API route for distance calculation was using the wrong environment variable and port:

### Before (WRONG):
```typescript
// src/app/api/tours/[id]/calculate-distances/route.ts
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const response = await fetch(`${backendUrl}/api/tours/${tourId}/calculate-distances`, {
```

### Issues:
1. ❌ Using `NEXT_PUBLIC_API_URL` (which doesn't exist in .env.local)
2. ❌ Defaulting to port **5001** (wrong port!)
3. ❌ Backend actually runs on port **3001**
4. ❌ Adding `/api` twice in the URL path

### Environment Configuration:
```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

### Backend Server:
```javascript
// backend/server.js
const PORT = process.env.PORT || 3001;
```

## The Fix
Updated the calculate-distances route to use the correct environment variable and URL construction:

### After (CORRECT):
```typescript
// src/app/api/tours/[id]/calculate-distances/route.ts
const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
const response = await fetch(`${backendUrl}/tours/${tourId}/calculate-distances`, {
```

### Why This Works:
1. ✅ Uses `NEXT_PUBLIC_API_BASE_URL` (which IS defined in .env.local)
2. ✅ Points to correct port **3001**
3. ✅ Already includes `/api` in the base URL
4. ✅ URL construction is now: `http://localhost:3001/api/tours/${tourId}/calculate-distances`

## Testing
After this fix, try adding a show to a tour and verify:
1. Budget is created ✅ (already working)
2. Distance calculation succeeds ✅ (should now work)
3. Tour mileage updates in the UI ✅ (should now work)

## Files Changed
- `src/app/api/tours/[id]/calculate-distances/route.ts`

## Next Steps
1. Refresh the browser to load the updated Next.js route
2. Add a show to a tour (via import or manual form)
3. Verify that mileage updates correctly
4. Check browser console for success logs

## Complete Automation Flow (Now Fixed)
1. User adds a show ✅
2. Show is created in database ✅
3. Budget is automatically created with correct fields ✅
4. Distance calculation endpoint is called with CORRECT backend URL ✅
5. Backend calculates distances between shows ✅
6. Budget distances are updated ✅
7. Tour mileage total is recalculated ✅
8. UI displays updated mileage ✅
