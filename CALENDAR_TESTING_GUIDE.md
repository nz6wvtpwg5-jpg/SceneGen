# 🧪 Google Calendar Integration - Testing Guide

**Last Updated:** January 28, 2026
**Status:** Ready for Testing (After Setup)

---

## Prerequisites

Before testing, ensure:
- ✅ Google OAuth credentials added to `.env.local`
- ✅ Dev server restarted after adding credentials
- ✅ You have a Google account to test with
- ✅ Browser allows popups (for OAuth flow)

---

## Test Plan Overview

| Test # | Feature | Priority | Time |
|--------|---------|----------|------|
| 1 | First-time OAuth Connection | 🔴 Critical | 5 min |
| 2 | Sync Show to Calendar | 🔴 Critical | 3 min |
| 3 | Remove Show from Calendar | 🔴 Critical | 3 min |
| 4 | Connection Status Check | 🟡 Medium | 2 min |
| 5 | Multiple Shows Sync | 🟡 Medium | 5 min |
| 6 | Error Handling | 🟡 Medium | 5 min |
| 7 | Session Persistence | 🟢 Low | 3 min |

**Total estimated time:** 25-30 minutes

---

## Test 1: First-Time OAuth Connection

### Objective
Verify that users can connect their Google account and grant calendar permissions.

### Steps
1. Open browser (preferably incognito for clean test)
2. Navigate to `http://localhost:3000`
3. Sign in with Azure B2C account
4. Go to `/shows` page
5. Locate any show in the table
6. Click the **calendar icon** (should be outline/not filled)
7. Observe OAuth redirect to Google

### Expected Behavior
- ✅ Redirects to Google consent screen
- ✅ Shows SceneGen app name and requested permissions
- ✅ Lists "View and manage your calendars" permission
- ✅ After clicking "Allow", redirects back to shows page
- ✅ Shows success toast notification
- ✅ Calendar icon changes to filled/colored state

### Actual Result
```
Date Tested: _____________________
Tester: _________________________

[ ] Pass - All steps succeeded
[ ] Fail - Issue: _______________
```

### Common Issues
- **Redirect URI mismatch:** Check Google Console OAuth settings
- **Missing permissions:** Verify OAuth scope includes calendar.events
- **Popup blocked:** Allow popups for localhost:3000

---

## Test 2: Sync Show to Calendar

### Objective
Verify that show data is correctly synced to Google Calendar.

### Test Data
Use a test show with these details:
- Show Name: "Test Concert at The Venue"
- Date: Tomorrow's date
- Time: 8:00 PM
- Location: "123 Main St, Sydney, NSW"

### Steps
1. Ensure you're connected (Test 1 passed)
2. Click calendar icon on the test show
3. Wait for confirmation toast
4. Open Google Calendar in new tab (calendar.google.com)
5. Navigate to tomorrow's date
6. Locate the synced event

### Expected Behavior
- ✅ Toast shows "Show synced to Google Calendar"
- ✅ Calendar icon changes to filled state
- ✅ Event appears in Google Calendar within 1-2 minutes
- ✅ Event title matches show name
- ✅ Event time is correct
- ✅ Event location is included
- ✅ Event description includes show details

### Actual Result
```
Date Tested: _____________________

Calendar Event Details:
Title: ___________________________
Date: ____________________________
Time: ____________________________
Location: ________________________
Description present: [ ] Yes [ ] No

[ ] Pass [ ] Fail
Issue (if any): __________________
```

### Verification Checklist
- [ ] Event title is correct
- [ ] Date and time match show
- [ ] Location is populated
- [ ] Can click through to see full details
- [ ] Event is on primary calendar

---

## Test 3: Remove Show from Calendar

### Objective
Verify that users can remove synced events from their calendar.

### Prerequisites
- Test 2 completed successfully
- At least one show is synced to calendar

### Steps
1. On Shows page, find a show with filled calendar icon
2. Click the calendar icon again
3. Observe confirmation dialog (if implemented)
4. Confirm deletion
5. Wait for toast notification
6. Check Google Calendar

### Expected Behavior
- ✅ Calendar icon changes back to outline state
- ✅ Toast shows "Removed from Google Calendar"
- ✅ Event removed from Google Calendar
- ✅ No errors in console

### Actual Result
```
Date Tested: _____________________

[ ] Icon changed to outline
[ ] Success toast appeared
[ ] Event removed from Google Calendar
[ ] No console errors

[ ] Pass [ ] Fail
Issue (if any): __________________
```

---

## Test 4: Connection Status Check

### Objective
Verify the connection status API works correctly.

### Steps
1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to `/shows` page
4. Filter network requests for "calendar"
5. Find `GET /api/calendar/status` request
6. Inspect response

### Expected Response (Connected)
```json
{
  "connected": true,
  "email": "your-test-email@gmail.com"
}
```

### Expected Response (Not Connected)
```json
{
  "connected": false
}
```

### Actual Result
```
Date Tested: _____________________

Response received: [ ] Yes [ ] No
Status code: _____________________
Response body:
_________________________________
_________________________________

[ ] Pass [ ] Fail
```

---

## Test 5: Multiple Shows Sync

