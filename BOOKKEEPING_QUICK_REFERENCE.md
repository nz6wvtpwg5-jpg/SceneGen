# Bookkeeping Feature - Quick Reference

## What This Feature Does

Allows artists and promoters to track the financial performance of individual shows and entire tours, based on a real-world tour budget spreadsheet template.

## Key Capabilities

### 1. **Create Budgets**
- Link budget to a specific show
- Optionally link to a tour
- Search for shows by venue, city, or date
- Set currency (USD, EUR, GBP, etc.)

### 2. **Track Revenue**
- Ticket sales
- Merchandise (cash + card)
- Per-person merch averages
- Total sales with historical comparison

### 3. **Track Expenses**
- Transportation (van rental, gas, driver fees)
- Accommodation
- Travel (flights, distance)
- Fees and commissions
- Merchandise costs (COGS, staff)
- Miscellaneous expenses

### 4. **Manage Payouts**
- Band member payments
- Agent/manager commissions (percentage-based)
- Contractor fees
- Flexible payout structure

### 5. **Auto-Calculated Metrics**
- Total revenue
- Total expenses
- Net profit
- Profit margin (%)
- Merchandise profit
- Average card order value
- Fee balances and surplus

### 6. **Tour-Level Analytics**
- Aggregate budgets by tour
- Compare show-by-show performance
- Track trends over time
- Identify profitable markets

### 7. **Export & Reporting**
- Export to CSV (matches original template)
- Generate financial reports
- Share with band members/accountants

## User Flow

```
1. Navigate to Bookkeeping tab
   ↓
2. Click "Create Budget"
   ↓
3. Enter budget name (e.g., "Spring Tour - Brooklyn")
   ↓
4. Search for show by venue/city
   ↓
5. Select show from results
   ↓
6. (Optional) Link to tour
   ↓
7. Click "Create Budget"
   ↓
8. Budget created → Redirect to detail page
   ↓
9. Use tabs to enter data:
   - Overview: See summary
   - Revenue: Enter ticket/merch sales
   - Expenses: Enter all costs
   - Payouts: Add band member payments
   - Merchandise: Detailed merch tracking
   - Logistics: Travel distance, notes
   ↓
10. Save changes (auto-calculates totals)
    ↓
11. Export to CSV or generate report
```

## Data Entry Tips

### Progressive Data Entry
You don't need to fill out everything at once:
1. **Pre-show**: Create budget, enter projected revenue/expenses
2. **Post-show**: Update with actual figures
3. **Settlement**: Add final payouts and adjustments

### Required Fields
- Budget name
- Linked show
- Currency

### Optional But Recommended
- Tour link (for aggregation)
- Notes (for context)
- All revenue/expense fields (for accurate tracking)

### Auto-Calculated Fields
These update automatically as you enter data:
- Total revenue
- Total expenses
- Net profit
- Profit margin
- Agent commission
- Merch daily surplus
- Average card order value
- Fee surplus

## Example Budget Entry

**Show**: Brooklyn Bowl, Brooklyn, NY - March 15, 2024
**Tour**: Spring Tour 2024
**Currency**: USD

### Revenue
- Ticket Sales: $2,500
- Merch Card Sales: $800
- Merch Cash Sales: $200
- **Total Sales**: $3,500 ✅ (auto-calculated)

### Expenses
- Van Rental: $200
- Gas: $100
- Accommodation: $400
- Driver Fees: $150
- Merch COGS: $300
- Merch Person Fees: $50
- **Total Expenses**: $1,200 ✅ (auto-calculated)

### Payouts
- Dave: $450 (10%)
- Johnny: $450 (10%)
- Agent (Nate): $350 (10% of revenue)
- **Total Payouts**: $1,250 ✅ (auto-calculated)

### Summary
- **Net Profit**: $1,050 ✅ ($3,500 - $1,200 - $1,250)
- **Profit Margin**: 30% ✅ ($1,050 / $3,500)
- **Merch Profit**: $650 ✅ ($1,000 - $300 - $50)

## CSV Template Columns (30 total)

The feature supports all 30 columns from the original spreadsheet:

**Logistics**: Date, City, Distance
**Revenue**: Ticket sales, Merch sales, Card/Cash split, Total sales
**Expenses**: Van, Driver, Rental, Gas, Accommodation, Flights, Fees, COGS
**Payouts**: Band members, Agent commission, General payouts
**Calculated**: Balances, Surpluses, Averages, Totals, Variation

## Backend Implementation

### Database Tables
- `budgets` - Main budget data
- `band_member_payouts` - Individual payout records

### API Endpoints
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `GET /api/budgets/:id` - Get budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget
- `GET /api/budgets/:id/summary` - Get summary
- `POST /api/budgets/:id/payouts` - Add payout
- `DELETE /api/budgets/:budgetId/payouts/:payoutId` - Remove payout

### Frontend Files
- `/app/bookkeeping/page.tsx` - Budget list
- `/app/bookkeeping/[id]/page.tsx` - Budget detail
- `/components/bookkeeping/*` - Budget components
- `/hooks/useBudgets.ts` - Data fetching
- `/types/budget.ts` - Type definitions

## Technical Notes

### Currency Handling
- Supports multiple currencies (USD, EUR, GBP, CAD, AUD, etc.)
- Inherits from show currency by default
- Formats based on locale
- Stores as decimal values

### Validation
- Budget name required
- Show link required
- Entity ownership enforced
- Non-negative amounts only
- Percentages 0-100 range

### Performance
- Indexed by show_id, tour_id, entity_id
- Pagination for large budget lists
- Lazy loading for detail tabs
- Debounced search

### Security
- Entity-scoped data access
- User authentication required
- Authorization checks on all endpoints
- SQL injection prevention
- XSS protection

## Future Enhancements

### Phase 5+ (Future)
- [ ] QuickBooks/Xero integration
- [ ] Budget approval workflows
- [ ] Version history/audit trail
- [ ] Mobile app
- [ ] Expense receipt uploads
- [ ] Multi-currency conversion
- [ ] Forecasting/projections
- [ ] Tax calculations
- [ ] Profit-sharing calculators
- [ ] Automated bank reconciliation

## Support & Documentation

- See **BOOKKEEPING_IMPLEMENTATION_PLAN.md** for detailed specs
- See **BOOKKEEPING_SUMMARY.md** for development roadmap
- See **src/types/budget.ts** for data model reference

---

**Questions?** Check the implementation plan or ask for clarification!
