# Tour Details Modal Fix - String to Number Bug

## Problem Discovered
After clicking "View Tour Details" button post-import, the TourDetailsModal displayed:
- Shows: 0 ❌
- Revenue: $0.00 ❌
- Expenses: $0.00 ❌
- Profit: $0.00 ❌

**Console Log Revealed:**
```javascript
💰 TourDetailsModal: Calculating totals {
  budgetsCount: 3,
  totalRevenue: '05903.255069.005987.63',  // ❌ String concatenation!
  totalExpenses: '09015.335378.9017465.76', // ❌ String concatenation!
  profit: NaN,  // ❌ Can't subtract strings
  ...
}
```

## Root Cause
PostgreSQL returns **NUMERIC/DECIMAL** columns as **strings**, not numbers. The backend was passing these string values directly to the frontend without conversion.

When the frontend tried to sum them:
```javascript
const totalRevenue = budgets.reduce((sum, b) => sum + (b.totalSales || 0), 0);
// 0 + "5903.25" + "5069.00" + "5987.63" = "05903.255069.005987.63" ❌
```

JavaScript's `+` operator concatenates strings instead of adding numbers!

## Solution Applied

### Backend Fix (`backend/server.js`)
Updated the `/api/budgets` GET endpoint to **parse all numeric fields** from strings to numbers:

```javascript
// Before (strings from PostgreSQL)
totalSales: row.total_sales,        // "5903.25" ❌
totalExpenses: row.total_expenses,  // "9015.33" ❌
distance: row.distance,             // "145.5" ❌

// After (converted to numbers)
totalSales: parseFloat(row.total_sales) || 0,        // 5903.25 ✅
totalExpenses: parseFloat(row.total_expenses) || 0,  // 9015.33 ✅
distance: parseFloat(row.distance) || 0,             // 145.5 ✅
```

### Fields Converted
All numeric budget fields now use `parseFloat()` or `parseInt()`:

**Revenue Fields:**
- `ticketSales`
- `merchCardSales`
- `merchCashSales`
- `merchSalesPerPerson`
- `totalSales` ⭐

**Expense Fields:**
- `agentCommission`
- `vanCosts`
- `driverFees`
- `vanRental`
- `gasCosts`
- `accommodationCosts`
- `flightCosts`
- `generalPayouts`
- `merchPersonFees`
- `merchCostOfGoods`
- `extraExpenses`
- `feesCash`
- `totalExpenses` ⭐

**Other Numeric Fields:**
- `distance` ⭐
- `cashFlow`
- `agentCommissionPercent`
- `feeBalance`
- `feeSurplus`
- `merchDailySurplus`
- `avgCardOrderValue`
- `netProfit`
- `variation`
- `orderCount` (uses `parseInt()`)

## Expected Results After Fix

### Console Logs (Correct):
```javascript
✅ TourDetailsModal: Budgets loaded (3) [{…}, {…}, {…}]
💰 TourDetailsModal: Calculating totals {
  budgetsCount: 3,
  totalRevenue: 16959.88,     // ✅ Number!
  totalExpenses: 31859.99,    // ✅ Number!
  profit: -14900.11,          // ✅ Calculated correctly
  totalMiles: 145.5,
  budgets: [
    {id: "...", totalSales: 5903.25, totalExpenses: 9015.33},
    {id: "...", totalSales: 5069.00, totalExpenses: 5378.90},
    {id: "...", totalSales: 5987.63, totalExpenses: 17465.76}
  ]
}
```

### TourDetailsModal Display (Correct):
- Shows: **3** ✅
- Revenue: **$16,959.88** ✅
- Expenses: **$31,859.99** ✅
- Profit: **-$14,900.11** ✅
- Miles: **145.5** ✅

## Testing Steps

1. **Restart Backend** (already done)
   ```bash
   pkill -f "node backend/server.js"
   node backend/server.js > backend.log 2>&1 &
   ```

2. **Clear Browser Cache** (Hard Refresh)
   - Press **Cmd+Shift+R** (macOS) or **Ctrl+Shift+R** (Windows)

3. **Import Shows Again**
   - Go to http://localhost:3000/import
   - Upload CSV with 3 shows
   - Complete import
   - Click "View Tour Details"

4. **Verify Console Logs**
   - Check for: `💰 TourDetailsModal: Calculating totals`
   - Verify `totalRevenue` and `totalExpenses` are **numbers**, not strings
   - Verify `profit` is a valid number, not `NaN`

5. **Verify Modal Display**
   - All stats should show correct values
   - Budget tab should show revenue/expense breakdown per show
   - Route tab should load map correctly

## Why This Bug Occurred

PostgreSQL uses the `NUMERIC` or `DECIMAL` data type for precise decimal numbers. The `pg` (node-postgres) library returns these as **strings** to avoid JavaScript floating-point precision issues.

**Example:**
```sql
-- Database column type
total_sales NUMERIC(10,2)

-- PostgreSQL returns
"5903.25"  -- String, not number

-- JavaScript needs
5903.25    -- Number for math operations
```

Without explicit parsing, JavaScript treats database values as strings, causing concatenation instead of addition.

## Related Files Modified
- ✅ `backend/server.js` - Added `parseFloat()` conversions to `/api/budgets` endpoint
- ✅ `src/components/tours/TourDetailsModal.tsx` - Fixed interface and field names (previous fix)
- ✅ `src/app/tours/[id]/page.tsx` - Added budget fetching and totals display (previous fix)

## Status: FIXED ✅

The TourDetailsModal should now display correct financial totals immediately after import. All numeric calculations will work properly.

---
**Last Updated**: 27 March 2026, 13:52
**Bug Type**: Data Type Conversion
**Severity**: High (blocking feature)
**Fix Applied**: Backend numeric parsing
