# ✅ YOUR IMMEDIATE ACTION CHECKLIST

**Time Required:** 15-20 minutes
**Date:** January 28, 2026

---

## 🎯 Goal
Complete the Google Calendar integration setup and test it!

---

## 📋 Step-by-Step Checklist

### ☐ Step 1: Open Google Cloud Console (3 minutes)

1. [ ] Go to https://console.cloud.google.com/
2. [ ] Click "Select a project" dropdown at top
3. [ ] Click "New Project"
4. [ ] Name it: **"SceneGen Calendar Integration"**
5. [ ] Click "Create"
6. [ ] Wait for project creation (should take ~30 seconds)

**✓ Checkpoint:** You should see your new project selected at the top

---

### ☐ Step 2: Enable Google Calendar API (2 minutes)

1. [ ] Click the hamburger menu (☰) in top-left
2. [ ] Navigate to: **"APIs & Services"** → **"Library"**
3. [ ] In the search bar, type: **"Google Calendar API"**
4. [ ] Click on **"Google Calendar API"** from results
5. [ ] Click the blue **"Enable"** button
6. [ ] Wait for it to enable (~10 seconds)

**✓ Checkpoint:** You should see "API enabled" message

---

### ☐ Step 3: Configure OAuth Consent Screen (3 minutes)

1. [ ] In left sidebar, click **"OAuth consent screen"**
2. [ ] Select **"External"** (unless you have a Google Workspace)
3. [ ] Click **"Create"**
4. [ ] Fill in required fields:
   - App name: **SceneGen**
   - User support email: **[your email]**
   - Developer contact: **[your email]**
5. [ ] Click **"Save and Continue"**
6. [ ] On "Scopes" page, click **"Add or Remove Scopes"**
7. [ ] Find and check: **`https://www.googleapis.com/auth/calendar.events`**
8. [ ] Click **"Update"** then **"Save and Continue"**
9. [ ] On "Test users" page, click **"Save and Continue"** (you can skip this)
10. [ ] On "Summary" page, click **"Back to Dashboard"**

**✓ Checkpoint:** OAuth consent screen is configured

---

### ☐ Step 4: Create OAuth 2.0 Credentials (3 minutes)

1. [ ] In left sidebar, click **"Credentials"**
2. [ ] Click **"+ Create Credentials"** at the top
3. [ ] Select **"OAuth client ID"**
4. [ ] Application type: Select **"Web application"**
5. [ ] Name: **SceneGen Web Client**
6. [ ] Under **"Authorized JavaScript origins"**, click **"+ Add URI"**
   - Add: `http://localhost:3000`
7. [ ] Under **"Authorized redirect URIs"**, click **"+ Add URI"**
   - Add: `http://localhost:3000/api/auth/callback/google`
8. [ ] Click **"Create"**
9. [ ] **IMPORTANT:** You'll see a popup with your credentials
   - [ ] Copy **"Your Client ID"** (looks like: xxx.apps.googleusercontent.com)
   - [ ] Copy **"Your Client Secret"** (looks like: GOCSPX-xxx)
   - [ ] Keep this popup open or download the JSON

**✓ Checkpoint:** You have your Client ID and Client Secret copied

---

### ☐ Step 5: Add to Environment Variables (2 minutes)

1. [ ] Open your project in VS Code
2. [ ] Open the file: **`.env.local`** (in the root folder)
3. [ ] Scroll to the bottom
4. [ ] Add these three lines:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=PASTE_YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=PASTE_YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

5. [ ] Replace `PASTE_YOUR_CLIENT_ID_HERE` with your actual Client ID
6. [ ] Replace `PASTE_YOUR_CLIENT_SECRET_HERE` with your actual Client Secret
7. [ ] Save the file (Cmd+S / Ctrl+S)

**✓ Checkpoint:** Your `.env.local` file now has 3 new lines at the bottom

