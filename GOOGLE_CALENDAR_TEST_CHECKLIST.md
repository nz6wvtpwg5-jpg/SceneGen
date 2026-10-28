# Google Calendar Cookie Storage - Test Checklist

## ✅ Complete Implementation Checklist

### Backend Changes (Cookie-Based Storage)
- [x] Updated `/api/calendar/callback` to store tokens in HTTP-only cookies
- [x] Updated `/api/calendar/status` to read tokens from cookies
- [x] Updated `/api/calendar/events` to read tokens from cookies
- [x] Updated `/api/calendar/sync` (POST) to read tokens from cookies
- [x] Updated `/api/calendar/sync` (DELETE) to read tokens from cookies
- [x] Removed all `@ts-ignore` session.googleAccessToken references
- [x] All TypeScript errors resolved
- [x] Cookie security configured (httpOnly, secure, sameSite)

### Frontend
- [x] "Connect Google Calendar" button on `/shows` page
- [x] OAuth flow initiates from button click
- [x] Account picker enabled (`prompt=select_account consent`)

### Configuration
- [x] `.env.local` has correct Google OAuth credentials
- [x] Google Cloud Console redirect URIs configured
- [x] Test user added to OAuth consent screen
- [x] Google Calendar API enabled

## 🧪 Manual Testing Steps

### 1. Test OAuth Connection Flow
```
1. Open http://localhost:3000/shows
2. Ensure you're logged in to SceneGen
3. Click "Connect Google Calendar" button
4. Verify redirect to Google OAuth consent screen
5. Select correct account (e.g., conanshowcalendar@gmail.com)
6. Grant permissions
7. Verify redirect back to /shows?calendar_connected=true
8. Success notification should appear
```

**Expected Result:** ✅ Successfully connected, cookies stored

### 2. Verify Cookies Are Set
```
1. Open browser DevTools (F12)
2. Go to Application tab > Cookies > http://localhost:3000
3. Look for these cookies:
   - google_access_token
   - google_refresh_token
   - google_token_expires_at
```

**Expected Result:** ✅ All three cookies present with values

### 3. Test Calendar Status Endpoint
```bash
# In terminal or browser console
curl http://localhost:3000/api/calendar/status

# Or in browser console:
fetch('/api/calendar/status').then(r => r.json()).then(console.log)
```

**Expected Result:**
```json
{
  "connected": true,
  "email": "your-scenegen-email@example.com"
}
```

### 4. Test Fetching Calendar Events
```bash
# In terminal (need to include cookies)
curl http://localhost:3000/api/calendar/events \
  -H "Cookie: google_access_token=YOUR_TOKEN"

# Or in browser console (cookies sent automatically):
fetch('/api/calendar/events').then(r => r.json()).then(console.log)
```

**Expected Result:**
```json
{
  "success": true,
  "events": [...],
  "count": 10
}
```

### 5. Test Calendar Sync (Create Event)
```javascript
// In browser console
fetch('/api/calendar/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    showId: 'test-show-123',
    show: {
      title: 'Test Comedy Show',
      date: new Date('2024-12-25T19:00:00Z').toISOString(),
      venue: 'Test Comedy Club',
      description: 'A test show',
      location: '123 Main St, New York, NY'
    }
  })
}).then(r => r.json()).then(console.log)
```

**Expected Result:**
```json
{
  "success": true,
  "eventId": "some-google-calendar-event-id",
  "message": "Show synced to Google Calendar"
}
```

### 6. Verify Event in Google Calendar
```
1. Open https://calendar.google.com
2. Sign in with connected account
3. Navigate to December 25, 2024
4. Look for "Test Comedy Show" event
```

**Expected Result:** ✅ Event appears in calendar

### 7. Test Different Scenarios

#### Scenario A: Not Connected
```javascript
// 1. Clear cookies (DevTools > Application > Clear cookies)
// 2. Try fetching events
fetch('/api/calendar/events').then(r => r.json()).then(console.log)
```
**Expected:** `{ error: 'Google Calendar not connected...' }` (401)

#### Scenario B: Expired Token
```javascript
// 1. Manually modify google_token_expires_at to past date
// 2. Try fetching events
fetch('/api/calendar/events').then(r => r.json()).then(console.log)
```
**Expected:** Should work if token hasn't actually expired, or error if expired

#### Scenario C: Reconnect After Disconnect
```javascript
// 1. Clear all Google cookies
// 2. Click "Connect Google Calendar" again
// 3. Verify flow works from scratch
```
**Expected:** ✅ Full OAuth flow completes successfully

### 8. Test UI Integration on /shows Page

```
1. Navigate to /shows page
2. If not connected, should see "Connect Google Calendar" button
3. After connecting, button should show "Connected" or change state
4. Calendar events should display (if UI implemented)
5. Shows should have "Add to Calendar" button (if implemented)
```

**Expected Result:** ✅ UI reflects connection state correctly

## 🐛 Common Issues & Solutions

### Issue: "invalid_client" error
**Solution:** Check `.env.local` has correct `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Issue: "redirect_uri_mismatch" error
**Solution:**
1. Check `.env.local` `GOOGLE_REDIRECT_URI` matches exactly
2. Verify redirect URI in Google Cloud Console
3. Restart dev server after .env changes

### Issue: "access_denied" error
**Solution:** User canceled OAuth flow, try again

### Issue: Cookies not set
**Solution:**
1. Check browser allows cookies
2. Verify `/api/calendar/callback` is reached
3. Check browser console for errors
4. Verify callback sets cookies in response

### Issue: "Google Calendar not connected" despite cookies
**Solution:**
1. Verify cookie names are correct
2. Check cookie path is `/`
3. Verify cookies not expired
4. Check cookie domain matches current domain

### Issue: Events not fetching
**Solution:**
1. Check Google Calendar API is enabled
2. Verify access token is valid
3. Check OAuth scopes include calendar.readonly
4. Test token in Google OAuth Playground

## 📊 Validation Checklist

After testing, verify:

- [ ] OAuth flow completes without errors
- [ ] Cookies are set with correct values
- [ ] `/api/calendar/status` returns `connected: true`
- [ ] `/api/calendar/events` returns events array
- [ ] `/api/calendar/sync` creates events successfully
- [ ] Events appear in Google Calendar
- [ ] Account picker allows selecting correct account
- [ ] UI shows connection state correctly
- [ ] No console errors during OAuth flow
- [ ] Tokens persist after browser refresh

## 🚀 Ready for Production

Once all tests pass:

1. Update `GOOGLE_REDIRECT_URI` to production URL
2. Add production redirect URI in Google Cloud Console
3. Set OAuth consent screen to production mode (if ready)
4. Verify `secure: true` cookies work on HTTPS
5. Test on production domain

## 📝 Notes

- **No backend database changes required** - Tokens stored in browser cookies
- **Cookies expire after 60 days** - User needs to reconnect after expiration
- **HTTP-only cookies** - Cannot be accessed via JavaScript (secure against XSS)
- **Refresh token** - Stored for future token renewal (not yet implemented)

## Need Help?

Check these files:
- `/GOOGLE_CALENDAR_COOKIE_STORAGE.md` - Complete implementation guide
- `/GOOGLE_CALENDAR_INTEGRATION.md` - Original setup docs
- Browser console - Error messages and debug logs
- Google Cloud Console - OAuth config and logs
