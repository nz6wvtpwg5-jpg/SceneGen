# Entity Creation Testing - Step-by-Step Guide

**Server Running:** ✅ http://localhost:3001
**Documentation:** ENTITY_CREATION_TEST_RESULTS.md (update as you go)

---

## 🎯 What We're Testing

1. Can you create an entity (artist/promoter)?
2. Does GET /api/user/entities return correct data?
3. Does it include `administratorId` field?
4. Does duplicate prevention work (409 error)?

---

## 📋 Step-by-Step Instructions

### Step 1: Open Browser with DevTools

1. **Open a new browser window** (or use Simple Browser in VS Code)
2. **Navigate to:** http://localhost:3001
3. **Open DevTools:**
   - Mac: `Cmd + Option + I`
   - Windows/Linux: `F12`
4. **Click "Network" tab**
5. **Click "Console" tab** (keep both visible)
6. **Filter Network by "Fetch/XHR"**

✅ **Ready to proceed!**

---

### Step 2: Check Landing Page

**What to do:**
- Look at the page
- Check Console for errors (red text)
- Note any Network requests

**Document in ENTITY_CREATION_TEST_RESULTS.md:**
```
Landing Page: ✅ Loaded / ❌ Error
Console Errors: None / [list them]
Network Calls: [list any API calls]
```

---

### Step 3: Sign In

**What to do:**
1. Click "Sign In" button (if visible in header)
2. You'll be redirected to Azure B2C
3. Choose **GitHub** or **Google**
4. Complete sign-in
5. Wait for redirect back to app

**Watch for:**
- Where it redirects you after sign in
- Any errors in Console
- Session token stored (DevTools → Application → Storage)

**Document:**
```
Sign-in Method: [GitHub / Google]
Redirect Destination: [/dashboard / /onboarding / other]
Session Token: [Yes / No]
Console Errors: [None / list]
```

---

### Step 4: Navigate to Onboarding

**What to do:**
1. In browser address bar, type: `http://localhost:3001/onboarding`
2. Press Enter
3. Wait for page to load

**What you should see:**
- Onboarding form
- Step 1: Choose role (Artist/Promoter/Venue)
- Step 2: Profile details form

**Document:**
```
Onboarding Page Loads: ✅ Yes / ❌ No
Form Visible: ✅ Yes / ❌ No
Console Errors: [None / list]
```

**If page doesn't load:**
- Check Console for errors
- Check Network tab for failed requests
- Verify you're signed in

---

### Step 5: Fill Out Onboarding Form

**What to do:**

**Step 1 - Choose Role:**
1. Click "Artist" (or "Promoter")
2. Click "Next" or "Continue"

**Step 2 - Profile Details:**
Fill in the form:
```
Entity Name: "Test Band" (or any name)
City: "Brooklyn"
State: "New York"
Country: "United States"
Bio: "This is a test entity for testing purposes"
```

**BEFORE clicking submit:**
1. Make sure Network tab is visible
2. Make sure you're recording (red dot if needed)
3. Clear previous requests (trash icon)

✅ **Ready to submit!**

---

### Step 6: Submit Form & Capture API Call

**What to do:**
1. Click "Create Profile" or "Submit"
2. **IMMEDIATELY watch Network tab**
3. Look for: `POST /api/artist/add` or `POST /api/promoter/add`

**What to capture:**

**Click on the request in Network tab:**

1. **Headers tab:**
   - Request URL: [copy URL]
   - Status Code: [200 / 4xx / 5xx]
   - Request Headers: [check Authorization is present]

2. **Payload tab:**
   ```json
   {
     "name": "...",
     "city": "...",
     [copy the request body]
   }
   ```

3. **Response tab:**
   ```json
   {
     [copy ENTIRE response]
   }
   ```

4. **Preview tab:**
   - Easier to read
   - Check for `administratorId` field
   - Check for `id` field
   - Check for `entityType` field

**Document in ENTITY_CREATION_TEST_RESULTS.md:**
```
POST /api/artist/add
Status: [code]
Request: [paste payload]
Response: [paste full response]

administratorId present: ✅ Yes / ❌ No
```

---

### Step 7: Check GET /api/user/entities

**What to do:**
1. After entity creation, page may redirect
2. Look in Network tab for: `GET /api/user/entities`
3. If not there, manually refresh page or go to dashboard

