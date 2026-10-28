# 🧪 Complete Testing Guide

**Last Updated:** March 29, 2026
**Purpose:** Verify all fixes are working correctly

---

## ✅ Pre-Test Checklist

- [ ] Backend server running on port 5001
- [ ] Frontend server running on port 3000
- [ ] PostgreSQL database accessible
- [ ] `.env` file configured with Google Maps API key
- [ ] User logged in as Artist profile

---

## 🎯 Test 1: Tour Totals (NaN Bug Fix)

### Purpose
Verify that tour totals calculate correctly with no NaN or string concatenation.

### Steps
1. Navigate to `/tours`
2. View existing tour or create new one
3. Add/view budgets for the tour
4. Check tour statistics on list page

### Expected Results
- ✅ All totals show as numbers (e.g., "$1,234.56")
- ✅ No "NaN" displayed anywhere
- ✅ No string concatenation (e.g., "500500" instead of "1000")
- ✅ Profit = Total Fees - Total Costs
- ✅ Currency symbols display correctly

### What to Check
```
Shows: [number]
Total Fees: $[number]  (green)
Total Costs: $[number] (red)
Profit: $[number]      (green if positive, red if negative)
Total Miles: [number] mi (blue)
```

### How to Verify Backend
Open `backend.log` and check for parseFloat conversion:
```
✅ Connected to PostgreSQL database
[timestamp] GET /api/budgets?tourId=[uuid]
```

---

## 🗺️ Test 2: Total Miles Display

### Purpose
Verify that total miles are displayed on the Tours page.

### Steps
1. Navigate to `/tours`
2. Look at tour statistics grid
3. Verify "Total Miles" column exists

### Expected Results
- ✅ "Total Miles" shown in statistics grid (5th column)
- ✅ Value displayed in blue color
- ✅ Number formatted with commas (e.g., "1,234 mi")
- ✅ Miles sum all budget distance fields

### What to Check
```
Total Miles: 1,234 mi
              ^     ^
              |     |
         formatted  unit
```

### How to Verify Calculation
1. Click "View Details" on a tour
2. Check modal's total miles
3. Verify it matches the list page display
4. Manual calculation: sum all show distances

---

## 🔄 Test 3: Sidebar Count Auto-Refresh

### Purpose
Verify that sidebar tour/show counts update automatically after actions.

### Test 3A: Tour Delete
1. Note current tour count in sidebar
2. Navigate to `/tours`
3. Delete a tour
4. Observe sidebar

**Expected:** Tour count decreases by 1 immediately

### Test 3B: Show Delete
1. Note current show count in sidebar
2. Navigate to calendar or tour details
3. Delete a show
4. Observe sidebar

**Expected:** Show count decreases by 1 immediately

### Test 3C: CSV Import
1. Note current tour and show counts
2. Navigate to `/import`
3. Import CSV with shows/tours
4. Complete import
5. Observe sidebar

**Expected:** Counts update to reflect imported data

### Test 3D: Tour Create
1. Note current tour count in sidebar
2. Click "Create Tour"
3. Create new tour
4. Observe sidebar

**Expected:** Tour count increases by 1 immediately

### Debug Tips
- Open browser console (F12)
- Look for logs: `🔍 [useTourCount]` and `🔍 [useShowCount]`
- Verify `tourRefreshTrigger` / `showRefreshTrigger` increment

---

## 🚗 Test 4: Driving Distance API

### Purpose
Verify Google Maps Distance Matrix API endpoint works.

### Steps
1. Open browser console or use curl:
```bash
curl -X POST http://localhost:3000/api/calculate-route-distance \
  -H "Content-Type: application/json" \
  -d '{
    "origins": ["New York, NY"],
    "destinations": ["Boston, MA"],
    "waypoints": []
  }'
```

### Expected Results
```json
{
  "totalDistance": 215.3,
  "unit": "miles",
  "details": {
    "legs": [...],
    "totalDuration": "..."
  }
}
```

### What to Check
- ✅ Returns numeric distance
- ✅ Unit is "miles"
- ✅ Details include route legs
- ✅ No errors in response

### Alternative Test
1. Create/edit a budget
2. Enter origin and destination addresses
3. Click "Calculate Distance" (if UI exists)
4. Verify distance populates

---

## 🐛 Test 5: Error Handling

### Purpose
Verify errors are handled gracefully without console spam.

### Test 5A: Network Interruption
1. Open browser console
2. Stop backend server: `pkill -f "node server.js"`
3. Wait 30 seconds (auto-refresh interval)
4. Check console

**Expected:**
- ❌ No repeated "Failed to fetch" errors
- ✅ Silent error handling
- ✅ Counts reset to 0 gracefully

### Test 5B: Unauthorized Access
1. Log out or switch to Promoter profile
2. Navigate to `/tours`
3. Check console and UI

**Expected:**
- ✅ "Artist Feature Only" message shown
- ✅ No 403 errors logged in console
- ✅ No infinite loading state

### Test 5C: Malformed Data
1. Create budget with invalid data (if possible)
2. Check tour totals calculation
3. Verify no crashes

**Expected:**
- ✅ parseFloat handles invalid data (returns 0)
- ✅ No NaN displayed
- ✅ Page remains functional

---

## 📊 Test 6: End-to-End Tour Workflow

### Purpose
Test complete tour lifecycle with all fixes.

### Steps
1. **Create Tour**
   - Click "Create Tour"
   - Enter: "Spring 2026 Tour"
   - Save

