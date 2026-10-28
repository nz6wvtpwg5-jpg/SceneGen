# Google Calendar Integration - Quick Reference

## 🚀 Quick Start

### Test the Modal
```bash
# 1. Open in incognito mode
open -na "Google Chrome" --args --incognito http://localhost:3000/shows

# 2. Wait 1 second, modal should appear
# 3. Click "Connect Calendar" to test OAuth flow
```

### Reset Testing State
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
// Then refresh page
```

---

## 📍 Key Files

| File | Purpose |
|------|---------|
| `src/app/shows/page.tsx` | Shows page with modal integration |
| `src/components/shows/GoogleCalendarConnectModal.tsx` | Calendar connection modal |
| `src/app/api/auth/google/calendar/route.ts` | OAuth initiator |
| `src/app/api/auth/google/callback/route.ts` | OAuth callback handler |

---

## 🔑 Storage Keys

| Key | Type | Purpose | Lifetime |
|-----|------|---------|----------|
| `google-calendar-connected` | localStorage | Tracks if calendar is connected | Permanent |
| `google-calendar-prompt-dismissed` | sessionStorage | Tracks if modal was dismissed | Session only |
| `google_access_token` | Cookie (httpOnly) | Google API access token | 1 hour |
| `google_refresh_token` | Cookie (httpOnly) | Token refresh token | 30 days |

---

## 🎯 OAuth Scopes

```javascript
[
  'https://www.googleapis.com/auth/calendar',           // Read/write calendar
  'https://www.googleapis.com/auth/calendar.events'     // Read/write events
]
```

---

## 🔗 URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/shows` | Shows page |
| `http://localhost:3000/api/auth/google/calendar` | Start OAuth |
| `http://localhost:3000/api/auth/google/callback` | OAuth callback |
| `http://localhost:3000/shows?calendar_connected=true` | Success redirect |
| `http://localhost:3000/shows?error=calendar_auth_failed` | Error redirect |

---

## 🧪 Test Scenarios

### 1. Happy Path
```
Visit /shows → Modal appears → Click "Connect" →
Google consent → Approve → Back to /shows → Success toast
```

### 2. Skip Modal
```
Visit /shows → Modal appears → Click "Skip for Now" →
Modal closes → Refresh page → Modal doesn't appear
```

### 3. Cancel OAuth
```
Visit /shows → Modal appears → Click "Connect" →
Google consent → Cancel → Back to /shows → Error toast
```

### 4. Already Connected
```
localStorage has 'google-calendar-connected' = 'true' →
Visit /shows → Modal doesn't appear
```

---

## 🐛 Debug Commands

### Check Storage
```javascript
// In browser console:
console.log('localStorage:', localStorage.getItem('google-calendar-connected'));
console.log('sessionStorage:', sessionStorage.getItem('google-calendar-prompt-dismissed'));
```

### Check Cookies
```javascript
// In browser console:
document.cookie.split(';').forEach(c => console.log(c.trim()));
```

### Clear Everything
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});
location.reload();
```

---

## 📝 Common Issues

### Modal doesn't appear
- Check if `google-calendar-connected` is in localStorage (should be empty)
- Check if `google-calendar-prompt-dismissed` is in sessionStorage (should be empty)
- Try incognito mode
- Check console for errors

### OAuth fails
- Verify `.env.local` has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Check redirect URI in Google Cloud Console matches callback URL
- Look at server logs for errors

### Infinite errors still happening
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
- Clear Next.js cache: `rm -rf .next && npm run dev`
- Check if changes to `page.tsx` were saved

---

## 🔄 Modal Visibility Logic

```javascript
Show modal IF:
  ✓ NOT in localStorage: 'google-calendar-connected'
  ✓ NOT in sessionStorage: 'google-calendar-prompt-dismissed'
  ✓ NOT checking entities (isCheckingEntities = false)
  ✓ After 1 second delay
```

---

## 📊 Expected Console Output

### Successful OAuth
```
✅ Successfully obtained tokens: {
  access_token: 'ya29.a0AfB_byC...',
  refresh_token: 'Present',
  expiry_date: 1234567890000
}
```

### OAuth Error
```
Error handling Google Calendar OAuth callback: [Error details]
```

---

## ⚙️ Environment Variables

```env
# Required for Google Calendar OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
NEXTAUTH_URL=http://localhost:3000

# For production, change to:
NEXTAUTH_URL=https://yourdomain.com
```

---

## 🎨 Modal Behavior

| Action | Result |
|--------|--------|
| Click "Connect Calendar" | Start OAuth flow → Redirect to Google |
| Click "Skip for Now" | Close modal, set sessionStorage flag |
| Click X button | Same as "Skip for Now" |
| Press Escape | Same as "Skip for Now" |
| Refresh after skip | Modal doesn't appear (same session) |
| New browser session | Modal appears again |
| Complete OAuth | Modal never appears again |

---

## 🔧 Quick Fixes

### Reset modal state
```javascript
sessionStorage.removeItem('google-calendar-prompt-dismissed');
```

### Reset connection state
```javascript
localStorage.removeItem('google-calendar-connected');
```

### Force modal to appear
```javascript
localStorage.removeItem('google-calendar-connected');
sessionStorage.removeItem('google-calendar-prompt-dismissed');
location.reload();
```

---

## 📚 Related Documentation

- `GOOGLE_CALENDAR_MODAL_TESTING.md` - Full testing guide
- `GOOGLE_CALENDAR_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `CALENDAR_SETUP_CHECKLIST.md` - OAuth setup guide
- `QUICK_CALENDAR_TEST.md` - Quick test scenarios

---

**Happy Testing! 🎉**
