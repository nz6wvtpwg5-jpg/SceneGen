# Manual Testing Guide - SceneGen Frontend

**Date:** January 28, 2026
**Server:** http://localhost:3001 (running)
**Goal:** Systematically test every feature and document results

---

## 🚀 Quick Start

1. ✅ Dev server is running on http://localhost:3001
2. ✅ Open in browser: http://localhost:3001
3. ✅ Open DevTools (F12 or Cmd+Option+I)
4. ✅ Go to Network tab → Filter "Fetch/XHR"
5. ✅ Console tab open for errors

---

## 📋 TESTING CHECKLIST

### Test 1: Landing Page & Navigation
**URL:** http://localhost:3001

**What to Check:**
- [ ] Page loads without errors
- [ ] No console errors (red text)
- [ ] "Welcome to SceneGen" message appears
- [ ] Header/navigation visible
- [ ] Sign in button visible and works

**Expected Result:**
- Clean landing page
- No JavaScript errors
- Can click Sign In

**Document Issues:**
```
Issues found: [None / List issues]
Console errors: [None / Copy errors]
API calls made: [List any API calls in Network tab]
```

---

### Test 2: Authentication
**Action:** Click "Sign In" button

**What to Check:**
- [ ] Sign in page loads
- [ ] Azure B2C login appears
- [ ] Can sign in with GitHub/Google
- [ ] After sign in, redirects somewhere
- [ ] Session token stored

**To check session:**
1. After signing in
2. DevTools → Application tab → Storage
3. Look for session data
4. Copy JWT token for later API testing

**Expected Result:**
- Successful authentication
- Redirect to dashboard or onboarding
- Token stored

**Document Issues:**
```
Sign in method used: [GitHub / Google]
Redirect destination: [/dashboard / /onboarding / other]
Token present: [Yes / No]
Issues: [None / List]
```

---

### Test 3: Dashboard
**URL:** http://localhost:3001/dashboard

**What to Check:**
- [ ] Page loads (may require sign in first)
- [ ] Welcome message with your name
- [ ] No console errors
- [ ] API calls in Network tab
- [ ] Check: GET /api/user
- [ ] Check: GET /api/user/entities

**API Call: GET /api/user**
```
Status: [200 / 4xx / 5xx]
Response preview: [Copy first few lines]
Issues: [None / Error message]
```

**API Call: GET /api/user/entities**
```
Status: [200 / 4xx / 5xx]
Response: [Array / Object / Error]
Contains administratorId: [Yes / No / N/A]
Issues: [None / Error message]
```

**Expected Result:**
- Dashboard loads
- Shows user data
- Two successful API calls

---

### Test 4: Profile Page
**URL:** http://localhost:3001/profile

**What to Check:**
- [ ] Page loads
- [ ] Shows profile data (or empty state)
- [ ] "Edit Profile" button works
- [ ] No console errors
- [ ] Check API calls in Network tab

**API Calls:**
```
Which APIs called: [List endpoints]
Status codes: [200 / errors]
Data displayed: [Yes / No / Partial]
```

**Test Edit Profile:**
- [ ] Click "Edit Profile"
- [ ] Edit form appears
- [ ] Can make changes
- [ ] "Save" button works
- [ ] Check PATCH /api/artist/{id} or /api/promoter/{id}

**Expected Result:**
- Profile displays correctly
- Edit works
- Changes can be saved

---

### Test 5: Shows Page
**URL:** http://localhost:3001/shows

**What to Check:**
- [ ] Page loads
- [ ] Shows list appears (or empty state)
- [ ] "Add Show" button works
- [ ] Filter dropdowns work
- [ ] Check GET /api/shows in Network

**API Call: GET /api/shows**
```
Status: [200 / 404 / other]
Response: [Array of shows / Error / Empty array]
Shows count: [Number]
Issues: [None / Error message]
```

**Test Create Show:**
- [ ] Click "Add Show" or "Create Show"
- [ ] Form appears
- [ ] Fill in: Date, Venue, City, Country
- [ ] Click "Save" or "Create"
- [ ] Check POST /api/shows in Network

**API Call: POST /api/shows**
```
Status: [201 / 404 / 500 / other]
Success: [Yes / No]
Error message: [If failed]
```

**Expected Result:**
- If backend exists: Shows load and CRUD works
- If backend missing: 404 errors, but UI doesn't crash

---

### Test 6: Tours Page
**URL:** http://localhost:3001/tours

**What to Check:**
- [ ] Page loads
- [ ] Tours list appears (or empty state)
- [ ] "Create Tour" button works
- [ ] Check GET /api/tours in Network

**API Call: GET /api/tours**
```
Status: [200 / 403 / 404 / other]
Response: [Array / Error]
Tours count: [Number]
Issues: [None / Error message]
Note: May return 403 if promoter (tours are artist-only)
```

**Test Create Tour:**
- [ ] Click "Create Tour"
- [ ] Form appears
- [ ] Fill in: Tour Name
- [ ] Click "Save"
- [ ] Check POST /api/tours

**Expected Result:**
- If artist: Tours load and work
- If promoter: 403 Forbidden (expected)
- If backend missing: 404 errors

---

### Test 7: Contacts Page
**URL:** http://localhost:3001/contacts

