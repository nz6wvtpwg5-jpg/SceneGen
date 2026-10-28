# Budget Line Items - Quick Test Guide

## ✅ Changes Implemented

The budget feature now saves and displays **detailed revenue and expense breakdowns** instead of just totals.

## 🧪 How to Test

### Create a New Budget with Line Items

1. **Navigate to Bookkeeping**
   - Go to: `http://localhost:3000/bookkeeping`
   - Click "New Budget" button

2. **Fill in Budget Details**
   - **Budget Name**: Auto-filled when you select a show
   - **Show**: Select any show from dropdown
   - **Currency**: EUR (or your preferred currency)

3. **Enter Revenue (NEW FIELDS!)**
   - **Fee Paid (Ticket Sales)**: `1500`
   - **Merch Sales (Cash)**: `250` ⬅️ NEW
   - **Merch Sales (Card)**: `300` ⬅️ NEW
   - **Total Revenue**: `€2,050.00` (auto-calculated) ⬅️ NEW

4. **Agent Commission**
   - **Percentage**: `10` (default)
   - **Amount**: `€205.00` (auto-calculated from total revenue)

5. **Add Expenses**
   Click "Add Expense" for each:
   - Name: `Van Costs`, Amount: `150`
   - Name: `Accommodation`, Amount: `200`
   - Name: `Band Payout`, Amount: `400`

6. **Review Totals**
   - Total Revenue: €2,050.00
   - Total Expenses: €955.00
   - Net Profit: €1,095.00

7. **Create Budget**
   - Click "Create Budget" button
   - Wait for success message

### View Budget with Breakdowns

1. **Navigate to Budget Page**
   - Go to: `http://localhost:3000/tours`
   - Click "View Details" on tour with the show
   - Find your show and click "💰 Budget"

2. **Verify Revenue Breakdown** ✅
   Should show:
   ```
   Revenue Breakdown
   ┌────────────────────────────────┐
   │ Ticket Sales        €1,500.00 │ ⬅️ Shows individual item
   │ Merch Sales (Cash)    €250.00 │ ⬅️ Shows individual item
   │ Merch Sales (Card)    €300.00 │ ⬅️ Shows individual item
   └────────────────────────────────┘
   ```

3. **Verify Expense Breakdown** ✅
   Should show:
   ```
   Expense Breakdown
   ┌────────────────────────────────────┐
   │ Agent Commission (10%)  €205.00   │ ⬅️ Shows with percentage
   │ Van Costs               €150.00   │ ⬅️ Categorized expense
   │ Accommodation           €200.00   │ ⬅️ Categorized expense
   │ General Payouts         €400.00   │ ⬅️ Categorized expense
   └────────────────────────────────────┘
   ```

4. **Verify Summary Cards** ✅
   - Total Revenue: €2,050.00 (green)
   - Total Expenses: €955.00 (red)
   - Net Profit: €1,095.00 (green)
   - Profit Margin: 53.4% (green)

## 🔍 What Changed

### Before (Old Behavior)
```javascript
// Only sent totals
{
  totalSales: 2050,
  totalExpenses: 955
}

// Budget page showed:
Revenue Breakdown: "No revenue items recorded" ❌
Expense Breakdown: "No expense items recorded" ❌
```

### After (New Behavior)
```javascript
// Sends individual line items
{
  ticketSales: 1500,
  merchCashSales: 250,
  merchCardSales: 300,
  totalSales: 2050,
  agentCommission: 205,
  vanCosts: 150,
  accommodationCosts: 200,
  generalPayouts: 400,
  totalExpenses: 955
}

// Budget page shows:
Revenue Breakdown:
  ✅ Ticket Sales: €1,500
  ✅ Merch Sales (Cash): €250
  ✅ Merch Sales (Card): €300

Expense Breakdown:
  ✅ Agent Commission (10%): €205
  ✅ Van Costs: €150
  ✅ Accommodation: €200
  ✅ General Payouts: €400
```

## 💡 Smart Expense Categorization

Expenses are automatically categorized by name:
- "van" → Van Costs
- "gas", "fuel" → Gas Costs
- "accommodation", "hotel" → Accommodation Costs
- "flight", "plane" → Flight Costs
- "merch cost", "goods" → Merch Cost of Goods
- "payout", "salary" → General Payouts
- Everything else → Extra Expenses

## 🗄️ Database Verification

Check if line items were saved:
```bash
cd backend
node -e "
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT budget_name, ticket_sales, merch_cash_sales, merch_card_sales, agent_commission, van_costs FROM budgets ORDER BY created_at DESC LIMIT 1')
  .then(r => console.table(r.rows))
  .then(() => pool.end());
"
```

Expected output:
```
┌─────────┬────────────────────────┬──────────────┬──────────────────┬──────────────────┬───────────────────┬───────────┐
│ (index) │ budget_name            │ ticket_sales │ merch_cash_sales │ merch_card_sales │ agent_commission  │ van_costs │
├─────────┼────────────────────────┼──────────────┼──────────────────┼──────────────────┼───────────────────┼───────────┤
│    0    │ 'Your Budget Name'     │ '1500.00'    │ '250.00'         │ '300.00'         │ '205.00'          │ '150.00'  │
└─────────┴────────────────────────┴──────────────┴──────────────────┴──────────────────┴───────────────────┴───────────┘
```

## 🎯 Success Criteria

✅ Merch sales fields appear in bookkeeping form
✅ Total revenue calculates correctly
✅ Agent commission based on total revenue (not just tickets)
✅ Expenses categorized automatically
✅ Budget page shows revenue breakdown
✅ Budget page shows expense breakdown
✅ All calculations are accurate
✅ Database stores individual fields

## 📝 Notes

### Existing Budgets
- Old budgets (before this update) only have totals
- They will still show "No revenue/expense items recorded"
- To fix: Edit the budget and re-enter line items

### Future Enhancements
- Edit budget functionality
- Validation (ensure totals match line items)
- More detailed categorization
- Budget templates
- Charts and visualizations

## 🚀 Status

**Implementation**: ✅ Complete
**Backend Server**: ✅ Restarted
**Changes Committed**: ✅ Pushed to GitHub
**Ready for Testing**: ✅ Yes!

---

**Test this now by creating a new budget and seeing the breakdowns in action!**
