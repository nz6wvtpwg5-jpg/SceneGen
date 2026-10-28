# Show Budget Page Implementation

## Feature
Created a dedicated budget overview page for each show that displays budget information created in the `/bookkeeping` section.

## Location
`/src/app/shows/[id]/budget/page.tsx`

## Route
- **URL Pattern**: `/shows/[showId]/budget`
- **Example**: `/shows/8b87c41e-ea9e-43c3-9ce4-bf104130aa11/budget`

## Features

### 1. **Budget Overview**
Displays comprehensive budget information for a specific show:
- Budget name (auto-generated from show details)
- Show name, venue city, and date
- Currency (supports multi-currency budgets)

### 2. **Financial Summary Cards**
Four key metrics displayed prominently:
- **Total Revenue** (green) - Sum of all income
- **Total Expenses** (red) - Sum of all costs
- **Net Profit/Loss** - Revenue minus expenses (color-coded)
- **Profit Margin** - Percentage profitability

### 3. **Revenue Breakdown**
Detailed breakdown of income sources:
- Ticket Sales
- Merch Sales (Cash)
- Merch Sales (Card)
- Other revenue items

### 4. **Expense Breakdown**
Detailed breakdown of costs:
- Agent Commission (with percentage)
- Van Costs
- Accommodation
- Merch Cost of Goods
- General Payouts
- Extra Expenses

### 5. **Band Member Payouts**
If applicable, shows individual payouts to band members:
- Member name
- Payout amount
- Notes (if provided)

### 6. **Notes Section**
Displays any notes or comments about the budget

### 7. **No Budget State**
If no budget exists for the show:
- Friendly empty state message
- "Create Budget" button that redirects to `/bookkeeping?createForShow=[showId]`
- Option to create budget directly

## Data Flow

### Fetching Budget Data
```typescript
const { budgets, loading, error, refetch } = useBudgets({ showId });
```

The `useBudgets` hook:
1. Fetches budgets from `/api/budgets?entityId={entityId}&showId={showId}`
2. Returns array of budgets (typically one per show)
3. Handles loading and error states

### Budget Display
```typescript
// Get the first budget for this show
if (!loading && budgets.length > 0) {
  setBudget(budgets[0]);
}
```

## Calculations

### Net Profit/Loss
```typescript
const totalRevenue = budget.totalSales || 0;
const totalExpenses = budget.totalExpenses || 0;
const netProfit = totalRevenue - totalExpenses;
```

### Profit Margin
```typescript
const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
```

## User Actions

### Edit Budget
- **Button**: "Edit Budget" (top-right)
- **Action**: Redirects to `/bookkeeping?editBudget={budgetId}`
- Opens the budget in edit mode in the bookkeeping section

### Create Budget
- **Button**: "Create Budget" (shown when no budget exists)
- **Action**: Redirects to `/bookkeeping?createForShow={showId}`
- Pre-populates the create form with show information

### Back Navigation
- **Button**: "Back to Tour" (top-left with arrow icon)
- **Action**: Returns to previous page (typically tour details)

## Visual Design

### Summary Cards Layout
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Revenue     │ Expenses    │ Net P/L     │ Margin      │
│ $5,000      │ $3,000      │ $2,000      │ 40.0%       │
│ (green)     │ (red)       │ (green)     │ (green)     │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Revenue/Expense Breakdown
```
┌─────────────────────────────────────────────┐
│ Ticket Sales                        $3,000  │
├─────────────────────────────────────────────┤
│ Merch Sales (Cash)                  $1,500  │
├─────────────────────────────────────────────┤
│ Merch Sales (Card)                    $500  │
└─────────────────────────────────────────────┘
```

## Integration with Bookkeeping

### Creating Budgets
1. User clicks "💰 Budget" button on show in tour details
2. If no budget exists, sees "Create Budget" button
3. Clicks button → redirected to `/bookkeeping?createForShow={showId}`
4. Bookkeeping page auto-populates:
   - Show selection (pre-selected)
   - Budget name (from venue + date)
   - Currency (from show)
