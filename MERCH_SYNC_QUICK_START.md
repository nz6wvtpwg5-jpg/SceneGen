# 🚀 Merch Sync Modal - Quick Start Guide

## ✅ Status: READY TO TEST

Both frontend and backend are running and ready to test the new sync modal feature!

---

## 🎯 How to Test Right Now

### Step 1: Navigate to Merch Page
1. Open browser to `http://localhost:3000`
2. Log in if needed
3. Select an artist/entity profile from sidebar
4. Click "Merch Sales" in navigation

### Step 2: Open Sync Modal
1. Look for "Sync Square" button (top right)
2. Click it
3. Modal will open and fetch order counts (shows loading spinner)

### Step 3: Review Options
You should see:
- **Last sync date** (or "Never" if first time)
- **Orders in database** count
- **Two sync options**:
  1. "Sync New Orders Only" - Shows how many new orders (cyan/blue)
  2. "Full Re-Import" - Shows total orders in Square (purple)

### Step 4: Select Sync Mode
- **For testing incremental sync**: Click "Sync X New Orders"
- **For testing full sync**: Click "Re-Import All X Orders"
- **To cancel**: Click "Cancel" or close modal

### Step 5: Watch Progress
- Modal closes automatically
- Progress bar appears showing:
  - Current percentage
  - Orders processed (X of Y)
  - Estimated time remaining
  - Status message

### Step 6: See Results
- Success toast appears with sync details
- Data table refreshes with new orders
- Stats cards update

---

## 🧪 Testing Scenarios

### Scenario 1: Incremental Sync (Most Common)
```
1. Click "Sync Square"
2. See modal with e.g., "25 new orders"
3. Click "Sync 25 New Orders"
4. Watch quick progress (~5-10 seconds)
5. See success toast
```

### Scenario 2: Full Re-Import
```
1. Click "Sync Square"
2. See modal with e.g., "1,250 total orders"
3. Click "Re-Import All 1,250 Orders"
4. Watch longer progress (~1-2 minutes)
5. See success toast with duplicate count
```

### Scenario 3: Cancel Sync
```
1. Click "Sync Square"
2. See modal
3. Click "Cancel" or X button
4. Modal closes, no sync starts
```

### Scenario 4: First Time Sync
```
1. Click "Sync Square" (never synced before)
2. See "Last Sync: Never"
3. See high new order count (all orders)
4. Both options process same amount
5. Click preferred option
6. Watch progress
```

---

## 🔍 What to Check

### Backend Logs
Watch terminal running backend for:
```
🔄 Starting Square sync for entity: X, mode: incremental
📡 Fetching orders since 2024-01-15T10:30:00.000Z...
✅ Fetched 25 orders from Square
📊 Progress: 100/25 (100%)
```

### Frontend Console
Check browser console for:
```
🔄 Starting Square sync (incremental mode)...
✅ Sync complete: { ... }
```

### Network Tab
Monitor these API calls:
1. `GET /api/merch/sync/counts?entityId=X` - Gets order counts
2. `POST /api/merch/sync` - Starts sync with mode
3. `GET /api/merch/sync/progress` - Polls for progress (every 500ms)
4. `GET /api/merch/sales?entityId=X` - Refreshes data after sync

### UI Elements
Verify:
- ✅ Modal opens smoothly
- ✅ Loading spinner shows while fetching counts
- ✅ Order counts display correctly
- ✅ Buttons are clickable and responsive
- ✅ Modal closes when option selected
- ✅ Progress bar animates smoothly
- ✅ Percentage updates in real-time
- ✅ Success toast appears with details
- ✅ Data table refreshes with new orders

---

## 🐛 Common Issues & Fixes

### Modal Shows Loading Forever
**Cause**: Backend not responding or Square API issue  
**Fix**: Check backend terminal for errors, verify Square credentials

### Order Counts Show 0
**Cause**: No orders in Square or API connection issue  
**Fix**: Verify Square account has orders, check API credentials

