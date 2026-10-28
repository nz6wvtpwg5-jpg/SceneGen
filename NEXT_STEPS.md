# SceneGen - What We Discovered & What to Do Next

**Date:** January 28, 2026
**Status:** Investigation Complete ✅

---

## 🔍 What We Found

Good news: **You have a substantial Azure backend already deployed!** It's not just mock data - you have real API endpoints at `https://scenegen-apim.azure-api.net`.

### ✅ What's Working (Documented in OpenAPI)

**Entity Management:**
- ✅ Create artist/promoter entities
- ✅ Get entity details
- ✅ Update profiles
- ✅ Add/remove band members
- ✅ Manage assets/images

**Contacts & Connections:**
- ✅ Send connection requests
- ✅ Accept/reject connections
- ✅ List contacts
- ✅ Search for entities

**Messaging:**
- ✅ Start conversations
- ✅ Send messages
- ✅ Get message history
- ✅ Real-time chat (separate API)

**Search:**
- ✅ Search entities by name
- ✅ Separate search API endpoint

**Notifications:**
- ✅ Get notification history
- ✅ Real-time notifications (SignalR)

### ⚠️ Known Issues

**Issue #1: GET /user/entities returns limited data**
- **Current:** Only returns `{name, id, entityType}`
- **Needed:** Full entity object with `administratorId` field
- **Impact:** This is why we have redirect loops!

**Issue #2: No duplicate entity check**
- **Current:** POST /artist/add doesn't return 409 for duplicates
- **Needed:** Backend should check if user already owns entity
- **Impact:** Users can create multiple entities

### ❌ Missing from Backend (Not in OpenAPI)

**Shows Management:**
- ❌ GET/POST/PATCH/DELETE `/shows`
- ❌ Show filtering and bulk updates

**Tours Management:**
- ❌ GET/POST/PATCH/DELETE `/tours`
- ❌ Tour-show associations

**Invites:**
- ❌ GET `/invites` (if needed)

---

## 🎯 What to Do Right Now

### Option 1: Test the Backend (30 min - Recommended) ⭐

Since the dev server is running on http://localhost:3001, let's **manually test** what works:

1. **Open http://localhost:3001 in your browser**
2. **Sign in** with your account
3. **Open DevTools** (F12 or Cmd+Option+I)
4. **Go to Network tab**
5. **Filter by "Fetch/XHR"**
6. **Walk through the app** and watch API calls

**What to test:**
- ✅ Sign in → Check if you get redirected properly
- ✅ Dashboard → Does it load your data?
- ✅ Profile → Can you view/edit it?
- ✅ Contacts → Can you search and add contacts?
- ❌ Shows → Does it show "coming soon" or actual data?
- ❌ Tours → Does it work or error out?

**Document what you find:**
- Which pages load correctly
- Which API calls fail (check for 404, 500 errors)
- What error messages appear

---

### Option 2: Test Backend Directly with Curl (15 min)

Let's bypass the frontend and test Azure API directly:

**Step 1: Get your JWT token**
```bash
# Open http://localhost:3001
# Sign in
# Open DevTools → Application → Session Storage
# Find "next-auth.session-token"
# Copy the value
```

**Step 2: Test critical endpoints**
```bash
export TOKEN="your-token-here"
export API_KEY="85a56b9eb87b48179218064bb1da6bab"

# Test 1: Get your entities (the problematic endpoint)
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/user/entities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $API_KEY" \
  | jq

# Test 2: Check if shows endpoint exists
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/shows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $API_KEY"

# Test 3: Check if tours endpoint exists
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/tours" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $API_KEY"
```

This will tell us:
- What GET `/user/entities` actually returns
- If shows/tours endpoints exist or return 404

---

### Option 3: Quick Fixes While Backend Team Works (45 min)

If shows/tours don't exist yet, we can:

**A. Add "Coming Soon" pages**
```typescript
// src/app/shows/page.tsx
export default function ShowsPage() {
  return (
    <div className="text-center py-20">
      <h1>Shows Management</h1>
      <p>Coming soon! Backend implementation in progress.</p>
      <p>Check back later this week.</p>
    </div>
  );
}
```

