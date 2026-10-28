# Google Calendar Integration - Setup Complete! ✅

## 🎉 Implementation Status

### ✅ Completed:
1. **Dependencies installed** - googleapis and google-auth-library
2. **Service created** - `/src/services/google-calendar.ts`
3. **API Routes created**:
   - `/src/app/api/calendar/status/route.ts` - Check connection status
   - `/src/app/api/calendar/sync/route.ts` - Sync/delete events
   - `/src/app/api/calendar/connect/route.ts` - OAuth initiation
4. **UI Component** - `/src/components/shows/CalendarSyncButton.tsx`
5. **Type definitions** - Extended NextAuth types for Google tokens

---

## 🔧 Required Setup (You Need to Do This!)

### Step 1: Create Google Cloud Project

1. **Go to:** https://console.cloud.google.com/
2. **Create a new project** named "SceneGen Calendar Integration"
3. **Enable Google Calendar API:**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose **"External"** for public use
3. Fill in:
   - **App name:** SceneGen
   - **User support email:** jon@scenegen.io
   - **Developer contact:** jon@scenegen.io
4. Add this scope:
   - `https://www.googleapis.com/auth/calendar.events`
5. Save and continue

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Configure:
   - **Name:** SceneGen Web Client
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/auth/callback/google-calendar`
5. Click "Create"
6. **SAVE YOUR CLIENT ID AND CLIENT SECRET!**

### Step 4: Add Environment Variables

Add these to your `.env.local` file:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google-calendar
```

**Replace `your-client-id-here` and `your-client-secret-here` with the actual values from Google Cloud Console!**

### Step 5: Update NextAuth Configuration

You need to add the Google provider to your NextAuth configuration.

**File to edit:** `/src/auth.ts`

Add this import at the top:
```typescript
import GoogleProvider from "next-auth/providers/google";
```

Then add the Google provider to your providers array:
```typescript
providers: [
  // ...your existing Azure AD B2C provider

  // Add Google Calendar provider
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
      params: {
        scope: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/calendar.events'
        ].join(' '),
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  }),
],
```

And update the callbacks to save Google tokens:
```typescript
callbacks: {
  async jwt({ token, account }) {
    // Existing code...

    // Add: Save Google Calendar tokens
    if (account && account.provider === 'google') {
      token.googleAccessToken = account.access_token;
      token.googleRefreshToken = account.refresh_token;
      token.googleExpiresAt = account.expires_at;
    }
    return token;
  },

  async session({ session, token }) {
    // Existing code...

    // Add: Add Google tokens to session
    session.googleAccessToken = token.googleAccessToken as string;
    session.googleRefreshToken = token.googleRefreshToken as string;
    session.googleExpiresAt = token.googleExpiresAt as number;
    return session;
  }
}
```

---

## 🚀 How to Use

### For Users:

1. **Navigate to Shows page** (`/shows`)
2. **Look for the "Connect Calendar" button** on each show
3. **Click it** to authorize Google Calendar access
4. **After connecting**, the button changes to "Add to Calendar"
5. **Click "Add to Calendar"** to sync the show to Google Calendar
6. **Check your Google Calendar** - the show will appear there!

### For Developers:

The `CalendarSyncButton` component can be added anywhere:

```typescript
import { CalendarSyncButton } from '@/components/shows/CalendarSyncButton';

// In your show component:
<CalendarSyncButton
  show={show}
  variant="outline"
  size="sm"
/>
```

---

## 📁 Files Created

```
/src/services/google-calendar.ts                    # Calendar service
/src/app/api/calendar/status/route.ts               # Status endpoint
/src/app/api/calendar/sync/route.ts                 # Sync endpoint
/src/app/api/calendar/connect/route.ts              # OAuth endpoint
/src/components/shows/CalendarSyncButton.tsx        # UI component
/types/next-auth.d.ts                                # Updated types
```

---

## 🧪 Testing

