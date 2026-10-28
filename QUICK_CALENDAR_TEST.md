# 🚀 Quick Calendar Test - 5 Minutes

**Server is ready!** Running on: http://localhost:3001

---

## ✅ Quick Test Steps

### Step 1: Open the App (30 seconds)
1. Open your browser
2. Go to: **http://localhost:3001**
3. Sign in if you're not already logged in

### Step 2: Navigate to Shows (30 seconds)
1. Click **"Shows"** in the sidebar (left side)
2. You should see a table of shows
3. Look for the **Actions** column on the right

### Step 3: Test Calendar Sync (2 minutes)
1. Find ANY show in the table
2. Look for the **calendar icon** (🗓️) in the Actions column
3. **Click the calendar icon**
4. **FIRST TIME:** You'll be redirected to Google
   - You'll see "SceneGen wants to access your Google Account"
   - Review the permissions
   - Click **"Allow"** or **"Continue"**
5. You'll be redirected back to http://localhost:3001/shows
6. Watch for a **success toast notification** at the top/bottom

### Step 4: Verify in Google Calendar (2 minutes)
1. Open a new tab
2. Go to: **https://calendar.google.com**
3. Find the date of the show you synced
4. **Look for the event** - it should be there!
5. Click on it to see details (venue, time, description)

---

## ✅ Success Criteria

You've succeeded if:
- ✅ Calendar icon appears on shows
- ✅ Clicking it redirects to Google (first time)
- ✅ After authorization, you return to the app
- ✅ Success toast appears
- ✅ Calendar icon changes appearance (filled/colored)
- ✅ Event appears in your Google Calendar

---

## 🐛 Troubleshooting

### "Calendar icon doesn't appear"
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Clear browser cache
- Check browser console (F12) for errors

### "Redirect URI mismatch" error
- The redirect URI in Google Console needs to be updated to:
  `http://localhost:3001/api/auth/callback/google`
- Go back to Google Cloud Console
- Edit your OAuth client
- Change the redirect URI to port 3001

### "Event doesn't appear in calendar"
- Wait 1-2 minutes (can take time to sync)
- Refresh Google Calendar
- Check you're looking at the correct date
- Verify it's your primary calendar

---

## 📋 What to Test Next

After the quick test works:

1. **Test removing from calendar**
   - Click the calendar icon again on a synced show
   - Should remove it from Google Calendar

2. **Test multiple shows**
   - Sync 3-4 different shows
   - Verify all appear in calendar

3. **Test session persistence**
   - Close browser completely
   - Reopen and sync another show
   - Should NOT need to re-authorize

---

## 📖 Complete Testing

For comprehensive testing, see:
- **CALENDAR_TESTING_GUIDE.md** - Full test plan (7 scenarios, 25-30 min)

---

**Ready? Open http://localhost:3001 and start testing!** 🚀
