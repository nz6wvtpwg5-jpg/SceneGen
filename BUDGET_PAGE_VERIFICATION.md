# Budget Page Verification & Testing Guide

## Overview
This document provides verification steps and testing procedures for the Show Budget feature in SceneGen.

## Feature Components

### 1. Budget Page (`/shows/[id]/budget/page.tsx`)
- **Location**: `/src/app/shows/[id]/budget/page.tsx`
- **Purpose**: Display budget overview for a specific show
- **Data Source**: Bookkeeping data from `/api/budgets` endpoint

### 2. Budget Hook (`useBudgets.ts`)
- **Location**: `/src/hooks/useBudgets.ts`
- **Purpose**: Fetch and manage budget data
- **Filters**: `showId`, `tourId`, `search`

### 3. Backend API
- **Endpoint**: `GET /api/budgets`
- **Query Parameters**: `entityId`, `showId`, `tourId`, `search`
- **Data Transformation**: snake_case → camelCase

## Database Verification

### Current Budget Data
```sql
-- Check budgets in database
SELECT COUNT(*) FROM budgets;
-- Result: 2 budgets

-- View recent budgets
SELECT id, budget_name, show_id, tour_id, currency, total_sales, total_expenses
FROM budgets
ORDER BY created_at DESC
LIMIT 5;
```

### Existing Budgets
1. **HPS Netherlands 2026**
   - ID: `b51cc0ce-bd03-46aa-8cb1-bb067564fa09`
   - Show ID: `0615a708-eded-4333-859f-27ea9c0154fa`
   - Currency: EUR
   - Total Sales: €2,750.00
   - Total Expenses: €725.00
   - **Net Profit: €2,025.00**

2. **HPS Belgium**
   - ID: `61c9a6d4-ea57-4669-b675-3a216bc6e131`
   - Show ID: `8b87c41e-ea9e-43c3-9ce4-bf104130aa11`
   - Currency: EUR
   - Total Sales: €2,750.00
   - Total Expenses: €2,075.00
   - **Net Profit: €675.00**

## Testing Procedures

### Test 1: Access Budget Page for Show with Budget
**URL**: `/shows/8b87c41e-ea9e-43c3-9ce4-bf104130aa11/budget`

**Expected Results**:
- ✅ Page loads without errors
- ✅ Budget name displayed: "HPS Belgium"
- ✅ Total Revenue: €2,750.00
- ✅ Total Expenses: €2,075.00
- ✅ Net Profit: €675.00
- ✅ Profit Margin: 24.5%
- ✅ Revenue breakdown displayed
- ✅ Expense breakdown displayed
- ✅ "Edit Budget" button functional

### Test 2: Access Budget Page for Show without Budget
**URL**: `/shows/a597408d-e553-4b97-8330-05fda5313bdf/budget`

**Expected Results**:
- ✅ Page loads without errors
- ✅ "No Budget Created" message displayed
- ✅ "Create Budget" button visible
- ✅ Clicking "Create Budget" redirects to `/bookkeeping?createForShow={showId}`

### Test 3: Create Budget from Tour Details
**Steps**:
1. Navigate to tour details: `/tours/[tourId]`
2. Find a show without a budget
3. Click "Budget" button
4. See "No Budget Created" screen
5. Click "Create Budget"
6. Fill in budget details in bookkeeping page
7. Save budget
8. Navigate back to show budget page
9. Verify budget is displayed

### Test 4: Edit Budget from Show Budget Page
**Steps**:
1. Navigate to show with budget: `/shows/8b87c41e-ea9e-43c3-9ce4-bf104130aa11/budget`
2. Click "Edit Budget" button
3. Redirected to `/bookkeeping?editBudget={budgetId}`
4. Make changes to budget
5. Save changes
6. Navigate back to show budget page
7. Verify changes are reflected

### Test 5: Budget Data Flow from Bookkeeping
**Steps**:
1. Go to `/bookkeeping`
2. Create a new budget for a show
3. Enter revenue items:
   - Ticket Sales: €1,500
   - Merch Cash Sales: €250
   - Merch Card Sales: €300
4. Enter expense items:
   - Agent Commission (10%): Auto-calculated
   - Van Costs: €150
   - Accommodation: €200
   - General Payouts: €400
5. Save budget
6. Navigate to show budget page
7. Verify all items are displayed correctly
8. Verify calculations are correct:
   - Total Revenue = €2,050
   - Total Expenses = €955
   - Net Profit = €1,095
   - Profit Margin = 53.4%

## API Verification

### Test Budget API Endpoint
```bash
# Get all budgets for entity
curl -H "Authorization: Bearer {token}" \
  "http://localhost:5005/api/budgets?entityId={entityId}"

# Get budgets for specific show
curl -H "Authorization: Bearer {token}" \
  "http://localhost:5005/api/budgets?entityId={entityId}&showId={showId}"
```

