# SceneGen Testing Checklist

**Date:** January 28, 2026
**Purpose:** Systematically test all features to identify what works and what needs backend fixes

---

## 🎯 Testing Strategy

We have a live Azure backend at `https://scenegen-apim.azure-api.net/scenegen-api`.
Most API routes are already implemented as proxies. We need to test each feature to see:
- ✅ What works perfectly
- ⚠️ What works but has minor issues
- ❌ What's broken and needs backend fixes

---

## 📋 Test Each Feature Systematically

### 1. Authentication & Onboarding
- [ ] **Sign In** - Does Azure B2C login work?
- [ ] **First Time User** - Are you redirected to onboarding?
- [ ] **Choose Role** - Can you select Artist/Promoter/Venue?
- [ ] **Complete Profile** - Does POST /artist/add or /promoter/add work?
- [ ] **Duplicate Entity Check** - Does backend prevent creating 2nd entity? (409 error)
- [ ] **After Onboarding** - Do you land on dashboard without redirect loops?

**How to Test:**
1. Sign out completely
2. Sign in with a fresh account
3. Complete onboarding
4. Try to create another entity (should fail with 409)

**Expected Issues:**
- ⚠️ Backend may not return 409 for duplicate entities (BACKEND_TODO #1)
- ⚠️ Redirect loops due to temporary bypass in useOnboardingRedirect.ts

---

### 2. User Entities
- [ ] **GET /user/entities** - Does it return your entities?
- [ ] **administratorId field** - Is it included in response?
- [ ] **Entity Type** - Is entityType correctly set (artist/promoter)?
- [ ] **Profile Data** - Are all fields present (name, city, bio, etc.)?

**How to Test:**
1. Open browser DevTools → Network tab
2. Go to Dashboard
3. Look for call to `/api/user/entities`
4. Check response JSON for `administratorId` field

**Expected Issues:**
- ❌ May return error object instead of array (BACKEND_TODO #2)
- ❌ Missing administratorId field (BACKEND_TODO #2)

---

### 3. Profile Management
- [ ] **View Profile** - Does /profile page load your data?
- [ ] **Edit Profile** - Does the edit form populate correctly?
- [ ] **Update Profile** - Does PATCH /artist/{id} or /promoter/{id} work?
- [ ] **Image Upload** - Can you upload profile/header images?
- [ ] **Social Links** - Can you add Spotify, Instagram, etc.?
- [ ] **Genres** - Can you select and save genres?
- [ ] **Band Members** - Can you add/edit band members?

**How to Test:**
1. Go to /profile
2. Click "Edit Profile"
3. Change some fields
4. Save and verify changes persist

---

### 4. Shows Management
- [ ] **GET /shows** - Does it return your shows?
- [ ] **Create Show** - Does POST /shows work?
- [ ] **Edit Show** - Does PATCH /shows/{id} work?
- [ ] **Delete Show** - Does DELETE /shows/{id} work?
- [ ] **Filter by Status** - confirmed/proposed/cancelled
- [ ] **Bulk Actions** - Can you select multiple and update status?
- [ ] **Add to Tour** - Can you assign shows to a tour?

**How to Test:**
1. Go to /shows
2. Create a new show
3. Edit it
4. Try bulk select and change status
5. Delete it

**Expected Issues:**
- ⚠️ Backend might not support all status values
- ⚠️ Bulk update might need backend implementation

---

### 5. Tours Management
- [ ] **GET /tours** - Does it return your tours?
- [ ] **Create Tour** - Does POST /tours work?
- [ ] **Tour Details** - Does /tours/{id} show tour info?
- [ ] **Add Shows to Tour** - Can you assign shows?
- [ ] **Edit Tour** - Does PATCH /tours/{id} work?
- [ ] **Delete Tour** - Does DELETE /tours/{id} work?

**How to Test:**
1. Go to /tours (or /shows and create tour from there)
2. Create a new tour
3. Add shows to it
4. View tour details
5. Edit and delete

---

### 6. Contacts & Connections
- [ ] **GET /contacts** - Returns your existing contacts?
- [ ] **Search Entities** - Does GET /search work?
- [ ] **Send Connection Request** - POST /contacts/request
- [ ] **View Pending Requests** - Shows incoming requests?
- [ ] **Accept Request** - POST /contacts/accept/{id}
- [ ] **Reject Request** - POST /contacts/reject/{id}
- [ ] **View Contact Details** - Can you see their profile?

**How to Test:**
1. Go to /contacts
2. Click "Add Contact"
3. Search for an entity
4. Send connection request
5. (Have another user) Accept/reject request

---

### 7. Messaging / Chat
- [ ] **GET /conversations** - Returns your conversations?
- [ ] **Create Conversation** - POST /conversations
- [ ] **GET /messages** - Returns messages in conversation?
- [ ] **Send Message** - POST /messages
- [ ] **Real-time Updates** - Ably integration working?
- [ ] **Message Notifications** - Do you get notified?

**How to Test:**
1. Go to a contact's profile
2. Click "Message"
3. Send a message
4. Check if it appears
5. (Have another user) Reply and check real-time updates

**Expected Issues:**
- ⚠️ Ably API key may need configuration
- ⚠️ Real-time may not work if Ably not properly set up

---

### 8. Search
- [ ] **Search Artists** - GET /search?type=artist&query={q}
- [ ] **Search Promoters** - GET /search?type=promoter&query={q}
- [ ] **Search by Location** - Filter by city/state
- [ ] **Search by Genre** - Filter by music genres
- [ ] **View Search Results** - Click on result goes to profile

**How to Test:**
1. Go to /contacts or search page
2. Use search bar
3. Try different filters
4. Click on results

---

### 9. Notifications
- [ ] **GET /notification/history** - Returns notifications?
- [ ] **Mark as Read** - Can you mark notifications read?
- [ ] **Real-time Notifications** - Do new ones appear?
- [ ] **Notification Types** - Connection requests, messages, etc.

**How to Test:**
1. Check notification icon in header
2. Generate a notification (connection request)
3. Check if it appears

---

### 10. Dashboard
- [ ] **Loads Correctly** - No errors on page load
- [ ] **Upcoming Shows** - Shows your next shows
- [ ] **Recent Messages** - Shows latest messages
- [ ] **Pending Requests** - Shows connection requests
- [ ] **Quick Actions** - Buttons work correctly

**How to Test:**
1. Go to /dashboard
2. Check all sections load
3. Click on items to navigate

---

## 🔧 How to Run This Test

### Step 1: Start the Dev Server
```bash
cd /Users/jon/Desktop/scenegen/SceneGenUIV2
pnpm dev
```

### Step 2: Open Browser DevTools
- Press F12 or Cmd+Option+I
- Go to Network tab
- Filter by "Fetch/XHR"

### Step 3: Test Each Section
- Follow the checklist above
- Check Network tab for API calls
- Note any errors (4xx or 5xx responses)
- Check Console for JavaScript errors

### Step 4: Document Issues
Create a list of:
- ✅ Features that work perfectly
- ⚠️ Features with minor issues (fix in frontend)
- ❌ Features broken (need backend fix)

---

## 📝 Report Template

After testing, fill this out:

```
## Working Features ✅
- Authentication via Azure B2C
- Dashboard loads
- etc...

## Minor Issues ⚠️
- Profile image upload UI exists but not connected
- etc...

## Broken Features ❌
- GET /user/entities returns error object
- POST /artist/add allows duplicate entities (no 409)
- etc...

## Backend Changes Needed
1. Fix GET /user/entities to return array with administratorId
2. Add duplicate entity check (return 409)
3. etc...
```

---

## 🎯 Priority Order

Test in this order:
1. **Authentication & Onboarding** (Critical - blocks everything)
2. **User Entities** (Critical - needed for all features)
3. **Profile Management** (High priority - core feature)
4. **Shows & Tours** (High priority - main functionality)
5. **Contacts & Search** (Medium priority)
6. **Messaging** (Medium priority)
7. **Notifications** (Low priority - nice to have)

---

## 🚀 Next Steps After Testing

Once you complete this checklist, you'll know:
1. **What works** - Can demo these features immediately
2. **What needs frontend fixes** - Quick wins you can do now
3. **What needs backend fixes** - Create detailed Azure API requirements

Then update `BACKEND_TODO.md` with **actual test results** instead of assumptions.
