# Quick Testing Reference Card

## 🎯 Currently Testing: SceneGen Frontend

**Server:** http://localhost:3001 ✅ RUNNING
**Your Task:** Test features and document what works

---

## 📍 Key URLs to Test

| Page | URL | Expected |
|------|-----|----------|
| Landing | http://localhost:3001 | Welcome message |
| Dashboard | http://localhost:3001/dashboard | User dashboard |
| Profile | http://localhost:3001/profile | Your profile |
| Shows | http://localhost:3001/shows | Shows list |
| Tours | http://localhost:3001/tours | Tours list (artist only) |
| Contacts | http://localhost:3001/contacts | Contacts list |
| Onboarding | http://localhost:3001/onboarding | Profile setup |
| Conversations | http://localhost:3001/conversations | Messages |

---

## 🔍 What to Check in DevTools

### Network Tab (Most Important!)
```
1. Open DevTools (F12)
2. Click "Network" tab
3. Filter by "Fetch/XHR"
4. Perform action (e.g., load page)
5. Look for API calls
6. Check status codes:
   ✅ 200, 201 = Success
   ⚠️ 401 = Not authenticated
   ⚠️ 403 = No permission
   ❌ 404 = Endpoint doesn't exist
   ❌ 500 = Server error
```

### Console Tab
```
1. Click "Console" tab
2. Look for errors (red text)
3. Ignore warnings (yellow) for now
4. Copy any error messages
```

### Application Tab (For Token)
```
1. Click "Application" tab
2. Storage → Session Storage
3. Find JWT token
4. Copy for API testing
```

---

## 🎯 Critical API Endpoints to Check

### Priority 1: Must Work for App to Function
```
GET  /api/user              - Get current user
GET  /api/user/entities     - Get owned entities ⚠️ KNOWN ISSUE
POST /api/artist/add        - Create artist
POST /api/promoter/add      - Create promoter
```

### Priority 2: Main Features
```
GET  /api/shows             - List shows
POST /api/shows             - Create show
GET  /api/tours             - List tours
POST /api/tours             - Create tour
GET  /api/contacts          - List contacts
GET  /api/search            - Search entities
```

### Priority 3: Nice to Have
```
GET  /api/conversations     - List chats
GET  /api/notification/history - Notifications
GET  /api/invites           - Invites
```

---

## ⚡ Quick Test Steps

### 1. Test Landing Page (30 seconds)
```
1. Go to http://localhost:3001
2. Check: Page loads?
3. Check: No console errors?
4. Check: Sign in button works?
```

### 2. Test Authentication (2 minutes)
```
1. Click "Sign In"
2. Sign in with GitHub/Google
3. Check: Redirects after sign in?
4. Check: DevTools → Application → Session
5. Check: Token is stored?
```

### 3. Test Dashboard (1 minute)
```
1. Go to /dashboard
2. Check Network tab:
   - GET /api/user → 200?
   - GET /api/user/entities → 200?
3. Check: Page shows your name?
4. Check: No console errors?
```

### 4. Test Profile (2 minutes)
```
1. Go to /profile
2. Check: Profile loads?
3. Click "Edit Profile"
4. Make a change
5. Click "Save"
6. Check Network: PATCH request → Success?
```

### 5. Test Shows (3 minutes)
```
1. Go to /shows
2. Check Network: GET /api/shows
   - 200 = Backend works! ✅
   - 404 = Backend not implemented ⚠️
3. Click "Add Show" (if button exists)
4. Fill form and save
5. Check Network: POST /api/shows
```

### 6. Test Contacts (2 minutes)
```
1. Go to /contacts
2. Check Network: GET /api/contacts
3. Click "Add Contact"
4. Search for something
5. Check Network: GET /api/search?q=...
```

---

## 📊 Quick Results Template

```
✅ = Works perfectly
⚠️ = Works but has issues
❌ = Broken
➖ = Not tested

[ ] Landing page
[ ] Authentication
[ ] Dashboard
[ ] Profile page
[ ] Shows page
[ ] Tours page
[ ] Contacts page
[ ] Search
[ ] Messaging
[ ] Onboarding

API STATUS:
[ ] GET /api/user
[ ] GET /api/user/entities
[ ] GET /api/shows
[ ] GET /api/tours
[ ] GET /api/contacts
[ ] GET /api/search

CRITICAL ISSUES:
1. [Issue description]
2. [Issue description]

NOTES:
[Your observations]
```

---

## 🐛 Known Issues to Verify

### Issue #1: GET /api/user/entities
**Problem:** May return wrong data format
**Check:** Does response include `administratorId` field?
**Expected:** Array with full entity objects
**Actual:** [Document what you see]

### Issue #2: Duplicate Entity Check
**Problem:** May allow creating multiple entities
**Test:**
1. Create artist entity
2. Try creating another artist
3. Should get 409 error
**Actual:** [Document what happens]

### Issue #3: Shows/Tours Endpoints
**Problem:** May not exist (404)
**Check:** GET /api/shows and GET /api/tours
**Expected:** 404 or 200 with data
**Actual:** [Document status code]

---

## 🎨 UI Issues to Look For

```
[ ] Buttons don't work
[ ] Forms don't submit
[ ] Infinite loading spinners
[ ] Broken layouts
[ ] Missing images
[ ] Overlapping text
[ ] Console errors (red)
```

---

## 💡 Pro Tips

1. **Keep Network tab open** - You'll see everything happening
2. **Check Console frequently** - Catch errors early
3. **Test as different user types** - Artist vs Promoter
4. **Take screenshots** - Of errors and issues
5. **Copy error messages** - Exact text helps debugging
6. **Note API response structure** - For backend team
7. **Test edge cases** - Empty states, long text, etc.

---

## 📞 Where to Document Results

After testing, update:
- **TEST_RESULTS.md** - Detailed findings
- **MANUAL_TESTING_GUIDE.md** - Checkboxes and notes
- **API_AUDIT.md** - API-specific issues

---

## ⏱️ Time Estimate

**Quick test (30 min):**
- Landing, Auth, Dashboard, Profile

**Thorough test (2 hours):**
- All pages
- All API endpoints
- Create/edit/delete operations
- Search and filters

**Complete test (4 hours):**
- Everything above +
- Edge cases
- Different user types
- Browser compatibility
- Mobile responsiveness

---

## 🚀 Ready to Start?

1. ✅ Server is running (http://localhost:3001)
2. ✅ Browser with DevTools open
3. ✅ This reference card handy
4. ✅ TEST_RESULTS.md ready to update

**Let's go! 🎉**

Start with: http://localhost:3001
