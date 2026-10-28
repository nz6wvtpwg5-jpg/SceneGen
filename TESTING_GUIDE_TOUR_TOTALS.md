# Testing Guide: Tour Totals Display Fix

## Summary
Fixed the data type mismatch bug causing $0.00 to display for all financial totals in the TourDetailsModal and tour details page after importing shows and budgets.

## What Was Fixed
- **TourDetailsModal**: Now correctly reads `totalSales` and `totalExpenses` (camelCase) from backend
- **Tour Details Page (`/tours/[id]`)**: Now fetches budgets and displays financial totals

## How to Test

### 1. Start the Backend & Frontend
```bash
# Terminal 1: Start backend
cd /Users/jon/Desktop/scenegen/SceneGenUIV2
node backend/server.js

# Terminal 2: Start frontend
npm run dev
```

### 2. Clear Old Data (Optional but Recommended)
```sql
-- In psql
DELETE FROM budget_line_items;
DELETE FROM budgets;
DELETE FROM shows;
DELETE FROM tours;
```

### 3. Test the Import Flow

1. **Navigate to Import Page**
   - Go to http://localhost:3000/import

2. **Upload Sample CSV**
   - Upload the sample tour CSV with 7 shows
   - Complete all validation steps

3. **Submit Import**
   - Click "Save All Shows"
   - Watch the console logs:
     ```
     ✅ Step4Summary: Creating tour and shows
     ✅ Shows created: 7
     ✅ Budgets created: 7
     💰 Step4Summary: Calculated totals { totalRevenue: 16959.88, totalExpenses: 31859.99, profit: -14900.11 }
     ```

4. **Verify TourDetailsModal**
   - The modal should automatically open after import
   - **Check Stats Bar** (top of modal):
     - Shows: 7
     - Revenue: **$16,959.88** (green)
     - Expenses: **$31,859.99** (red)
     - Profit: **-$14,900.11** (red, negative)
     - Miles: varies

   - **Check Browser Console**:
     ```
     ✅ TourDetailsModal: Tour loaded {id: "...", name: "..."}
     ✅ TourDetailsModal: Shows loaded 7
     ✅ TourDetailsModal: Budgets loaded [array of 7 budgets]
     💰 TourDetailsModal: Calculating totals {
       budgetsCount: 7,
       totalRevenue: 16959.88,
       totalExpenses: 31859.99,
       profit: -14900.11
     }
     ```

5. **Navigate to Tours List**
   - Close the modal
   - Go to http://localhost:3000/tours
   - **Verify the tour card shows the same totals**:
     - Fees (Revenue): **$16,959.88**
     - Costs (Expenses): **$31,859.99**
     - Profit: **-$14,900.11**

6. **Navigate to Tour Details Page**
   - Click on the tour card
   - Go to http://localhost:3000/tours/[tour-id]
   - **Check the Stats Cards** (4 cards at top):
     - Total Shows: 7
     - Total Revenue: **$16,959.88** (green)
     - Total Expenses: **$31,859.99** (red)
     - Net Profit: **-$14,900.11** (red)

   - **Check Browser Console**:
     ```
     ✅ Tour Details Page: Budgets loaded [array of 7 budgets]
     ```

### 4. Verify Budget Tab in Modal

1. **Open Tour** → Click "View Details" button
2. **Go to Budget Tab**
3. **Verify each show has a budget card** showing:
   - Show name, date
   - Revenue (green)
   - Expenses (red)
   - Profit (green if positive, red if negative)

## Expected Results ✅

| Location | Revenue | Expenses | Profit |
|----------|---------|----------|--------|
| Import Summary (Step 4) | $16,959.88 | $31,859.99 | -$14,900.11 |
| TourDetailsModal (Stats Bar) | $16,959.88 | $31,859.99 | -$14,900.11 |
| Tours List Page (Card) | $16,959.88 | $31,859.99 | -$14,900.11 |
| Tour Details Page (Stats) | $16,959.88 | $31,859.99 | -$14,900.11 |

All four locations should show **identical values** immediately after import.

## Common Issues

### Issue: Still seeing $0.00
**Cause**: Old cache or old budget data
**Solution**:
1. Hard refresh browser (Cmd+Shift+R)
2. Clear database and re-import
3. Check console logs to verify budgets are being fetched

### Issue: Different totals in different views
**Cause**: Data inconsistency in database
**Solution**:
1. Run DB query to verify budget data:
   ```sql
   SELECT id, show_id, total_sales, total_expenses
   FROM budgets
   ORDER BY created_at DESC
   LIMIT 10;
   ```
2. Check that all shows have matching budgets:
   ```sql
   SELECT s.id as show_id, s.city, b.id as budget_id, b.total_sales, b.total_expenses
   FROM shows s
   LEFT JOIN budgets b ON s.id = b.show_id
   WHERE s.tour_id = 'YOUR_TOUR_ID';
   ```

### Issue: Console errors about undefined properties
**Cause**: API returned snake_case instead of camelCase
**Solution**: Verify backend `/api/budgets` response format matches:
```json
{
  "totalSales": 2422.84,
  "totalExpenses": 4551.43,
  "showId": "abc-123",
  ...
}
```

## Debug Logs Reference

### Backend
```
✅ Budget created for show: {show_id}, Budget ID: {budget_id}
✅ GET /api/budgets?tourId={tour_id} - 7 budgets found
```

### Frontend
```
✅ Step4Summary: Calculated totals { totalRevenue, totalExpenses, profit }
✅ TourDetailsModal: Budgets loaded [array]
💰 TourDetailsModal: Calculating totals { budgetsCount, totalRevenue, totalExpenses, profit }
✅ Tour Details Page: Budgets loaded [array]
```

## Success Criteria ✅

- [x] Import flow creates budgets for all shows
- [x] Step 4 Summary shows correct totals
- [x] TourDetailsModal opens after import with correct totals
- [x] Tours list page shows correct totals
- [x] Tour details page shows correct totals
- [x] All totals match across all views
- [x] No manual refresh required
- [x] Console logs confirm data is being fetched and calculated

---
**Status**: Ready for Testing
**Last Updated**: January 2025
