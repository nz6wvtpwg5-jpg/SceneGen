# 🚀 Google Calendar Integration - Quick Start Guide

**Status:** ✅ Code Implementation Complete | ⏳ Setup Required

---

## 📋 What's Already Done

✅ All code is implemented and ready to use:
- Google Calendar service (`/src/services/google-calendar.ts`)
- API routes for status, sync, and connection
- UI components (`CalendarSyncButton`)
- NextAuth configuration updated with Google provider
- Type definitions for Google tokens

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Get Google OAuth Credentials

1. Go to https://console.cloud.google.com/
2. Create project: "SceneGen Calendar"
3. Enable "Google Calendar API" from Library
4. Configure OAuth consent screen (External)
5. Create OAuth 2.0 credentials:
   - Type: Web application
   - Authorized origins: `http://localhost:3000`
   - Redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy your **Client ID** and **Client Secret**

### Step 2: Add to Environment Variables

Add these three lines to your `.env.local` file:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

**⚠️ Important:** Replace `your-client-id-here` and `your-client-secret-here` with your actual values!

### Step 3: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
pnpm dev
```

### Step 4: Test It!

1. Go to **Shows** page
2. Click the **calendar icon** (🗓️) on any show
3. First time: You'll be redirected to Google to authorize
4. After authorization: Show will sync to your Google Calendar!

---

## 🧪 Testing the Integration

### Test Scenario 1: First-Time Connection

1. Navigate to `/shows`
2. Click calendar icon on a show
3. Should redirect to Google OAuth consent screen
4. Grant permissions
5. Return to app → Show synced to calendar

**Expected Result:** ✅ Event appears in Google Calendar with show details

### Test Scenario 2: Subsequent Syncs

1. Click calendar icon on another show
2. Should sync immediately (no OAuth prompt)
3. Check Google Calendar

**Expected Result:** ✅ New event added without re-authentication

### Test Scenario 3: Remove from Calendar

1. Click calendar icon on a synced show (icon should be filled/colored)
2. Confirm deletion
3. Check Google Calendar

**Expected Result:** ✅ Event removed from Google Calendar

### Test Scenario 4: Connection Status

1. Open browser console
2. Go to `/shows`
3. Check network tab for `/api/calendar/status` call

**Expected Response:**
```json
{
  "connected": true,
  "email": "your-email@gmail.com"
}
```

---

## 🐛 Troubleshooting

### "Missing Google Credentials" Error

**Problem:** Environment variables not set
**Solution:**
1. Check `.env.local` has all 3 Google variables
2. Restart dev server after adding them
3. Verify no typos in variable names

### OAuth Error: redirect_uri_mismatch

**Problem:** Redirect URI not authorized in Google Console
**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Add: `http://localhost:3000/api/auth/callback/google`
4. Save and try again

### "Failed to sync" Error

**Problem:** API not returning proper session
**Solution:**
1. Check NextAuth is working (sign out/in)
2. Verify Google provider is in auth config
3. Check browser console for detailed errors

### Calendar Events Not Appearing

**Problem:** May need to select which calendar
**Solution:**
1. Events go to "primary" calendar by default
2. Check your Google Calendar's default calendar setting
3. Try refreshing Google Calendar (can take 1-2 minutes)

---

## 📊 What You Can Do Now

✅ **Sync shows to Google Calendar**
- One-click sync from Shows table
- Automatic event creation with all show details
- Location, date/time, and description included

✅ **Remove events from calendar**
- Click synced show's calendar icon again
- Confirmation dialog before deletion
- Instant removal from Google Calendar

✅ **View connection status**
- API endpoint shows if user is connected
- Displays connected Google account email
- Can be used to show status in UI

---

## 🔮 Future Enhancements (Not Yet Implemented)

These would require additional backend work:

❌ **Auto-sync** - Automatically sync all new shows
❌ **Two-way sync** - Import calendar events as shows
❌ **Sync history** - Track which shows are synced (needs database)
❌ **Multiple calendars** - Choose which calendar to sync to
❌ **Update events** - Update calendar when show details change
❌ **Settings page** - Manage calendar preferences

To implement these, you'll need:
- Database table for calendar sync tracking
- Backend API to store/retrieve sync status
- Webhooks for Google Calendar changes (for two-way sync)

---

## 📝 Production Deployment Checklist

Before deploying to production:

- [ ] Update OAuth redirect URIs with production domain
- [ ] Set environment variables on hosting platform
- [ ] Verify OAuth consent screen is published (not testing mode)
- [ ] Add production domain to authorized origins
- [ ] Test full flow in production environment
- [ ] Set up error monitoring for calendar API failures
- [ ] Consider rate limiting (Google Calendar API has quotas)

---

## 🆘 Need Help?

1. Check `/GOOGLE_CALENDAR_INTEGRATION.md` for detailed docs
2. Check `/CALENDAR_SETUP_INSTRUCTIONS.md` for step-by-step guide
3. Review `/src/services/google-calendar.ts` for implementation details
4. Look at API routes in `/src/app/api/calendar/` for debugging

---

## 🎉 You're All Set!

Once you've added the environment variables and restarted the server, the calendar integration is fully functional!

Happy syncing! 📅✨
