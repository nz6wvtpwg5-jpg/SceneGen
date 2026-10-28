# Google Calendar OAuth - Troubleshooting redirect_uri_mismatch

## Current Status
Server is running correctly with the right redirect URI: `http://localhost:3000/api/calendar/callback`

## The Issue
Google OAuth settings can take 2-5 minutes to propagate after saving in the console.

## Solutions

### Option 1: Wait & Clear Cache (Recommended)
1. **Wait 2-3 minutes** after saving in Google Cloud Console
2. **Clear browser cache** or use Incognito mode
3. Try connecting again

### Option 2: Double-Check Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Verify BOTH these URIs exist:
   - `http://localhost:3000/api/auth/google/callback`
   - `http://localhost:3000/api/calendar/callback`
4. Make sure you clicked **SAVE** (not just added them)
5. Look for a green checkmark or success message

### Option 3: Force Fresh Request
Try this direct link (copy and paste in browser):
```
http://localhost:3000/api/calendar/connect
```

### Option 4: Check for Typos
In Google Cloud Console, make sure the URI is EXACTLY:
```
http://localhost:3000/api/calendar/callback
```

Common mistakes:
- ❌ `https` instead of `http`
- ❌ Extra spaces
- ❌ Missing `/api/calendar/callback`
- ❌ Wrong port number

## Still Not Working?

If after 5 minutes it still doesn't work, try:

1. **Delete the OAuth client** in Google Cloud Console
2. **Create a brand new one** with only:
   - Authorized redirect URI: `http://localhost:3000/api/calendar/callback`
3. **Update your `.env.local`** with the new Client ID and Secret
4. **Restart dev server**

## Debug Info

Your current setup:
- ✅ Redirect URI in .env.local: `http://localhost:3000/api/calendar/callback`
- ✅ Callback route exists: `/api/calendar/callback/route.ts`
- ✅ Server restarted and running
- ✅ Account picker enabled: `prompt=select_account consent`

The issue is most likely:
1. Google Cloud Console settings not saved properly
2. Google's cache (wait 2-3 minutes)
3. Browser cache (use incognito mode)