### Objective
Verify that multiple shows can be synced without issues.

### Steps
1. Sync 3-5 different shows to calendar
2. Verify each sync completes successfully
3. Check Google Calendar has all events
4. Verify no duplicate events created

### Expected Behavior
- ✅ Each sync completes independently
- ✅ No rate limiting issues
- ✅ All events appear in calendar
- ✅ No duplicates
- ✅ Events don't overlap incorrectly

### Actual Result
```
Date Tested: _____________________
Number of shows synced: __________

All events in calendar: [ ] Yes [ ] No
Duplicates found: [ ] Yes [ ] No
Any errors: [ ] Yes [ ] No

[ ] Pass [ ] Fail
Notes: ___________________________
```

---

## Test 6: Error Handling

### Objective
Verify graceful error handling when things go wrong.

### Test Cases

#### 6.1: No Internet Connection
**Steps:**
1. Disconnect internet
2. Try to sync a show
3. Observe error message

**Expected:** ❌ "Failed to sync show. Please check your connection."

#### 6.2: Invalid Session
**Steps:**
1. Manually clear session storage
2. Try to sync a show
3. Observe redirect to login

**Expected:** ↪️ Redirects to sign-in page

#### 6.3: Google API Error (Simulated)
**Steps:**
1. Temporarily change Google credentials to invalid values
2. Restart server
3. Try to sync a show

**Expected:** ❌ "Failed to connect to Google Calendar"

### Actual Results
```
Date Tested: _____________________

6.1 No Internet: [ ] Pass [ ] Fail
Error message shown: _____________

6.2 Invalid Session: [ ] Pass [ ] Fail
Redirect behavior: _______________

6.3 API Error: [ ] Pass [ ] Fail
Error message: ___________________
```

---

## Test 7: Session Persistence

### Objective
Verify that Google Calendar connection persists across browser sessions.

### Steps
1. Complete Test 1 (connect Google Calendar)
2. Sync at least one show
3. Close browser completely
4. Reopen browser
5. Navigate back to `/shows`
6. Try syncing another show (should work without re-auth)

### Expected Behavior
- ✅ No OAuth prompt on second sync
- ✅ Sync works immediately
- ✅ Previous synced shows still marked as synced

### Actual Result
```
Date Tested: _____________________

Re-authentication required: [ ] Yes [ ] No
Sync worked without OAuth: [ ] Yes [ ] No
Previous sync state preserved: [ ] Yes [ ] No

[ ] Pass [ ] Fail
```

---

## Automated Testing Recommendations

For CI/CD pipeline, consider:

```typescript
// Mock Google Calendar API responses
describe('Google Calendar Integration', () => {
  it('should sync show to calendar', async () => {
    // Mock API call
    // Verify event creation
  });

  it('should handle OAuth errors gracefully', async () => {
    // Mock OAuth failure
    // Verify error handling
  });
});
```

---

## Browser Compatibility Testing

Test on these browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Performance Testing

### Metrics to Track

| Metric | Target | Actual |
|--------|--------|--------|
| OAuth redirect time | < 2s | ___ |
| Sync API response | < 1s | ___ |
| Status check API | < 500ms | ___ |
| Calendar icon update | Immediate | ___ |

---

## Known Limitations

These are expected behaviors, not bugs:

1. **Sync delay:** Events may take 1-2 minutes to appear in Google Calendar
2. **One-way sync:** Changes in Google Calendar don't reflect in SceneGen
3. **Primary calendar only:** Events always go to user's primary calendar
4. **No batch sync:** Each show syncs individually
5. **Manual removal:** No auto-delete when show is deleted from SceneGen

---

## Bug Report Template

If you find issues, report them using this format:

```markdown
### Bug Report

**Title:** [Brief description]

**Severity:** 🔴 Critical / 🟡 Medium / 🟢 Low

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Behavior:**
...

**Actual Behavior:**
...

**Screenshots:**
[Attach any relevant screenshots]

**Console Errors:**
```
[Paste any console errors]
```

**Environment:**
- Browser: ...
- OS: ...
- Date: ...
```

---

## Test Results Summary

```
Tester Name: _____________________
Date: ____________________________
Environment: Development / Staging / Production

Overall Results:
Test 1 (OAuth):          [ ] Pass [ ] Fail
Test 2 (Sync):           [ ] Pass [ ] Fail
Test 3 (Remove):         [ ] Pass [ ] Fail
Test 4 (Status):         [ ] Pass [ ] Fail
Test 5 (Multiple):       [ ] Pass [ ] Fail
Test 6 (Errors):         [ ] Pass [ ] Fail
Test 7 (Persistence):    [ ] Pass [ ] Fail

Total: ___/7 passed

Ready for Production: [ ] Yes [ ] No

Notes:
_________________________________
_________________________________
_________________________________
```

---

## Next Steps After Testing

1. **If all tests pass:** ✅ Ready for production setup
2. **If tests fail:** ❌ Review error logs and fix issues
3. **For production:** Update OAuth redirect URIs and environment variables
4. **Documentation:** Update user guides with any findings

---

✅ **Testing Complete!** Document all results and share with the team.