**Example of what it should look like:**
```bash
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

---

### ☐ Step 6: Restart Development Server (1 minute)

**In your terminal:**

1. [ ] Press **Ctrl+C** to stop the current server
2. [ ] Type: `pnpm dev`
3. [ ] Press **Enter**
4. [ ] Wait for server to start (~10 seconds)
5. [ ] Look for: "✓ Ready in X.Xs"
6. [ ] Should see: "Local: http://localhost:3000"

**✓ Checkpoint:** Server is running with no errors about Google credentials

---

### ☐ Step 7: Test the Calendar Integration (5 minutes)

1. [ ] Open browser to: **http://localhost:3000**
2. [ ] Sign in if not already signed in
3. [ ] Navigate to the **"Shows"** page (from sidebar)
4. [ ] Find any show in the table
5. [ ] Look for the **calendar icon** (🗓️) in the actions column
6. [ ] Click the **calendar icon**
7. [ ] **First time:** Should redirect to Google authorization page
   - [ ] Review permissions
   - [ ] Click **"Allow"**
8. [ ] Should redirect back to shows page
9. [ ] Should see success toast: **"Show synced to Google Calendar"**
10. [ ] Calendar icon should change (filled instead of outline)
11. [ ] **Open Google Calendar** in a new tab (calendar.google.com)
12. [ ] Navigate to the show's date
13. [ ] **Verify:** Event appears with show details

**✓ Checkpoint:** Show is visible in your Google Calendar!

---

### ☐ Step 8: Test Removing from Calendar (2 minutes)

1. [ ] Go back to the Shows page
2. [ ] Find the show you just synced (filled calendar icon)
3. [ ] Click the **calendar icon** again
4. [ ] Should see confirmation or immediately remove
5. [ ] Should see toast: **"Removed from Google Calendar"**
6. [ ] Calendar icon changes back to outline
7. [ ] Go back to Google Calendar
8. [ ] **Verify:** Event is removed

**✓ Checkpoint:** Can add and remove events successfully!

---

## 🎉 Success Criteria

You've completed the setup when:
- ✅ No errors in the terminal about missing Google variables
- ✅ Can click calendar icon on a show
- ✅ Google OAuth flow works (first time only)
- ✅ Show syncs to Google Calendar
- ✅ Can remove show from calendar
- ✅ Events appear in Google Calendar with correct details

---

## 🐛 Common Issues & Solutions

### Issue: "Missing Google Client ID"
**Solution:**
- Check `.env.local` has all 3 variables
- Check no typos in variable names (case-sensitive!)
- Restart dev server after adding them

### Issue: "redirect_uri_mismatch"
**Solution:**
- Go back to Google Cloud Console
- Credentials → Edit your OAuth client
- Make sure redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- No trailing slash!

### Issue: Calendar icon doesn't appear
**Solution:**
- Clear browser cache
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
- Check browser console for errors

### Issue: Event doesn't appear in Google Calendar
**Solution:**
- Wait 1-2 minutes (can take time to sync)
- Refresh Google Calendar
- Check you're looking at the correct date
- Verify it's on your primary calendar

---

## 📊 Testing Checklist

After completing setup, verify:

| Test | Status | Notes |
|------|--------|-------|
| OAuth connection works | ☐ | First time sync |
| Show syncs to calendar | ☐ | Check Google Calendar |
| Event has correct details | ☐ | Title, date, time, location |
| Can remove from calendar | ☐ | Icon changes back |
| No console errors | ☐ | Check browser console |
| Subsequent syncs work | ☐ | No re-auth needed |

---

## 📝 Notes Section

Use this space to track any issues or observations:

```
Issue 1: ___________________________________
Solution: ___________________________________

Issue 2: ___________________________________
Solution: ___________________________________

Additional notes:
_____________________________________________
_____________________________________________
_____________________________________________
```

---

## 🎓 What to Do After Completion

1. **Document your results** in `CALENDAR_TESTING_GUIDE.md`
2. **Take screenshots** of successful syncs
3. **Test edge cases** (multiple shows, different dates, etc.)
4. **Share with team** - Calendar integration is ready!
5. **Move on to other testing** - See `MANUAL_TESTING_GUIDE.md`

---

## 🆘 Need More Help?

**Quick References:**
- Detailed setup: `CALENDAR_SETUP_INSTRUCTIONS.md`
- Full testing guide: `CALENDAR_TESTING_GUIDE.md`
- Technical docs: `GOOGLE_CALENDAR_INTEGRATION.md`
- Environment vars: `ENV_TEMPLATE.md`

**Commands:**
```bash
# View environment variables (without values)
cat .env.local | grep GOOGLE

# Restart server
pnpm dev

# Clear Next.js cache and restart
rm -rf .next && pnpm dev
```

---

## ⏱️ Time Tracking

Started: ___:___ AM/PM
Completed: ___:___ AM/PM
Total Time: _____ minutes

---

**Ready? Let's begin! Start with Step 1 above.** 🚀

*Good luck! You've got this!* 💪