5. User fills in revenue/expense details
6. Budget saved to database
7. User returns to budget page to view

### Editing Budgets
1. User clicks "Edit Budget" button
2. Redirected to `/bookkeeping?editBudget={budgetId}`
3. Bookkeeping page loads budget in edit mode
4. User updates values
5. Changes saved to database
6. User returns to budget page to view updated data

## API Endpoints Used

### GET `/api/budgets?showId={showId}`
Fetches all budgets for a specific show
```json
[
  {
    "id": "budget-uuid",
    "showId": "show-uuid",
    "budgetName": "Burgerweeshuis - Feb 27, 2026",
    "currency": "USD",
    "totalSales": 5000,
    "totalExpenses": 3000,
    "ticketSales": 3000,
    "merchCashSales": 1500,
    "merchCardSales": 500,
    "agentCommission": 500,
    "vanCosts": 800,
    ...
  }
]
```

## Currency Support

The page supports multiple currencies:
- USD ($), EUR (€), GBP (£), CAD (C$), AUD (A$)
- JPY (¥), CHF (CHF), CNY (¥), SEK (kr), NZD (NZ$)
- And more

Currency formatting is handled by `formatCurrency()` utility:
```typescript
formatCurrency(5000, 'EUR') // "€5,000.00"
formatCurrency(3000, 'GBP') // "£3,000.00"
```

## Error Handling

### No Budget Found
- Displays empty state with "Create Budget" CTA
- User can create budget directly from this page

### API Error
- Displays error message in red box
- Provides back navigation

### Loading State
- Shows "Loading budget..." message
- Prevents premature rendering

## Responsive Design

- **Desktop**: 4-column grid for summary cards
- **Mobile**: Single column layout (md:grid-cols-4)
- Scrollable content area
- Touch-friendly buttons

## Accessibility

- Semantic HTML elements
- Clear visual hierarchy
- Color-coded profit/loss indicators
- Icon + text labels for clarity
- Keyboard navigation support

## Future Enhancements

1. **PDF Export**: Export budget as PDF for printing
2. **Budget Comparison**: Compare budgeted vs actual amounts
3. **Historical Data**: View budget changes over time
4. **Charts/Graphs**: Visual representation of revenue/expense breakdown
5. **Budget Templates**: Quick-apply common budget structures
6. **Multi-Show Comparison**: Compare budgets across multiple shows
7. **Budget Alerts**: Notify when expenses exceed revenue
8. **Currency Conversion**: Convert between currencies in real-time
9. **Line Item Details**: Expand to show individual line items
10. **Inline Editing**: Edit budget values directly on this page

## Testing Checklist

- [x] Page loads for show with existing budget
- [x] Page loads for show without budget (shows create CTA)
- [x] Summary cards display correct values
- [x] Revenue breakdown shows all income sources
- [x] Expense breakdown shows all costs
- [x] Band member payouts display (if present)
- [x] Notes section displays (if present)
- [x] "Edit Budget" button navigates correctly
- [x] "Create Budget" button navigates correctly
- [x] "Back" button returns to previous page
- [x] Currency formatting works correctly
- [x] Profit/loss color coding (green/red) works
- [x] No TypeScript errors
- [ ] Test with different currencies
- [ ] Test with various budget amounts
- [ ] Test responsive layout on mobile

## Related Files

- `/src/app/bookkeeping/page.tsx` - Budget creation/editing
- `/src/hooks/useBudgets.ts` - Budget data fetching
- `/src/types/budget.ts` - Budget type definitions
- `/backend/server.js` - Budget API endpoints
- `/src/app/tours/[id]/page.tsx` - Tour details with budget button

## Status
✅ **IMPLEMENTED** - Show budget page displays comprehensive budget overview with revenue, expenses, and profit/loss calculations.

## Next Steps
1. Test budget page with real budget data
2. Add PDF export functionality
3. Implement budget vs actual comparison
4. Add charts for visual budget analysis
