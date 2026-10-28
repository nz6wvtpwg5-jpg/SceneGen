# How to Test Entity Creation - Quick Guide

## Current Status
✅ Dev server is running on port 3000
✅ Entity check is **DISABLED** (you can navigate freely)
✅ Artist creation API is connected to Azure backend
✅ Onboarding form is ready to use

## Testing Steps

### Option 1: Test via Onboarding Form (Recommended)

1. **Open the app in your browser:**
   ```
   http://localhost:3000
   ```

2. **Sign in** (if not already signed in)

3. **Navigate to onboarding page:**
   ```
   http://localhost:3000/onboarding
   ```

4. **Select "Artist"** as your entity type

5. **Fill out the form:**
   - **Name*** (required): e.g., "The Test Band"
   - **Bio**: e.g., "We are a test band for SceneGen"
   - **City**: e.g., "Melbourne"
   - **State**: e.g., "VIC"
   - **Country**: e.g., "Australia"

6. **Click "Create Artist Profile"**

7. **Expected Results:**
   - ✅ Success: You'll be redirected to `/dashboard`
   - ❌ Error 409: "You already own an entity" (backend detected duplicate)
   - ❌ Error 500: Backend error (check console for details)

### Option 2: Test via API (Advanced)

1. **Get your access token** from the browser console:
   ```javascript
   // Run this in browser console on localhost:3000
   const session = await fetch('/api/auth/session').then(r => r.json());
   console.log(session.access_token);
   ```

2. **Create an artist via curl:**
   ```bash
   curl -X POST http://localhost:3000/api/artist/add \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Band via API",
       "bio": "Testing entity creation",
       "city": "Melbourne",
       "state": "VIC",
       "country": "Australia"
     }'
   ```

3. **Check the response:**
   - Success: JSON with entity ID
   - Error: Error message and status code

### Verification Steps

After creating an entity, verify it was created:

1. **Check the sidebar** - you should see your new entity in the dropdown

2. **Navigate to profile:**
   ```
   http://localhost:3000/profile
   ```

3. **Verify entity details** are displayed correctly

4. **Check user entities API:**
   ```bash
   # In browser console or via curl
   fetch('/api/user/entities', {
     headers: { 'Authorization': 'Bearer YOUR_ACCESS_TOKEN' }
   }).then(r => r.json()).then(console.log)
   ```

   Expected response:
   ```json
   [
     {
       "id": "abc123",
       "name": "The Test Band",
       "type": "artist",
       "administratorId": "your-user-id",
       ...
     }
   ]
   ```

## What to Look For

### ✅ Success Indicators:
- Form submits without errors
- You're redirected to dashboard
- Entity appears in sidebar dropdown
- Profile page shows your entity details
- No console errors

### ⚠️ Warning Signs:
- **409 Conflict**: You already have an entity (backend working correctly!)
- **Duplicate entities**: Multiple entities with same name (backend not enforcing uniqueness)
- **Missing administratorId**: Backend not returning required fields
- **Redirect loop**: Entity check activated but backend not ready

### 🔧 Backend Issues to Report:
1. **No 409 error when creating duplicate** → Backend not checking ownership
2. **Missing administratorId in response** → Backend not returning all fields
3. **500 errors** → Check backend logs for database/server issues
4. **Entity not appearing in GET /api/user/entities** → Backend query issue

## Console Logs to Check

Open browser DevTools (F12) and check:

1. **Network tab**: Look for `/api/artist/add` request
   - Status: 200 (success) or 409/500 (error)
   - Response: Entity data or error message

2. **Console tab**: Look for:
   - `✅ Artist entity created successfully`
   - Or error messages with details

## Testing Different Scenarios

### Scenario 1: First-Time Entity Creation
- Expected: ✅ Success
- Result: Entity created, redirected to dashboard

### Scenario 2: Duplicate Entity Creation
- Expected: ❌ 409 Conflict
- Result: "You already own an entity" message
- **If no error**: Backend needs to implement ownership check!

### Scenario 3: Invalid Data
- Test with missing name field
- Expected: 400 Bad Request
- Result: "Artist name is required"

### Scenario 4: Unauthenticated Request
- Sign out and try to access /onboarding
- Expected: Redirected to sign-in
- Result: Cannot create entity without auth

## Next Steps After Testing

### If Creation Works:
1. Document the response data structure
2. Test with promoter entity creation
3. Verify entity appears correctly throughout the app
4. Test profile editing with the new entity

### If Creation Fails:
1. Copy error message and status code
2. Check browser console for detailed logs
3. Check Network tab for API request/response
4. Report to backend team with:
   - Error message
   - Status code
   - Request payload
   - Expected behavior

## Toggling Entity Check (For Advanced Testing)

If you want to test the redirect behavior:

1. **Edit** `/src/hooks/useOnboardingRedirect.ts`
2. **Change** `DISABLE_ENTITY_CHECK = true` to `DISABLE_ENTITY_CHECK = false`
3. **Save** the file (hot reload will apply changes)
4. **Test** what happens when:
   - You have no entities → Should redirect to /onboarding
   - You have an entity → Should NOT redirect
   - You try to create a second entity → Should get 409 error

⚠️ **Warning**: Only enable entity check if backend is ready to return `administratorId` field!

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't access /onboarding | Check if entity check is disabled |
| Form doesn't submit | Check browser console for errors |
| 401 Unauthorized | Sign in again, token may have expired |
| 409 Conflict | You already have an entity (expected if duplicate) |
| 500 Server Error | Check backend logs, report to backend team |
| Redirect loop | Disable entity check or fix backend response |
| Missing entity in sidebar | Check `/api/user/entities` response |

## Recording Your Results

After testing, update these files with your findings:
- `ENTITY_CREATION_TEST_RESULTS.md` - Record what happened
- `BACKEND_TODO.md` - Note any backend issues found
- `API_AUDIT.md` - Update API status based on test results

---

**Ready to test!** 🚀

Start with Option 1 (Onboarding Form) and work through the verification steps.
