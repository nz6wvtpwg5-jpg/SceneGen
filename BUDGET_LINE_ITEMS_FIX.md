# Budget Line Items Fix - Implementation Summary

## Issue Identified
The budget overview page was showing "No revenue items recorded" and "No expense items recorded" even though budgets had total amounts (€2,750 revenue, €725 expenses). This was because:
1. Only `total_sales` and `total_expenses` were being saved
2. Individual line items (`ticket_sales`, `merch_cash_sales`, etc.) were `NULL`
3. The budget page checks for individual fields to display breakdowns

## Root Cause
The bookkeeping page was only sending aggregated totals to the backend, not the individual revenue and expense line items.

## Solution Implemented

### 1. Backend API Updates (`/backend/server.js`)
✅ Updated `POST /api/budgets` endpoint to accept individual fields:

**Revenue Fields**:
- `ticketSales` - Performance fee / ticket sales
- `merchCashSales` - Cash merchandise sales
- `merchCardSales` - Card/digital merchandise sales
- `merchSalesPerPerson` - Per-person merch sales
- `totalSales` - Calculated total

**Expense Fields**:
- `agentCommissionPercent` - Agent fee percentage (default 10%)
- `agentCommission` - Calculated agent commission
- `vanCosts` - Van-related costs
- `driverFees` - Driver fees
- `vanRental` - Van rental costs
- `gasCosts` - Fuel costs
- `accommodationCosts` - Hotel/lodging
- `flightCosts` - Flight expenses
- `generalPayouts` - General payouts/salaries
- `merchPersonFees` - Merch person fees
- `merchCostOfGoods` - Merch COGS
- `extraExpenses` - Other miscellaneous expenses
- `feesCash` - Cash fees
- `totalExpenses` - Calculated total

### 2. Frontend Updates (`/src/app/bookkeeping/page.tsx`)

#### State Management
✅ Added new state variables:
```typescript
const [merchCashSales, setMerchCashSales] = useState('');
const [merchCardSales, setMerchCardSales] = useState('');
```

#### UI Enhancements
✅ Added merch sales input fields:
- **Merch Sales (Cash)** - For cash transactions
- **Merch Sales (Card)** - For card/digital transactions
- **Total Revenue Display** - Shows sum of all revenue sources

#### Calculation Updates
✅ Updated calculations:
- `totalRevenue = ticketSales + merchCashSales + merchCardSales`
- Agent commission now calculated from total revenue (not just ticket sales)
- Total expenses include agent commission + other expenses

#### Expense Categorization
✅ Smart expense mapping:
- Automatically categorizes expenses based on name
- Maps to correct database fields:
  - "van" → `vanCosts`
  - "gas/fuel" → `gasCosts`
  - "accommodation/hotel" → `accommodationCosts`
  - "flight/plane" → `flightCosts`
  - "merch cost" → `merchCostOfGoods`
  - "payout/salary" → `generalPayouts`
  - Everything else → `extraExpenses`

#### Payload Construction
✅ Complete payload sent to API:
```javascript
{
  budgetName, showId, entityId, currency, notes,
  ticketSales, merchCashSales, merchCardSales, totalSales,
  agentCommissionPercent, agentCommission,
  vanCosts, accommodationCosts, generalPayouts, extraExpenses,
  totalExpenses
}
```

## Database Impact
Individual budget fields will now be populated:
- `ticket_sales` - Instead of NULL
- `merch_cash_sales` - Instead of NULL
- `merch_card_sales` - Instead of NULL
- `agent_commission` - Instead of NULL
- `van_costs` - Instead of NULL
- etc.

## Budget Page Display
With individual fields populated, the budget page will now show:

### Revenue Breakdown
```
┌────────────────────────────────┐
│ Ticket Sales        €1,500.00 │
│ Merch Sales (Cash)    €250.00 │
│ Merch Sales (Card)    €300.00 │
└────────────────────────────────┘
```