**If no request visible:**
- Go to: http://localhost:3001/dashboard
- This should trigger GET /api/user/entities

**What to capture:**

**Click on GET /api/user/entities in Network:**

1. **Status Code:** [200 / error]

2. **Response (Preview tab):**
   ```json
   [
     {
       "id": "...",
       "administratorId": "...",  // ← CHECK IF THIS EXISTS!
       "entityType": "...",
       "name": "...",
       [copy full response]
     }
   ]
   ```

**CRITICAL CHECKS:**
- [ ] Response is an **array** (not object)
- [ ] Array has **1 item**
- [ ] Item has `administratorId` field
- [ ] Item has `id` field matching created entity

**Document:**
```
GET /api/user/entities
Status: [code]
Response Format: [Array / Object / Error]
Count: [number of entities]
Has administratorId: ✅ Yes / ❌ No

Full Response:
[paste it]
```

---

### Step 8: Test Duplicate Entity Prevention

**What to do:**
1. Go back to onboarding: http://localhost:3001/onboarding
2. Fill form with **DIFFERENT** data:
   ```
   Name: "Another Test Band"
   City: "Los Angeles"
   State: "California"
   Country: "United States"
   Bio: "Second attempt to create entity"
   ```
3. **Clear Network tab** (trash icon)
4. Click "Create Profile" / "Submit"
5. **Watch Network tab closely**

**Expected (if backend is fixed):**
```
POST /api/artist/add
Status: 409 Conflict
Response: {
  "error": "You already own an entity",
  "code": "DUPLICATE_ENTITY"
}
```

**If backend NOT fixed:**
```
POST /api/artist/add
Status: 200 OK
Response: {
  "id": "new-entity-id",
  [creates second entity - THIS IS A BUG!]
}
```

**Document:**
```
Second Entity Creation Attempt:
Status: [409 / 200 / other]
Duplicate Check Working: ✅ Yes (409) / ❌ No (200)

Response:
[paste it]
```

---

## 📊 What to Look For

### ✅ Good Signs:
- Status 200 on first creation
- Entity object returned with ID
- **`administratorId` field present**
- GET /api/user/entities returns array
- Status 409 on second creation attempt

### ❌ Bad Signs:
- Missing `administratorId` field
- GET /api/user/entities returns object (not array)
- GET /api/user/entities returns error
- Status 200 on second creation (allows duplicate)
- Console errors

---

## 🎯 Quick Results

After testing, answer these:

**Entity Creation:**
- [ ] ✅ Works perfectly
- [ ] ⚠️ Works but has issues
- [ ] ❌ Broken

**administratorId Field:**
- [ ] ✅ Present in POST response
- [ ] ✅ Present in GET /user/entities
- [ ] ❌ Missing (CRITICAL BUG)

**Duplicate Check:**
- [ ] ✅ Returns 409 Conflict
- [ ] ❌ Returns 200 OK (allows duplicate - BUG)

**Overall Status:**
- [ ] ✅ Ready for production
- [ ] ⚠️ Needs backend fixes
- [ ] ❌ Major issues found

---

## 💾 Save Your Work

As you test, update: `ENTITY_CREATION_TEST_RESULTS.md`

Copy/paste:
- Request payloads
- Response bodies
- Console errors
- Status codes

This will be valuable evidence for backend team!

---

## 🆘 If You Get Stuck

**Can't sign in:**
- Check Console for errors
- Verify Azure B2C credentials in .env.local
- Try different sign-in method

**Onboarding page won't load:**
- Check you're signed in
- Try direct URL: http://localhost:3001/onboarding
- Check Console for errors

**No Network requests showing:**
- Click "Preserve log" in Network tab
- Refresh page
- Make sure "Fetch/XHR" filter is active

**Can't find the request:**
- Look for `/api/artist/add` or `/api/promoter/add`
- Sort by Time (newest first)
- Check "All" instead of "Fetch/XHR"

---

## 🚀 Ready to Start?

1. ✅ Browser open to http://localhost:3001
2. ✅ DevTools open (Network + Console tabs)
3. ✅ ENTITY_CREATION_TEST_RESULTS.md ready to update
4. ✅ This guide open for reference

**Go to Step 1 and let's test!** 🎉

---

**Questions or issues? Let me know and I'll help debug!**
