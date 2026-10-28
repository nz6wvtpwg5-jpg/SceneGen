# Testing Instructions - Calendar Sync Fix

## ✅ Bug Fixed

The `refetchShows()` function was broken - it was trying to use data before fetching it. This is now fixed.

---

## 🧪 How to Test

### Step 1: Clear Browser Cache & Reload
```bash
# In browser:
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Or clear cache in DevTools → Network tab → "Disable cache"
```

### Step 2: Open Browser Console
```
F12 or Cmd+Option+I → Console tab
```

### Step 3: Click "Add to Calendar" on Any Show

### Step 4: Watch the Console Logs

**You should see:**
```
🔄 Refetched shows after calendar sync: 2
📊 Show data details: [
  { id: 'abc123', venue: 'Burgerwees...', calendar_id: undefined },
  { id: 'xyz789', venue: 'Rue Dieu...', calendar_id: undefined }
]
```

**Key things to look for:**
- ✅ Number of shows matches (should be 2)
- ❓ `calendar_id: undefined` or `calendar_id: "some_event_id"`
  - If **undefined** → Database PATCH failed
  - If **has value** → Database PATCH worked!

---

## 🔍 Check Server Logs

**In the terminal where `npm run dev` is running**, look for:

### Good Signs ✅
```bash
✅ Show abc123 synced to Google Calendar (event ID: xyz789)
✅ Calendar event ID saved to database for show abc123
```

### Bad Signs ❌
```bash
✅ Show abc123 synced to Google Calendar (event ID: xyz789)
⚠️ Failed to save calendar event ID to database for show abc123
Response status: 404 (or 500, etc.)
Error details: Not Found
```

---

## 📊 What the Logs Tell Us

### Scenario A: calendar_id is undefined + PATCH fails
**Problem:** Backend doesn't support PATCH or column doesn't exist

**Next Steps:**
1. Check if backend has PATCH endpoint
2. Check if database has `google_calendar_event_id` column
3. Add column or implement endpoint

### Scenario B: calendar_id is undefined + No PATCH error
**Problem:** PATCH succeeds but backend ignores the field

**Next Steps:**
1. Backend may not have the column in database
2. Backend may not be saving the field
3. Need to check backend code

### Scenario C: calendar_id has value!
**Problem:** Actually solved! 🎉

**Expected Behavior:**
- Button changes to "Synced ✓" immediately
- After refresh, button still shows "Synced ✓"
- No duplicate events in Google Calendar

---

## 🎯 Expected vs Current Behavior

### What SHOULD Happen:
1. Click "Add to Calendar"
2. Event created in Google Calendar ✅
3. Event ID saved to database ❓
4. Shows refetched with new data ✅ (NOW FIXED)
5. Button shows "Synced ✓" ❓
6. After refresh, button still "Synced ✓" ❓

### What's Happening Now:
1. Click "Add to Calendar"
2. Event created in Google Calendar ✅
3. Event ID **NOT** saved to database ❌
4. Shows refetched (was broken, now fixed) ✅
5. Button shows "Add to Calendar" again ❌
6. After refresh, button shows "Add to Calendar" ❌

---

## 📝 What to Tell Me

After testing, please paste:

1. **Browser console output** (the 📊 Show data details line)
2. **Server logs** (the ✅ or ⚠️ messages)
3. **Button behavior** (Does it change to "Synced ✓"?)

Example:
```
📊 Show data details: [
  { id: '123', venue: 'Venue 1', calendar_id: undefined }
]

Server logs:
✅ Show 123 synced to Google Calendar (event ID: abc789)
⚠️ Failed to save calendar event ID to database for show 123
Response status: 404
Error details: Not Found

Button: Still shows "Add to Calendar" ❌
```

This will tell us exactly what's failing!
