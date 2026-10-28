# Testing Entity Creation & Onboarding

**Updated:** January 28, 2026
**Issue:** Entity check is disabled, but we can still test!

---

## 🎯 Multiple Ways to Test Entity Creation

### Method 1: Direct URL Navigation ⭐ **EASIEST**

The onboarding page works fine - just go directly to it!

```bash
# In browser, navigate to:
http://localhost:3001/onboarding
```

**This bypasses the redirect check and lets you:**
- ✅ See the onboarding UI
- ✅ Complete the profile form
- ✅ Test POST /api/artist/add or /api/promoter/add
- ✅ Check if duplicate entity check works (409 error)

**Steps:**
1. Open http://localhost:3001/onboarding
2. Choose role (Artist/Promoter/Venue)
3. Fill in profile details
4. Click "Create Profile"
5. Watch Network tab for POST request

---

### Method 2: Toggle Entity Check On/Off 🔧

I've just modified the code to make testing easier!

**File:** `src/hooks/useOnboardingRedirect.ts`

**Line 28:**
```typescript
const DISABLE_ENTITY_CHECK = true; // Set to false to test entity check
```

**To enable entity checking:**
1. Change to `const DISABLE_ENTITY_CHECK = false;`
2. Save file (server auto-reloads)
3. Refresh browser
4. Now redirects work normally!

**When to use:**
- ✅ Test full onboarding flow with redirects
- ✅ Test what happens when user has/doesn't have entity
- ✅ Test redirect loops (to see if backend is fixed)

**When to disable:**
- ✅ Backend isn't ready yet
- ✅ Want to access app without entity
- ✅ Just testing other features

---

### Method 3: Test API Endpoints Directly with curl 🤖

Test the backend without using the UI!

**Step 1: Get your JWT token**
```bash
# 1. Open http://localhost:3001
# 2. Sign in
# 3. DevTools → Application → Session Storage
# 4. Copy token value
```

**Step 2: Test GET /api/user/entities**
```bash
curl -X GET \
  "http://localhost:3001/api/user/entities" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  | jq

# Expected response (if no entity):
[]

# Expected response (if has entity):
[
  {
    "id": "uuid",
    "administratorId": "your-user-id",  # ← Check if this exists!
    "entityType": "artist",
    "name": "Your Band Name",
    ...
  }
]
```

**Step 3: Test POST /api/artist/add (Create Entity)**
```bash
curl -X POST \
  "http://localhost:3001/api/artist/add" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Band",
    "city": "Brooklyn",
    "state": "New York",
    "country": "United States",
    "bio": "Test bio"
  }' \
  | jq

# Expected first time:
# Status: 200 OK
# Response: New entity object

# Expected second time (if backend fixed):
# Status: 409 Conflict
# Response: {"error": "You already own an entity", ...}
```

**Step 4: Test Duplicate Entity Check**
```bash
# Run the same POST /api/artist/add command again
# Should get 409 Conflict if backend is fixed
# Will get 200 OK if backend doesn't check (bug)
```

---

## 🧪 Complete Testing Scenarios

### Scenario 1: New User Onboarding (No Entity)

**Goal:** Test creating first entity

**Steps:**
1. **Clear your entity** (if you have one):
   - Ask backend team to delete your test entity
   - OR use a different test account

2. **Go to onboarding:**
   ```
   http://localhost:3001/onboarding
   ```

3. **Complete form:**
   - Choose "Artist" or "Promoter"
   - Fill name, location, bio
   - Click "Create Profile"

4. **Watch Network tab:**
   ```
   POST /api/artist/add
   Status: 200 OK (success)
   Response: New entity object
   ```

5. **Check result:**
   - Should redirect to dashboard
   - Should show your new profile
   - GET /api/user/entities should return your entity

**Success Criteria:**
- ✅ Entity created (200 OK)
- ✅ Redirect to dashboard
- ✅ Entity appears in GET /api/user/entities
- ✅ Entity has `administratorId` field (check response!)

---

### Scenario 2: Duplicate Entity Prevention

**Goal:** Test that backend prevents duplicate entities

**Steps:**
1. **Create first entity** (use Scenario 1)

2. **Go to onboarding again:**
   ```
   http://localhost:3001/onboarding
   ```

3. **Try to create another entity:**
   - Fill different name/details
   - Click "Create Profile"

4. **Watch Network tab:**
   ```
   POST /api/artist/add
   Expected: 409 Conflict
   Response: {"error": "You already own an entity", ...}
   ```

5. **Check result:**
   - Should show error message
   - Should NOT create second entity
   - Should NOT redirect

**Success Criteria:**
- ✅ Second creation fails (409 Conflict)
- ✅ Error message shown to user
- ✅ GET /api/user/entities still returns only 1 entity

**If it fails (200 OK instead of 409):**
- ❌ Backend doesn't check for duplicates
- ❌ Backend team needs to implement duplicate check
- ❌ Refer them to BACKEND_REQUIREMENTS.md Priority #2

---

### Scenario 3: Entity Check Redirect Flow

**Goal:** Test automatic redirect to onboarding

**Prerequisites:**
- No entity exists for your user
- Entity check is ENABLED

**Steps:**
1. **Enable entity check:**
   ```typescript
   // src/hooks/useOnboardingRedirect.ts
   const DISABLE_ENTITY_CHECK = false; // Enable checking
   ```