1. **Start the dev server**: `pnpm dev`
2. **Go to**: http://localhost:3000/shows
3. **Click "Connect Calendar"** on any show
4. **Authorize with Google**
5. **Click "Add to Calendar"**
6. **Open Google Calendar** to verify the event was created

---

## 🎯 Next Steps (Optional Enhancements)

### 1. Add Calendar Event ID Storage

Store the Google Calendar event ID with each show in your database:

```sql
ALTER TABLE shows
ADD COLUMN calendarEventId VARCHAR(255),
ADD COLUMN syncedToCalendar BOOLEAN DEFAULT FALSE,
ADD COLUMN lastSyncedAt TIMESTAMP;
```

This allows you to:
- Update calendar events when show changes
- Delete calendar events when show is cancelled
- Show sync status in UI

### 2. Auto-Sync on Show Create

Automatically sync new shows to calendar:

```typescript
// In your show creation API route
if (session.googleAccessToken) {
  const calendarService = new GoogleCalendarService(
    session.googleAccessToken,
    session.googleRefreshToken
  );
  const eventId = await calendarService.createEvent(showToCalendarEvent(show));
  // Save eventId to database
}
```

### 3. Two-Way Sync

Import calendar events as shows:

```typescript
// Periodically fetch calendar events
const events = await calendarService.getEvents(
  new Date().toISOString(),
  futureDate.toISOString()
);

// Convert to shows and save
```

### 4. Bulk Sync

Add a "Sync All Shows" button to sync all upcoming shows at once.

### 5. Calendar Settings Page

Create `/settings/calendar` page with:
- Connection status
- Auto-sync toggle
- Calendar selection (primary/other calendars)
- Reminder preferences
- Disconnect option

---

## ⚠️ Important Notes

### Rate Limits
- Google Calendar API has quotas
- Default: 1,000,000 queries/day
- Be mindful when implementing bulk operations

### Token Refresh
- Access tokens expire after 1 hour
- `google-auth-library` handles refresh automatically
- Refresh tokens are long-lived (but can be revoked)

### Error Handling
- Handle revoked access gracefully
- Show clear error messages to users
- Provide "reconnect" option if access is lost

### Privacy
- Only request `calendar.events` scope (not full calendar access)
- Store refresh tokens encrypted in database (when implemented)
- Allow users to disconnect/revoke access easily

---

## 🐛 Troubleshooting

### "Google Calendar not connected" error
- Make sure you've added env variables
- Restart dev server after adding env vars
- Check that OAuth flow completed successfully

### "Failed to create calendar event" error
- Verify the access token is valid
- Check Google Cloud Console for API quota limits
- Ensure Calendar API is enabled

### OAuth redirect not working
- Verify redirect URI matches exactly in Google Console
- Check that it's added to "Authorized redirect URIs"
- Make sure URL includes protocol (`http://`)

### Button shows "Connect Calendar" after connecting
- Check browser console for errors
- Verify tokens are being saved to session
- Test `/api/calendar/status` endpoint directly

---

## 📚 Resources

- **Google Calendar API:** https://developers.google.com/calendar/api
- **OAuth 2.0 Guide:** https://developers.google.com/identity/protocols/oauth2
- **NextAuth Google Provider:** https://next-auth.js.org/providers/google
- **googleapis npm:** https://www.npmjs.com/package/googleapis

---

## ✅ Checklist

Before going live:

- [ ] Created Google Cloud project
- [ ] Enabled Google Calendar API
- [ ] Configured OAuth consent screen
- [ ] Created OAuth 2.0 credentials
- [ ] Added env variables to `.env.local`
- [ ] Updated NextAuth configuration in `/src/auth.ts`
- [ ] Restarted dev server
- [ ] Tested OAuth flow
- [ ] Successfully synced a show to calendar
- [ ] Verified event appears in Google Calendar

---

**Need help? Check `GOOGLE_CALENDAR_INTEGRATION.md` for the full implementation guide!**

🎉 **You're all set! The calendar integration is ready to use once you complete the Google Cloud setup.** 🎉