### Verify CamelCase Transformation
The backend transforms snake_case to camelCase:
- `budget_name` → `budgetName`
- `total_sales` → `totalSales`
- `total_expenses` → `totalExpenses`
- `venue_city` → `venueCity`
- `show_date` → `showDate`

## UI/UX Verification

### Summary Cards
- ✅ Total Revenue (green)
- ✅ Total Expenses (red)
- ✅ Net Profit/Loss (green if positive, red if negative)
- ✅ Profit Margin (percentage)

### Revenue Breakdown
- ✅ Ticket Sales
- ✅ Merch Sales (Cash)
- ✅ Merch Sales (Card)
- ✅ Shows "No revenue items recorded" if empty

### Expense Breakdown
- ✅ Agent Commission (with percentage)
- ✅ Van Costs
- ✅ Accommodation
- ✅ Merch Cost of Goods
- ✅ General Payouts
- ✅ Extra Expenses
- ✅ Shows "No expense items recorded" if empty

### Band Member Payouts (if applicable)
- ✅ List of band members
- ✅ Payout amounts
- ✅ Notes for each payout

### Notes Section
- ✅ Displays budget notes if available
- ✅ Hidden if no notes

## Responsive Design
- ✅ Desktop: 4-column grid for summary cards
- ✅ Tablet: 2-column grid
- ✅ Mobile: Single column
- ✅ Scrollable container with proper height
- ✅ Consistent spacing and borders

## Error Handling
- ✅ Loading state displayed while fetching
- ✅ Error message displayed if API fails
- ✅ Graceful handling of missing data
- ✅ Fallback for missing budget

## Integration Points

### From Tour Details Page
- ✅ "Budget" button on each show
- ✅ Links to `/shows/[id]/budget`
- ✅ Button styled consistently with "Day Sheet"

### To Bookkeeping Page
- ✅ "Create Budget" redirects with `createForShow` query param
- ✅ "Edit Budget" redirects with `editBudget` query param
- ✅ Bookkeeping page auto-populates fields based on query params

## Known Issues
None currently identified.

## Future Enhancements
1. **PDF Export**: Export budget as PDF for printing/sharing
2. **Budget Comparison**: Compare actual vs. budgeted amounts
3. **Charts & Visualizations**: Add pie charts and bar graphs
4. **Budget Templates**: Save and reuse budget templates
5. **Multi-Currency Support**: Display budgets in different currencies
6. **Budget Alerts**: Notify when expenses exceed revenue
7. **Historical Data**: View budget history and trends
8. **Batch Actions**: Create budgets for multiple shows at once

## Verification Checklist

### Database
- [x] Budgets table exists and has data
- [x] Shows are linked to budgets via `show_id`
- [x] Budget fields include all necessary columns
- [x] camelCase/snake_case transformation working

### Backend API
- [x] GET `/api/budgets` endpoint functional
- [x] Filtering by `showId` works correctly
- [x] Data transformation (snake_case → camelCase) implemented
- [x] Error handling in place

### Frontend
- [x] Budget page component created
- [x] `useBudgets` hook implemented
- [x] Budget types defined
- [x] Loading and error states handled
- [x] Navigation to/from budget page working

### Integration
- [x] "Budget" button added to tour details shows
- [x] Link to bookkeeping for create/edit
- [x] Data flow from bookkeeping to budget page verified

### UI/UX
- [x] Summary cards display correctly
- [x] Revenue breakdown shows all items
- [x] Expense breakdown shows all items
- [x] Responsive design implemented
- [x] Consistent styling with app theme

## Testing Results

### ✅ Manual Testing
- Budget page loads for shows with budgets
- "No Budget" state displays correctly
- Navigation between pages works
- Data displays accurately
- Responsive design works on all screen sizes

### ✅ API Testing
- Endpoint returns correct data
- Filtering works as expected
- Error handling works correctly
- Performance is acceptable

### ✅ Data Verification
- Database contains test budgets
- Data transformation is correct
- Calculations are accurate (revenue, expenses, profit, margin)

## Documentation
- [x] `SHOW_BUDGET_PAGE_IMPLEMENTATION.md` - Initial implementation
- [x] `IMPLEMENTATION_SUMMARY.md` - Overall feature summary
- [x] This verification document

## Status: ✅ COMPLETE

The Show Budget feature is fully implemented and verified. All core functionality works as expected:
- Budget display page created
- Integration with bookkeeping
- Data flow verified
- UI/UX polished
- Error handling in place
- Responsive design working

Next steps: Implement Day Sheet page and add enhancements (PDF export, charts, etc.)