**What to Check:**
- [ ] Page loads
- [ ] Contacts list (or empty state)
- [ ] "Add Contact" button works
- [ ] Search bar works
- [ ] Check GET /api/contacts

**API Call: GET /api/contacts**
```
Status: [200 / other]
Response: [Array / Error]
Contacts count: [Number]
```

**Test Add Contact:**
- [ ] Click "Add Contact"
- [ ] Search form appears
- [ ] Type in search box
- [ ] Check GET /api/search?q=...
- [ ] Results appear
- [ ] Can send connection request

**API Call: GET /api/search**
```
Status: [200 / other]
Results: [Yes / No]
Can click result: [Yes / No]
```

**Expected Result:**
- Contacts page works
- Search works
- Can send requests

---

### Test 8: Conversations/Messaging
**URL:** http://localhost:3001/conversations

**What to Check:**
- [ ] Page loads
- [ ] Conversations list (or empty)
- [ ] Check GET /api/conversations
- [ ] Can click on conversation
- [ ] Chat interface appears

**API Call: GET /api/conversations**
```
Status: [200 / other]
Response: [Array / Error]
Conversations count: [Number]
```

**Expected Result:**
- Messaging UI loads
- API endpoints exist
- Real-time chat may need Ably setup

---

### Test 9: Search Functionality
**URL:** Try search bar in header/contacts

**What to Check:**
- [ ] Search bar visible
- [ ] Type query
- [ ] Check GET /api/search in Network
- [ ] Results appear
- [ ] Can click results

**API Call: GET /api/search?q={query}**
```
Status: [200 / other]
Query: [What you searched]
Results returned: [Yes / No]
Results count: [Number]
```

**Expected Result:**
- Search works
- Returns relevant results
- Can navigate to profiles

---

### Test 10: Onboarding Flow
**URL:** http://localhost:3001/onboarding

**What to Check:**
- [ ] Page loads
- [ ] Step 1: Choose role (Artist/Promoter/Venue)
- [ ] Step 2: Fill profile form
- [ ] Can complete all steps
- [ ] Check POST /api/artist/add or /api/promoter/add

**API Call: POST /api/artist/add**
```
Status: [200 / 409 / other]
Success: [Yes / No]
Entity created: [Yes / No]
Error: [None / Duplicate entity / Other]
```

**Test Duplicate Protection:**
- [ ] Try creating entity again
- [ ] Should get 409 Conflict (or succeed if backend not fixed)

**Expected Result:**
- Onboarding completes successfully
- Entity created
- Redirect to dashboard

---

## 🐛 COMMON ISSUES TO LOOK FOR

### Backend Not Implemented
**Symptoms:**
- 404 Not Found errors
- "Failed to fetch" messages
- Empty states everywhere

**Not a bug if:**
- Shows/Tours return 404 (we know these aren't in OpenAPI)
- UI handles errors gracefully

### Backend Returns Wrong Data
**Symptoms:**
- GET /api/user/entities returns object instead of array
- Missing administratorId field
- Can create duplicate entities (no 409)

**Check:**
- Network tab → Response preview
- Look for exact error messages

### Frontend Bugs
**Symptoms:**
- Console errors (red text)
- Broken UI layout
- Buttons don't work
- Infinite loading states

**Check:**
- Console for stack traces
- React error boundaries
- Network tab for failed requests

---

## 📊 RESULTS TEMPLATE

After testing, fill this out:

```markdown
## Test Results Summary

**Date:** [Date]
**Tester:** [Name]
**Time Spent:** [Duration]

### ✅ Working Features
1. [Feature] - Works perfectly
2. [Feature] - Works with minor issues
3. ...

### ⚠️ Partial Features
1. [Feature] - Works but [specific issue]
2. [Feature] - Backend returns wrong data
3. ...

### ❌ Broken Features
1. [Feature] - 404 errors (backend not implemented)
2. [Feature] - Console errors
3. ...

### 🔍 Backend Issues Found
1. GET /api/user/entities - [Specific issue]
2. POST /api/artist/add - [No 409 check]
3. GET /api/shows - [404 Not Found]
4. ...

### 🐛 Frontend Issues Found
1. [Page] - [Specific bug]
2. [Component] - [UI issue]
3. ...

### 📝 Notes
- [Any observations]
- [Recommendations]
- [Priority fixes]
```

---

## 🎯 Testing Priority

Test in this order:

**HIGH PRIORITY** (Core functionality):
1. ✅ Authentication
2. ✅ Dashboard
3. ✅ Profile
4. ✅ GET /api/user/entities (critical for ownership)

**MEDIUM PRIORITY** (Main features):
5. ✅ Shows page
6. ✅ Contacts
7. ✅ Search

**LOW PRIORITY** (Nice to have):
8. ✅ Tours
9. ✅ Messaging
10. ✅ Notifications

---

## 🚀 Ready to Start?

1. Open http://localhost:3001 in your browser
2. Open DevTools (F12)
3. Go through each test above
4. Document what you find
5. Update TEST_RESULTS.md with findings

**Questions?**
- Check API_AUDIT.md for endpoint details
- Check BACKEND_REQUIREMENTS.md for what backend should do
- Check TESTING_CHECKLIST.md for detailed test scenarios

Good luck! 🎉