**B. Improve error handling**
- Show better error messages when API calls fail
- Add retry logic
- Fall back to mock data for demo purposes

**C. Polish what works**
- Test profile editing thoroughly
- Test contact search and connections
- Make sure messaging works
- Polish the UI

---

## 📋 Updated Backend TODO

Based on OpenAPI analysis, here's what backend team needs to do:

### Week 1 (Critical)

1. **Fix GET /user/entities** ⚠️⚠️⚠️
   ```
   Current schema: {name, id, entityType}

   Required schema: Full entity object with:
   - administratorId (CRITICAL!)
   - All profile fields (bio, city, state, country, etc.)
   - Profile/header images
   - Genres, members, assets
   ```

2. **Add duplicate entity check** ⚠️⚠️
   ```
   POST /artist/add and POST /promoter/add should:
   - Check if user already owns an entity
   - Return 409 Conflict if they do
   - Response: {"error": "You already own an entity"}
   ```

3. **Implement Shows endpoints** ❌
   ```
   GET    /shows
   POST   /shows
   GET    /shows/{id}
   PATCH  /shows/{id}
   DELETE /shows/{id}
   ```

4. **Implement Tours endpoints** ❌
   ```
   GET    /tours
   POST   /tours
   GET    /tours/{id}
   PATCH  /tours/{id}
   DELETE /tours/{id}
   ```

### Week 2 (High Priority)

5. Update OpenAPI specs with new endpoints
6. Add proper error handling (400, 401, 403, 409, 500)
7. Test all endpoints with Postman
8. Deploy to Azure

### Week 3 (Nice to Have)

9. Bulk operations for shows
10. Advanced filtering
11. Analytics endpoints

---

## 🚀 Recommended Next Actions

**RIGHT NOW:**

1. **✅ Test what works** - Go to http://localhost:3001 and manually test
2. **✅ Document results** - Update TESTING_CHECKLIST.md with findings
3. **✅ Share API_AUDIT.md with backend team** - They need to know what to fix

**TOMORROW:**

4. **Fix frontend for missing endpoints** - Add "Coming Soon" or error messages
5. **Polish working features** - Profile, contacts, search, messaging
6. **Create backend tickets** - One ticket per missing endpoint

**THIS WEEK:**

7. **Backend implements critical fixes** - GET /user/entities, duplicate check
8. **Remove temporary bypass** - Once backend is fixed
9. **Backend implements shows/tours** - Core functionality
10. **End-to-end testing** - Complete user flows

**NEXT WEEK:**

11. User acceptance testing
12. Bug fixes and polish
13. Deployment preparation
14. Documentation updates

---

## 💡 My Recommendation

**Start with Option 1** (manual testing) because:
- You'll see exactly what works and what doesn't
- You'll experience the app as a user would
- You'll find UI/UX issues we haven't caught
- It's the fastest way to assess readiness

Then:
- If shows/tours work → Great! Just fix the entity endpoint issue
- If shows/tours don't work → Add "Coming Soon" pages temporarily
- Document everything and coordinate with backend team

---

## 📚 Files Created for Reference

1. **API_AUDIT.md** - Detailed analysis of OpenAPI specs vs frontend expectations
2. **TESTING_CHECKLIST.md** - Step-by-step testing guide
3. **BACKEND_TODO.md** - Existing backend requirements (may need updates)
4. **USER_GUIDE_AND_FEATURES.txt** - User-facing documentation
5. **TECHNICAL_DOCUMENTATION.txt** - Developer documentation

---

## 🤔 Questions to Answer

1. **Do shows/tours endpoints exist?** (Test with curl or browser)
2. **What does GET /user/entities actually return?** (Check Network tab)
3. **Can you create duplicate entities?** (Try creating a 2nd artist)
4. **Does messaging work?** (Test real-time chat)
5. **Can you upload images?** (Test profile/header image upload)

---

**Ready to test?** The dev server is already running on port 3001!

Let me know what you find and I'll help fix any issues discovered.
