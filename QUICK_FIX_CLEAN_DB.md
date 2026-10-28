# Quick Fix: Clean Database and Re-Import

## The Issue
The budgets currently in your database were created **before** the `parseFloat()` fix was applied. They still contain string values like `"5903.25"` instead of numbers.

## Solution: Clean Start

### Step 1: Clear Old Data
Run this in your PostgreSQL terminal:

```sql
-- Clear all budgets and shows for a fresh start
DELETE FROM budget_line_items;
DELETE FROM budgets;
DELETE FROM shows WHERE tour_id = 'aa8f7fdf-bccd-454f-ae62-a6b0f8cc5b0c';
DELETE FROM tours WHERE id = 'aa8f7fdf-bccd-454f-ae62-a6b0f8cc5b0c';
```

### Step 2: Re-Import
1. Go to http://localhost:3000/import
2. Upload your CSV file
3. Complete all steps
4. Click "View Tour Details"

### Step 3: Verify
The modal should now show:
- Revenue: **$16,959.88** (not NaN)
- Expenses: **$31,859.99** (not NaN)
- Profit: **-$14,900.11** (not NaN)

Check console for:
```javascript
💰 TourDetailsModal: Calculating totals {
  budgetsCount: 3,
  totalRevenue: 16959.88,    // ✅ Number (not string)
  totalExpenses: 31859.99,   // ✅ Number (not string)
  profit: -14900.11          // ✅ Valid number (not NaN)
}
```

## Why This Happened
1. Old code: Backend returned strings from PostgreSQL
2. New code: Backend now converts to numbers with `parseFloat()`
3. Old data: Still has string values in database
4. Solution: Re-import with new backend code

## Alternative: Update Database Directly
If you want to keep existing data, run this SQL to convert strings to numbers:

```sql
UPDATE budgets SET
  total_sales = CAST(total_sales AS NUMERIC),
  total_expenses = CAST(total_expenses AS NUMERIC),
  distance = CAST(distance AS NUMERIC)
WHERE tour_id = 'aa8f7fdf-bccd-454f-ae62-a6b0f8cc5b0c';
```

But the cleanest solution is to **delete and re-import**.

---
**Backend Status:** ✅ Running with parseFloat() fix
**Action Required:** Clear DB and re-import shows
