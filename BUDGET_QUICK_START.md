# Budget Feature - Quick Start Guide

## Overview
The Budget feature allows you to track revenue, expenses, and profitability for each show. Budgets are created in the Bookkeeping section and can be viewed from the Tour Details page.

## How to Access Budget Pages

### Option 1: From Tour Details
1. Navigate to **Tours** page (`/tours`)
2. Click **"View Details"** on any tour
3. In the shows list, click the **💰 Budget** button on any show
4. You'll see either:
   - The budget overview (if budget exists)
   - "No Budget Created" screen with "Create Budget" button

### Option 2: Direct URL
- Visit: `/shows/[showId]/budget`
- Example: `/shows/8b87c41e-ea9e-43c3-9ce4-bf104130aa11/budget`

## Features

### Budget Overview Page
When a budget exists, you'll see:

#### Summary Cards (Top Row)
- **Total Revenue** (green) - All income from the show
- **Total Expenses** (red) - All costs for the show
- **Net Profit/Loss** - Revenue minus expenses
- **Profit Margin** - Percentage of revenue that is profit

#### Revenue Breakdown
Shows all revenue sources:
- Ticket Sales
- Merch Sales (Cash)
- Merch Sales (Card)

#### Expense Breakdown
Shows all expense categories:
- Agent Commission (with percentage)
- Van Costs
- Accommodation
- Merch Cost of Goods
- General Payouts
- Extra Expenses

#### Band Member Payouts (if applicable)
- List of band members and their payouts
- Notes for each payout

#### Notes Section
- Any notes about the budget

### No Budget State
If a show doesn't have a budget:
- Clear message: "No Budget Created"
- **Create Budget** button
- Links to Bookkeeping page with show pre-selected

## Creating a Budget

### From Budget Page
1. Click **"Create Budget"** button
2. Redirected to Bookkeeping page (`/bookkeeping?createForShow={showId}`)
3. Form is pre-populated with show details
4. Fill in revenue and expense items
5. Click **"Create Budget"**
6. Navigate back to show budget page to view

### From Bookkeeping Page
1. Go to **Bookkeeping** page (`/bookkeeping`)
2. Click **"Create Budget"** button
3. Select the show from dropdown
4. Budget name and currency auto-populate
5. Enter revenue items:
   - Fee Paid (ticket sales)
   - Merch cash sales
   - Merch card sales
6. Enter expense items:
   - Agent commission (10% default, auto-calculated)
   - Additional expenses (can add multiple)
7. Add band member payouts (optional)
8. Add notes (optional)
9. Click **"Create Budget"**

## Editing a Budget

1. Navigate to budget page: `/shows/[showId]/budget`
2. Click **"Edit Budget"** button
3. Redirected to Bookkeeping page (`/bookkeeping?editBudget={budgetId}`)
4. Make changes
5. Click **"Save Changes"**
6. Navigate back to view updated budget

## Example Budgets

### HPS Belgium (Show ID: 8b87c41e-ea9e-43c3-9ce4-bf104130aa11)
- **Revenue**: €2,750.00
- **Expenses**: €2,075.00
- **Net Profit**: €675.00
- **Profit Margin**: 24.5%

### HPS Netherlands 2026 (Show ID: 0615a708-eded-4333-859f-27ea9c0154fa)
- **Revenue**: €2,750.00
- **Expenses**: €725.00
- **Net Profit**: €2,025.00
- **Profit Margin**: 73.6%

## Testing Your Budget

### Quick Test Checklist
- [ ] Navigate to a tour with shows
- [ ] Click "Budget" button on a show
- [ ] If budget exists, verify all data displays correctly
- [ ] If no budget, click "Create Budget"
- [ ] Fill in budget form in Bookkeeping
- [ ] Save and return to budget page
- [ ] Verify all entered data is displayed
- [ ] Click "Edit Budget" and make changes
- [ ] Verify changes are reflected

## UI Components

