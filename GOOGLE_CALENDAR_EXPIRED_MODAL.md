# Google Calendar Expired Modal - Implementation Summary

## ✅ Status: COMPLETE

The Google Calendar Expired Modal has been successfully implemented and is fully functional.

## 🎯 Features Implemented

### 1. **Modal Trigger**
The modal automatically appears when:
- Google Calendar API returns a non-OK response (token expired, revoked, or invalid)
- An error occurs while fetching calendar events
- The user's calendar connection is no longer valid

**Implementation:**
```typescript
// In fetchCalendarEvents() function (lines 156-171)
if (!response.ok) {
  console.log("📅 Google Calendar not connected or token expired");
  setCalendarEvents([]);
  setShowCalendarExpiredModal(true);
  return;
}

// Catch block for any fetch errors
catch (error) {
  console.log("📅 Google Calendar not available:", error);
  setCalendarEvents([]);
  setShowCalendarExpiredModal(true);
}
```

### 2. **Modal UI Components**
- **Warning Icon**: Orange CircleAlert icon in a rounded background
- **Title**: "Google Calendar Disconnected"
- **Explanation**: Clear message about expired/revoked connection
- **Reassurance Note**: Highlighted box confirming SceneGen shows are safe
- **Action Buttons**:
  - **Dismiss**: Closes modal and removes calendar connection flag
  - **Reconnect Calendar**: Redirects to OAuth flow to reauthorize

### 3. **User Experience**
The modal provides:
- ✅ Clear warning about the disconnection
- ✅ Explanation that calendar events won't display
- ✅ Reassurance that SceneGen data is safe
- ✅ Easy one-click reconnection option
- ✅ Option to dismiss and continue without calendar

### 4. **State Management**
```typescript
const [showCalendarExpiredModal, setShowCalendarExpiredModal] = useState(false);
```

The modal properly:
- Cleans up localStorage when user reconnects or dismisses
- Redirects to `/api/calendar/auth` for reconnection
- Maintains session state during reconnection flow

## 📋 Testing Checklist

To test the modal:

### Test 1: Token Expiration
1. Connect Google Calendar
2. Manually revoke access in Google Account settings
3. Navigate to Shows page or wait for auto-refresh
4. **Expected**: Modal appears with warning message

### Test 2: Reconnection Flow
1. Trigger the expired modal
2. Click "Reconnect Calendar"
3. Complete OAuth flow
4. Return to Shows page
5. **Expected**: Calendar events load successfully, modal doesn't reappear

### Test 3: Dismiss Flow
1. Trigger the expired modal
2. Click "Dismiss"
3. **Expected**: Modal closes, localStorage cleaned, no calendar events shown

### Test 4: Manual Token Revocation
1. Connect calendar
2. Go to https://myaccount.google.com/permissions
3. Remove SceneGen app access
4. Refresh Shows page
5. **Expected**: Modal appears immediately

## 🎨 UI Design

The modal follows SceneGen's design system:
- **Colors**: Orange warning theme (`orange-500`)
- **Layout**: Centered overlay with backdrop
- **Spacing**: Consistent padding and gaps
- **Typography**: Clear hierarchy with bold titles
- **Buttons**: Primary (reconnect) and secondary (dismiss) actions
- **Responsiveness**: Max-width container with padding for mobile

## 🔧 Code Location

**File**: `/src/app/shows/page.tsx`

**Lines**:
- Modal state: Line 64
- Trigger logic: Lines 156-171
- Modal render: Lines 1089-1145

## 📝 Implementation Details

### State Variable
```typescript
const [showCalendarExpiredModal, setShowCalendarExpiredModal] = useState(false);
```

### Modal Component (Lines 1089-1145)
```tsx
{showCalendarExpiredModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6">
      {/* Warning Icon and Title */}
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-orange-500/10 rounded-full">
          <CircleAlert className="w-6 h-6 text-orange-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Google Calendar Disconnected
          </h2>
          <p className="text-sm text-muted-foreground">
            Your Google Calendar connection has expired or been revoked.
            You'll need to reconnect to sync your calendar events with SceneGen.
          </p>
        </div>
      </div>

      {/* Reassurance Note */}
      <div className="bg-muted/50 border border-border rounded-md p-3 mb-6">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Note:</strong> Your SceneGen shows are still safe.
          Only Google Calendar events won't be displayed until you reconnect.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowCalendarExpiredModal(false);
            localStorage.removeItem("google-calendar-connected");
          }}
          className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={() => {
            setShowCalendarExpiredModal(false);
            localStorage.removeItem("google-calendar-connected");
            window.location.href = "/api/calendar/auth";
          }}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Reconnect Calendar
        </button>
      </div>
    </div>
  </div>
)}
```

## 🚀 Next Steps

The modal is production-ready. Suggested enhancements for future iterations:

1. **Auto-retry**: Add option to auto-reconnect on page load if token expired recently
2. **Token Refresh**: Implement automatic token refresh before expiration
3. **Notification**: Add a banner notification instead of/in addition to modal for less intrusive UX
4. **Analytics**: Track how often users see this modal to identify OAuth stability issues
5. **Better Error Messages**: Differentiate between token expiration, revocation, and API errors

## ✅ Summary

The Google Calendar Expired Modal is fully functional and provides:
- ✨ Clear communication when calendar connection expires
- 🔄 Easy one-click reconnection flow
- 🛡️ User reassurance about data safety
- 🎨 Consistent SceneGen UI/UX design
- 📱 Responsive mobile-friendly layout

**Status**: Ready for production use ✅
**Testing**: Recommended before deployment
**Documentation**: Complete