2. **Sign in** (if not already)

3. **Try to go to dashboard:**
   ```
   http://localhost:3001/dashboard
   ```

4. **Expected behavior:**
   - GET /api/user/entities is called
   - Returns empty array or no owned entity
   - Auto-redirects to /onboarding

5. **Complete onboarding**

6. **Try dashboard again:**
   - GET /api/user/entities returns your entity
   - Dashboard loads (no redirect)

**Success Criteria:**
- ✅ Redirects to /onboarding when no entity
- ✅ Stays on /dashboard when has entity
- ✅ No infinite redirect loops

**If redirect loop occurs:**
- ❌ GET /api/user/entities returns wrong format
- ❌ Missing `administratorId` field
- ❌ Backend team needs to fix (see BACKEND_REQUIREMENTS.md Priority #1)

---

## 📊 What to Document

After testing, record these results:

### GET /api/user/entities Response Format
```json
// Before creating entity:
[Expected: empty array]
Actual: [paste actual response]

// After creating entity:
[Expected: array with entity object including administratorId]
Actual: [paste actual response]

// Check if administratorId exists:
[ ] Yes - Field is present ✅
[ ] No - Field is missing ❌ (Backend bug!)
```

### POST /api/artist/add - First Creation
```
Status: [200 / other]
Success: [Yes / No]
Entity ID returned: [uuid or N/A]
Error message: [if any]
```

### POST /api/artist/add - Duplicate Attempt
```
Status: [409 expected / actual: ___]
Error code: [DUPLICATE_ENTITY expected / actual: ___]
Error message: [paste actual message]

Backend duplicate check working?
[ ] Yes - Returns 409 ✅
[ ] No - Returns 200 (allows duplicate) ❌
```

### Redirect Flow
```
Entity check enabled: [Yes / No]
User has entity: [Yes / No]
Expected redirect: [/dashboard / /onboarding]
Actual behavior: [describe what happened]
Redirect loops: [Yes / No]
```

---

## 🐛 Common Issues & Solutions

### Issue: "Can't access onboarding page"
**Solution:** Just navigate directly to http://localhost:3001/onboarding

### Issue: "Entity check doesn't redirect me"
**Solution:** Check `useOnboardingRedirect.ts` - set `DISABLE_ENTITY_CHECK = false`

### Issue: "Can create multiple entities"
**Solution:** Backend bug - backend needs to implement duplicate check

### Issue: "GET /api/user/entities returns error"
**Solution:** Backend bug - check error message, report to backend team

### Issue: "Missing administratorId field"
**Solution:** Backend bug - backend needs to include this field (Priority #1 fix)

### Issue: "Infinite redirect loop"
**Solution:** Usually means GET /api/user/entities returns wrong format

---

## 🎯 Quick Test Checklist

```
[ ] Navigate to /onboarding directly - does it load?
[ ] Complete onboarding form - does it submit?
[ ] Check Network: POST /api/artist/add - what status?
[ ] Check response: Does entity object have administratorId?
[ ] Try creating second entity - returns 409 Conflict?
[ ] Enable entity check - redirects work correctly?
[ ] Check console for errors
[ ] Check GET /api/user/entities format
```

---

## 🚀 Quick Commands

**Test with current bypass (entity check disabled):**
```bash
# Just open the onboarding page
open http://localhost:3001/onboarding
```

**Test with entity check enabled:**
```bash
# 1. Edit src/hooks/useOnboardingRedirect.ts
# 2. Change: const DISABLE_ENTITY_CHECK = false;
# 3. Save (auto-reloads)
# 4. Go to: http://localhost:3001/dashboard
# 5. Should redirect to /onboarding if no entity
```

**Test API directly:**
```bash
# Get token from DevTools first, then:
TOKEN="your-token"

# Check entities
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/user/entities | jq

# Create entity
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Band","city":"Brooklyn","country":"USA"}' \
  http://localhost:3001/api/artist/add | jq

# Try duplicate (should fail with 409)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Another Band","city":"NYC","country":"USA"}' \
  http://localhost:3001/api/artist/add | jq
```

---

## 📝 Report Template

```markdown
## Entity Creation Test Results

**Date:** [date]
**Tester:** [name]

### Test 1: Direct Onboarding
- [ ] Navigated to /onboarding - SUCCESS
- [ ] Form loaded correctly - SUCCESS
- [ ] Completed and submitted - SUCCESS / FAIL
- [ ] POST /api/artist/add status: [code]
- [ ] Entity created: YES / NO
- [ ] Response has administratorId: YES / NO

### Test 2: Duplicate Prevention
- [ ] Tried creating second entity
- [ ] Backend returned: [200 / 409 / other]
- [ ] Duplicate check working: YES / NO

### Test 3: GET /api/user/entities
- [ ] Called endpoint
- [ ] Status: [code]
- [ ] Response format: [Array / Object / Error]
- [ ] Has administratorId field: YES / NO
- [ ] Response preview: [paste JSON]

### Backend Issues Found:
1. [Issue description]
2. [Issue description]

### Frontend Issues Found:
1. [Issue description]
2. [Issue description]
```

---

**Ready to test?** Start with Method 1 (direct URL) - it's the easiest! 🚀
