# Google Calendar Connect Button Fix

## 🐛 Issue
After successfully connecting Google Calendar via OAuth, the "Connect Google Calendar" button was still showing on the Shows page, even though the calendar was connected.

## ✅ Solution
Made the "Connect Google Calendar" button conditionally render only when the calendar is NOT connected.

## 🔧 Changes Made

### 1. **Conditional Button Rendering**
**File**: `/src/app/shows/page.tsx` (lines ~563-586)

**Before:**
```tsx
<button
  onClick={() => (window.location.href = "/api/calendar/connect")}
  className="..."
>
  <span>Connect Google Calendar</span>
</button>
```

**After:**
```tsx
{!isCalendarConnected && (
  <button
    onClick={() => (window.location.href = "/api/calendar/auth")}
    className="..."
  >
    <span>Connect Google Calendar</span>
  </button>
)}
```

### 2. **Enhanced OAuth Callback Handler**
**File**: `/src/app/shows/page.tsx` (lines ~97-121)

Added automatic calendar event fetching after successful connection:

```tsx
if (calendarConnected === "true") {
  localStorage.setItem("google-calendar-connected", "true");
  setIsCalendarConnected(true);
  toast.success("Google Calendar connected successfully! 🎉");
  window.history.replaceState({}, "", "/shows");
  // Force fetch calendar events after connection
  setTimeout(() => {
    fetchCalendarEvents();
  }, 500);
}
```

## 🎯 Behavior Now

### When Calendar is NOT Connected:
- ✅ "Connect Google Calendar" button is visible
- ✅ Clicking it redirects to OAuth flow
- ✅ Calendar view toggle is disabled with tooltip

### When Calendar IS Connected:
- ✅ "Connect Google Calendar" button is hidden
- ✅ Only "Add show" button is visible
- ✅ Calendar view toggle is enabled
- ✅ Calendar events are automatically fetched and displayed

### After Successful OAuth Connection:
1. User completes Google OAuth flow
2. Redirected back to `/shows?calendar_connected=true`
3. Toast notification shows success message
4. `isCalendarConnected` state is set to `true`
5. Button automatically hides
6. Calendar events are fetched after 500ms
7. URL is cleaned to `/shows`

## 🧪 Testing

### Test 1: Fresh Connection
1. Start with no calendar connection
2. See "Connect Google Calendar" button
3. Click button → OAuth flow
4. Return to Shows page
5. **Expected**: Button is gone, calendar events load

### Test 2: Already Connected
1. Have previously connected calendar (cookies present)
2. Navigate to Shows page
3. **Expected**: No "Connect Google Calendar" button, calendar loads

### Test 3: Expired Token
1. Have connected calendar but token expired
2. Navigate to Shows page
3. **Expected**: Expired modal appears, no connect button

### Test 4: After Reconnection
1. See expired modal
2. Click "Reconnect Calendar"
3. Complete OAuth flow
4. **Expected**: Button hidden, calendar events load

## 🔍 Technical Details

### State Management
```typescript
const [isCalendarConnected, setIsCalendarConnected] = useState(false);
```

This state controls:
- Whether "Connect Google Calendar" button shows
- Whether calendar view toggle is enabled
- Whether calendar events are fetched

### Connection Detection
The `isCalendarConnected` state is set to `true` when:
1. OAuth callback includes `?calendar_connected=true`
2. `/api/calendar/status` returns `{ connected: true }`
3. localStorage has `google-calendar-connected` flag

### Button Visibility Logic
```tsx
{!isCalendarConnected && (
  <button>Connect Google Calendar</button>
)}
```

Simple conditional rendering ensures button only shows when needed.

## 📋 Files Modified

1. `/src/app/shows/page.tsx`
   - Made "Connect Google Calendar" button conditional
   - Enhanced OAuth callback to trigger event fetch
   - Fixed endpoint from `/api/calendar/connect` to `/api/calendar/auth`

## ✨ User Experience Improvements

- **Cleaner UI**: No duplicate/unnecessary buttons after connection
- **Automatic Updates**: Calendar events fetch immediately after connection
- **Clear State**: User can visually confirm connection status
- **Better Flow**: Seamless transition from connection to usage

## 🚀 Status

**FIXED** ✅

The "Connect Google Calendar" button now properly hides after successful OAuth connection, and the calendar events load automatically.
