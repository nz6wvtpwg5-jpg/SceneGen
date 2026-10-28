# Fix Google Calendar OAuth - Redirect URI Mismatch

## The Problem
You're getting **Error 400: redirect_uri_mismatch** because the redirect URI in your Google Cloud Console doesn't match what your app is sending.

## The Solution

### Step 1: Update Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project (SceneGen or whatever you named it)
3. Click on your **OAuth 2.0 Client ID** (the one for SceneGen)
4. Under "Authorized redirect URIs", you need to have:
   ```
   http://localhost:3000/api/calendar/callback
   ```

5. **Remove or update** any old URIs like:
   - ❌ `http://localhost:3000/api/auth/callback/google`

6. **Add** the correct URI:
   - ✅ `http://localhost:3000/api/calendar/callback`

7. Click **SAVE**

### Step 2: Restart Your Dev Server

Since we updated the `.env.local` file, you need to restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
pnpm run dev
```

### Step 3: Try Again

1. Go to `/shows` page
2. Click "Connect Google Calendar"
3. You should now see the **Google account picker**
4. Select `conanshowcalender@gmail.com`
5. Grant calendar permissions
6. You'll be redirected back to `/shows` with calendar connected

## What I Fixed

### Created Missing Callback Handler
- Created `/api/calendar/callback/route.ts` to handle OAuth responses
- Exchanges authorization code for access tokens
- Redirects back to shows page with success/error status

### Updated Environment Variable
Changed in `.env.local`:
```bash
# Old (wrong)
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# New (correct)
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
```

### Added Account Picker
Updated OAuth flow to include `prompt=select_account` so you can choose which Google account to use.

## Important Notes

⚠️ **You MUST update the redirect URI in Google Cloud Console** for this to work!

The error message "redirect_uri_mismatch" means Google is rejecting the connection because the URI doesn't match what you registered in the console.

## After Making These Changes

You should be able to:
1. Click "Connect Google Calendar"
2. See a list of your Google accounts
3. Select `conanshowcalender@gmail.com`
4. Grant permissions
5. See the calendar view on your shows page

The `axeconan@gmail.com` account won't interfere anymore because you'll explicitly choose which account to connect! 🎯