### Summary Card Format
```
┌─────────────────────────┐
│ 💹 Total Revenue        │
│ €2,750.00              │
└─────────────────────────┘
```

### Revenue/Expense Item Format
```
┌────────────────────────────────────┐
│ Ticket Sales         €1,500.00    │
│ Merch Cash Sales       €250.00    │
│ Merch Card Sales       €300.00    │
└────────────────────────────────────┘
```

## Responsive Design
- **Desktop**: 4-column grid for summary cards
- **Tablet**: 2-column grid
- **Mobile**: Single column, full width

## Navigation Flow

```
Tours Page → Tour Details → Show Budget
              ↓                ↓
          View Details    Budget Button
                              ↓
                        Budget Page
                              ↓
                    [Create/Edit] → Bookkeeping
```

## API Endpoints Used

### GET /api/budgets
- **Query Params**: `entityId`, `showId`, `tourId`, `search`
- **Returns**: Array of budgets with all fields
- **Transformation**: snake_case → camelCase

### POST /api/budgets
- **Body**: Budget data (revenue, expenses, etc.)
- **Returns**: Created budget object

### PATCH /api/budgets/:id
- **Body**: Updated budget fields
- **Returns**: Updated budget object

## Data Structure

### Budget Object
```typescript
{
  id: string;
  showId: string;
  budgetName: string;
  currency: string;
  totalSales: number;
  totalExpenses: number;
  ticketSales?: number;
  merchCashSales?: number;
  merchCardSales?: number;
  agentCommission?: number;
  vanCosts?: number;
  accommodationCosts?: number;
  // ... more fields
}
```

## Common Issues & Solutions

### Issue: "No Budget Created" shows even though I created one
**Solution**:
- Verify the budget's `show_id` matches the show's `id`
- Check browser console for errors
- Refresh the page
- Check database: `SELECT * FROM budgets WHERE show_id = 'your-show-id'`

### Issue: Budget amounts showing as $0.00
**Solution**:
- Ensure you entered revenue/expense amounts in Bookkeeping
- Check that fields are saved (not just draft)
- Verify database values are not NULL

### Issue: Currency showing as USD instead of EUR
**Solution**:
- Set currency in Bookkeeping when creating budget
- Currency is inherited from show if available
- Update budget to change currency

### Issue: Calculations seem wrong
**Solution**:
- Verify all amounts in database are numeric, not strings
- Check that `total_sales` and `total_expenses` are calculated correctly
- Agent commission should be 10% of revenue (unless specified otherwise)

## Database Verification

### Check budgets exist
```sql
SELECT COUNT(*) FROM budgets;
```

### View budget for specific show
```sql
SELECT b.*, s.venue_name, s.date
FROM budgets b
LEFT JOIN shows s ON b.show_id = s.id
WHERE b.show_id = 'your-show-id';
```

### Find shows without budgets
```sql
SELECT s.id, s.venue_name, s.date
FROM shows s
LEFT JOIN budgets b ON s.id = b.show_id
WHERE b.id IS NULL;
```

## Next Steps

1. **Test the feature**:
   - Create a budget for a new show
   - Edit an existing budget
   - Verify all calculations

2. **Create budgets for all shows**:
   - Go through each tour
   - Add budgets to track profitability

3. **Export and analyze**:
   - Use budget data for financial planning
   - Compare budgets across tours
   - Identify most profitable shows

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify database connection
3. Check backend logs
4. Refer to `BUDGET_PAGE_VERIFICATION.md` for detailed testing

## Files Reference

- **Budget Page**: `/src/app/shows/[id]/budget/page.tsx`
- **Budget Hook**: `/src/hooks/useBudgets.ts`
- **Budget Types**: `/src/types/budget.ts`
- **Bookkeeping Page**: `/src/app/bookkeeping/page.tsx`
- **Backend API**: `/backend/server.js` (lines 2296-2600)
- **Documentation**: `BUDGET_PAGE_VERIFICATION.md`, `SHOW_BUDGET_PAGE_IMPLEMENTATION.md`