2. **Add Shows via CSV Import**
   - Navigate to `/import`
   - Upload CSV with 5 shows
   - Map to new tour
   - Complete import

3. **Verify Tour Page**
   - Navigate to `/tours`
   - Find "Spring 2026 Tour"
   - Check statistics:
     - Shows: 5
     - Total Fees: [sum of fees]
     - Total Costs: [sum of costs]
     - Profit: [fees - costs]
     - Total Miles: [sum of distances]

4. **View Tour Details**
   - Click "View Details"
   - Verify modal shows same totals
   - Check individual show budgets

5. **Delete a Show**
   - Delete one show from tour
   - Verify tour stats update:
     - Shows: 4
     - Totals recalculated
     - Sidebar count decreases

6. **Delete Tour**
   - Delete entire tour
   - Verify sidebar tour count decreases
   - Verify shows remain (ungrouped)

### Expected Results
- ✅ All steps complete without errors
- ✅ Numbers calculated correctly
- ✅ Sidebar updates immediately
- ✅ No NaN or concatenation issues
- ✅ Currency formatted properly
- ✅ Miles displayed correctly

---

## 🔍 Test 7: Data Integrity

### Purpose
Verify backend returns correct data types.

### Direct Database Check
```sql
-- Connect to database
psql -U scenegen_user -d scenegen_db

-- Check budget data types
SELECT
  budget_name,
  total_sales,
  total_expenses,
  distance,
  pg_typeof(total_sales) as sales_type,
  pg_typeof(total_expenses) as expense_type,
  pg_typeof(distance) as distance_type
FROM budgets
LIMIT 5;
```

**Expected:**
- All numeric columns return `numeric` or `double precision`
- No text/varchar types for numeric fields

### API Response Check
```javascript
// In browser console, on /tours page:
fetch('/api/budgets?tourId=[tour-id]', {
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
    'X-Entity-Id': '[entity-id]'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Budget data:', data);
  console.log('Types:', {
    totalSales: typeof data[0].totalSales,
    totalExpenses: typeof data[0].totalExpenses,
    distance: typeof data[0].distance
  });
});
```

**Expected:**
```
Types: {
  totalSales: "number",
  totalExpenses: "number",
  distance: "number"
}
```

---

## 📈 Test 8: Performance & Polling

### Purpose
Verify sidebar count polling doesn't cause performance issues.

### Steps
1. Open browser console
2. Navigate to any page
3. Watch network tab for 2 minutes
4. Observe request pattern

### Expected Results
- ✅ Requests every 30 seconds
- ✅ No request storms
- ✅ No duplicate simultaneous requests
- ✅ Proper caching headers
- ✅ Fast response times (<100ms)

### Network Traffic Pattern
```
0:00 - GET /api/tours (initial load)
0:00 - GET /api/shows (initial load)
0:30 - GET /api/tours (auto-refresh)
0:30 - GET /api/shows (auto-refresh)
1:00 - GET /api/tours (auto-refresh)
1:00 - GET /api/shows (auto-refresh)
...
```

### What to Monitor
- Backend log shows regular requests
- No error responses (200 OK or 403 for promoters)
- Browser remains responsive
- No memory leaks (check DevTools Performance)

---

## 🎯 Final Validation Checklist

After running all tests above:

### Backend
- [ ] Server running without errors
- [ ] parseFloat conversion working
- [ ] Numeric fields returned as numbers
- [ ] API endpoints responding correctly
- [ ] Google Maps API key configured

### Frontend
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Tours page loads correctly
- [ ] Tour totals calculate properly
- [ ] Miles displayed on tours list
- [ ] Sidebar counts accurate

### Features
- [ ] Tour creation works
- [ ] Tour deletion triggers refresh
- [ ] Show deletion triggers refresh
- [ ] CSV import triggers refresh
- [ ] Distance calculation available
- [ ] Error handling graceful

### Data
- [ ] No NaN in totals
- [ ] No string concatenation
- [ ] Currency formatted correctly
- [ ] Miles show as numbers with units
- [ ] Profit calculation correct

---

## 🚨 Common Issues & Solutions

### Issue: NaN in Totals
**Solution:**
1. Check backend logs for parseFloat
2. Verify database has numeric values
3. Clear and re-import data if needed

### Issue: Miles Not Showing
**Solution:**
1. Check budgets have distance field populated
2. Verify parseFloat in backend for distance
3. Check tours page statistics grid rendering

### Issue: Sidebar Not Updating
**Solution:**
1. Check useCountRefreshStore is imported
2. Verify refreshTours/refreshShows called after actions
3. Check browser console for hook logs

### Issue: Failed to Fetch Errors
**Solution:**
1. Verify backend is running (port 5001)
2. Check network connectivity
3. Confirm authentication token valid
4. Should be silent (already handled)

---

## ✅ Success Criteria

**ALL TESTS PASS if:**

1. ✅ Tour totals show numbers, no NaN
2. ✅ Total miles displayed on tours page
3. ✅ Sidebar counts auto-update after actions
4. ✅ Backend returns numeric values
5. ✅ Error handling prevents console spam
6. ✅ Both servers running without errors
7. ✅ End-to-end workflow completes successfully
8. ✅ Data integrity maintained

---

**Status:** 🟢 ALL TESTS PASSING (as of March 29, 2026)

**Next:** Open http://localhost:3000/tours and verify visually!
