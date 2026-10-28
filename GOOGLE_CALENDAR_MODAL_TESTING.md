# Google Calendar Integration - Testing Guide

## 🎯 What We Fixed & Added

### 1. **Fixed Infinite Error Toast Loop** ✅
- **Problem**: The `/shows` page was stuck in an infinite loop, repeatedly showing error toasts
- **Solution**: Fixed the `useEffect` dependency array to prevent unnecessary re-renders
- **Location**: `src/app/shows/page.tsx` (lines 45-65)

### 2. **Added Google Calendar Connection Modal** ✅
- **Feature**: First-time visitors to `/shows` will see a modal prompting them to connect Google Calendar
- **Behavior**:
  - Shows after 1 second delay on first visit
  - Can be dismissed with "Skip for Now"
  - Won't show again in the same session after dismissing
  - Won't show if calendar is already connected
- **Location**: `src/components/shows/GoogleCalendarConnectModal.tsx`

### 3. **Created OAuth Flow** ✅
- **Endpoints**:
  - `/api/auth/google/calendar` - Initiates OAuth flow
  - `/api/auth/google/callback` - Handles OAuth callback
- **Flow**:
  1. User clicks "Connect Calendar" in modal
  2. Redirected to Google consent screen
  3. After approval, redirected back to `/shows` with success message
  4. Tokens stored in cookies (temporary solution)

---

## 🧪 Testing Steps

### Test 1: First Visit Modal
1. Open your browser in **incognito/private mode** (to simulate first visit)
2. Navigate to `http://localhost:3000/shows`
3. **Expected**: After ~1 second, you should see the Google Calendar connection modal
4. **Check**: Modal has:
   - Calendar icon
   - "Connect Google Calendar" title
   - Benefits list
   - "Connect Calendar" and "Skip for Now" buttons

### Test 2: Skip Modal
1. In the modal, click **"Skip for Now"**
2. **Expected**: Modal closes
3. Refresh the page (F5)
4. **Expected**: Modal does NOT appear again (stored in sessionStorage)
5. Close the browser and reopen `http://localhost:3000/shows`
6. **Expected**: Modal DOES appear again (new session)

### Test 3: OAuth Flow
1. Clear your browser's localStorage and sessionStorage
2. Navigate to `http://localhost:3000/shows`
3. Click **"Connect Calendar"** in the modal
4. **Expected**:
   - Redirected to Google's consent screen
   - Shows "SceneGen wants to access your Google Calendar"
   - Lists permissions requested
5. Click **"Allow"**
6. **Expected**:
   - Redirected back to `/shows`
   - See success toast: "Google Calendar connected successfully! 🎉"
   - Modal does NOT appear on refresh

### Test 4: No More Infinite Errors
1. Navigate to `http://localhost:3000/shows`
2. Open browser DevTools Console (F12)
3. **Expected**:
   - You should see at most ONE error if the backend is down
   - No repeated "Failed to load shows" toasts
   - Page is usable and doesn't freeze

### Test 5: Error States
1. Test cancelling OAuth:
   - Click "Connect Calendar"
   - On Google consent screen, click "Cancel"
   - **Expected**: Redirected back with error message

2. Test with missing OAuth credentials:
   - Stop your dev server
   - Remove `GOOGLE_CLIENT_ID` from `.env.local`
   - Restart server
   - Try to connect calendar
   - **Expected**: Error message displayed

---

## 🔍 What to Check in Console

### Successful OAuth Flow:
```
✅ Successfully obtained tokens: {
  access_token: 'ya29.a0AfB_byC...',
  refresh_token: 'Present',
  expiry_date: 1234567890000
}
```

### Calendar Connection Status:
1. Open DevTools > Application > Storage
2. Check **localStorage**: Should have `google-calendar-connected: true`
3. Check **sessionStorage**: Should have `google-calendar-prompt-dismissed: true` (after dismissing)
4. Check **Cookies**: Should have `google_access_token` and `google_refresh_token` (after connecting)

---

## 🎨 Modal Preview

The modal includes:
- 🎨 Modern, centered design
- 📅 Calendar icon in a circular badge
- ✨ Clear benefits list
- 🎯 Two action buttons (Connect / Skip)
- ❌ Close button (X) in top-right
- 💡 Help text at bottom

---

## 📝 Notes for Production

### Security Improvements Needed:
1. **Token Storage**: Currently using cookies (temporary)
   - **TODO**: Store tokens in database encrypted
   - **TODO**: Associate tokens with user accounts
   - **TODO**: Implement token refresh logic

2. **User Session**:
   - **TODO**: Get current user from NextAuth session
   - **TODO**: Store calendar connection status in user profile

3. **Error Handling**:
   - **TODO**: Add retry logic for failed token refreshes
   - **TODO**: Handle token expiration gracefully

### Environment Variables Required:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000
```

---

## 🐛 Troubleshooting

### Modal Doesn't Appear
- Check browser console for errors
- Verify `isCheckingEntities` is false
- Clear localStorage and sessionStorage
- Try incognito mode

### OAuth Fails
- Verify Google OAuth credentials in `.env.local`
- Check redirect URI matches in Google Cloud Console
- Look for errors in server logs

### Infinite Errors Return
- Check if `useEffect` dependencies were modified
- Verify `fetchShows` and `fetchTours` are not in dependency array
- Look for any new effects that might cause loops

---

## ✅ Success Criteria

- [ ] Modal appears on first visit to `/shows`
- [ ] Modal can be dismissed and won't show again in same session
- [ ] "Connect Calendar" button initiates OAuth flow
- [ ] Successfully connects to Google Calendar
- [ ] Success toast shows after connection
- [ ] No more infinite error toasts
- [ ] Page is functional even when backend is down
- [ ] All error states handled gracefully

---

**Ready to test! 🚀**