### Progress Bar Doesn't Update
**Cause**: Backend not updating progress or frontend not polling  
**Fix**: Check backend logs, ensure `/api/merch/sync/progress` endpoint works

### Modal Doesn't Open
**Cause**: JavaScript error or missing dialog component  
**Fix**: Check browser console for errors, verify Dialog component imported

---

## 📊 Expected Results

### For a Typical Sync (Incremental)
```
Before:
- Last Sync: 2 hours ago
- DB Orders: 1,200
- New Orders: 15

During:
- Progress: 0% → 100% in ~5 seconds
- Messages: "Processing order X of 15..."

After:
- Success: "Synced 15 new transactions (12 auto-matched)"
- DB Orders: 1,215
- Last Sync: Just now
```

### For a Full Re-Import
```
Before:
- Last Sync: Any time
- DB Orders: 1,200
- Total Orders: 1,250

During:
- Progress: 0% → 100% in ~2 minutes
- Messages: "Processing order X of 1,250..."

After:
- Success: "Synced 1,250 transactions (1,200 already in DB)"
- DB Orders: 1,250
- Last Sync: Just now
```

---

## 🎨 UI Verification Checklist

- [ ] "Sync Square" button visible and enabled
- [ ] Modal opens on button click
- [ ] Loading spinner shows while fetching counts
- [ ] Last sync date displays correctly
- [ ] DB order count matches database
- [ ] New orders count is accurate
- [ ] Total orders count is accurate
- [ ] "Recommended" badge on incremental option
- [ ] "Slow" badge on full re-import option
- [ ] Both sync buttons are clickable
- [ ] Cancel button works
- [ ] Modal closes when option selected
- [ ] Progress bar appears after selection
- [ ] Progress percentage updates
- [ ] Order count updates during sync
- [ ] Time estimate updates
- [ ] Success toast appears with details
- [ ] Data refreshes after sync

---

## 🚀 Performance Benchmarks

### Expected Sync Times

| Order Count | Incremental | Full Re-Import |
|-------------|-------------|----------------|
| 10-50       | 2-5 sec     | 10-30 sec      |
| 50-100      | 5-10 sec    | 30-60 sec      |
| 100-500     | 10-30 sec   | 1-3 min        |
| 500-1000    | 30-60 sec   | 3-5 min        |
| 1000+       | 1-2 min     | 5-10 min       |

*Times vary based on Square API response time and server performance*

---

## 💡 Pro Tips

1. **Use Incremental by Default**: It's fast and efficient for regular syncs
2. **Full Re-Import Sparingly**: Only when you suspect data issues
3. **Watch Backend Logs**: Great for understanding what's happening
4. **Check Progress Polling**: Should see requests every 500ms during sync
5. **Verify Auto-Match**: Success message shows how many matched to shows

---

## 🎯 Success Indicators

You'll know it's working when:
1. ✅ Modal opens instantly on button click
2. ✅ Order counts load within 1-2 seconds
3. ✅ Counts match your Square dashboard
4. ✅ Incremental sync completes quickly
5. ✅ Progress bar updates smoothly
6. ✅ Success toast shows accurate details
7. ✅ Data table updates with new orders
8. ✅ No console errors

---

## 📞 Need Help?

### Check These First
1. Backend running on port 3001? ✓
2. Frontend running on port 3000? ✓
3. Square API credentials configured? (Check backend/.env)
4. Database connection working? (Check backend logs)
5. Browser console clean of errors?

### Debug Commands
```bash
# Check backend
curl http://localhost:3001/api/merch/sync/progress

# Check if entity has orders
# Replace {entityId} with actual ID
curl http://localhost:3001/api/merch/sales?entityId={entityId}

# Get sync counts
curl "http://localhost:3001/api/merch/sync/counts?entityId={entityId}"
```

---

## 🎉 Ready to Go!

Everything is set up and ready to test. The feature is production-ready and waiting for you to try it out!

**Happy syncing! 🚀**