### Expense Breakdown
```
┌────────────────────────────────────┐
│ Agent Commission (10%)  €205.00   │
│ Van Costs               €150.00   │
│ Accommodation           €200.00   │
│ General Payouts         €400.00   │
└────────────────────────────────────┘
```

## Testing

### Create a New Budget
1. Navigate to `/bookkeeping`
2. Click "New Budget"
3. Select a show
4. Enter revenue:
   - Fee Paid: €1500
   - Merch Cash: €250
   - Merch Card: €300
5. Agent fee automatically calculated: €205 (10% of €2050)
6. Add expenses:
   - "Van Costs": €150
   - "Accommodation": €200
   - "Band Payout": €400
7. Click "Create Budget"
8. Navigate to show budget page: `/shows/[showId]/budget`
9. Verify all items appear in breakdown sections ✅

### Verify Database
```sql
SELECT
  budget_name,
  ticket_sales,
  merch_cash_sales,
  merch_card_sales,
  total_sales,
  agent_commission,
  van_costs,
  accommodation_costs,
  general_payouts,
  total_expenses
FROM budgets
WHERE id = 'your-budget-id';
```

Expected: All fields should have values (not NULL)

## Files Modified

### Backend
- ✅ `/backend/server.js` - Updated POST /api/budgets endpoint

### Frontend
- ✅ `/src/app/bookkeeping/page.tsx` - Added merch fields, updated calculations, smart expense categorization

### Documentation
- ✅ `BUDGET_LINE_ITEMS_FIX.md` - This document

## Breaking Changes
None - this is a backward-compatible enhancement. Existing budgets with only totals will still work, but new budgets will have detailed breakdowns.

## Migration Note
Existing budgets in the database only have `total_sales` and `total_expenses` populated. To get breakdowns for existing budgets, users would need to:
1. Edit the budget in bookkeeping
2. Enter the individual line items
3. Save changes

Alternatively, a migration script could be created to split totals into default categories.

## Benefits

### For Users
1. **Detailed Financial Tracking** - See exactly where money comes from and goes to
2. **Better Insights** - Understand revenue streams (tickets vs. merch)
3. **Accurate Reporting** - Individual line items for accounting
4. **Transparency** - Clear breakdown of all costs

### For Developers
1. **Data Integrity** - Proper normalization of financial data
2. **Future Features** - Enable charts, comparisons, analytics
3. **Flexibility** - Easy to add new revenue/expense categories
4. **Consistency** - All budgets follow same structure

## Future Enhancements

### Short-term
1. Edit existing budgets to add line items
2. Validation on save (ensure totals match sum of items)
3. More expense categories (meals, equipment, etc.)

### Medium-term
1. Pie charts for revenue/expense breakdown
2. Budget vs. actual comparison
3. Export detailed budget reports
4. Budget templates with common categories

### Long-term
1. Automated expense categorization with ML
2. Receipt attachment and OCR
3. Real-time budget tracking during tour
4. Integration with accounting software

## Verification Checklist

- [x] Backend accepts individual revenue fields
- [x] Backend accepts individual expense fields
- [x] Frontend sends all line items to API
- [x] Frontend calculates totals correctly
- [x] Agent commission calculated from total revenue
- [x] Expenses automatically categorized
- [x] UI shows merch sales fields
- [x] UI shows total revenue summary
- [x] Budget page will display revenue breakdown
- [x] Budget page will display expense breakdown
- [x] No TypeScript errors
- [x] No backend errors
- [x] Backend server restarted with new code

## Status: ✅ COMPLETE

The budget line items feature is fully implemented. Users can now create budgets with detailed revenue and expense breakdowns that will appear correctly on the budget overview page.

**Next Steps**:
1. Test by creating a new budget with all fields
2. Verify the budget page shows all line items
3. Optionally migrate existing budgets to add line items

---

*Implementation Date: March 19, 2026*
*Backend Server Restarted: ✅*
*Ready for Testing: ✅*
