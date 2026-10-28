# Budget Line Items - Test Instructions

## ✅ What's Been Fixed

Individual expense items are now preserved and displayed with their original names instead of being combined into categories like "Extra Expenses".

## 🧪 Test with a New Budget

### Step 1: Create a New Budget
1. Go to: `http://localhost:3000/bookkeeping`
2. Click **"New Budget"**
3. Select a show
4. Fill in revenue:
   - **Agreed Fee**: `2000`
   - **Merch Sales (Cash)**: `300`
   - **Merch Sales (Card)**: `400`
5. Add expenses (click "Add Expense" for each):
   - Name: `Van Rental`, Amount: `150`
   - Name: `Hotel Rotterdam`, Amount: `250`
   - Name: `Band Dinner`, Amount: `100`
   - Name: `Parking Fees`, Amount: `25`
6. Click **"Create Budget"**

### Step 2: View the Budget
1. Go to the tour details page
2. Click **"💰 Budget"** on the show you just created a budget for
3. **Verify Revenue Breakdown** shows:
   ```
   ✅ Agreed Fee: €2,000.00
   ✅ Merch Sales (Cash): €300.00
   ✅ Merch Sales (Card): €400.00
   ```

4. **Verify Expense Breakdown** shows:
   ```
   ✅ Agent Commission (10%): €270.00
   ✅ Van Rental: €150.00
   ✅ Hotel Rotterdam: €250.00
   ✅ Band Dinner: €100.00
   ✅ Parking Fees: €25.00
   ```

## 📊 What Changed

### Before
Expenses were combined:
```
Expense Breakdown:
- Agent Commission (10%): €270.00
- Extra Expenses: €525.00  ❌ (all expenses lumped together)
```

### After
Expenses show with original names:
```
Expense Breakdown:
- Agent Commission (10%): €270.00
- Van Rental: €150.00        ✅
- Hotel Rotterdam: €250.00   ✅
- Band Dinner: €100.00       ✅
- Parking Fees: €25.00       ✅
```

## 🗄️ Database Changes

### New Table: `budget_line_items`
```sql
CREATE TABLE budget_line_items (
  id UUID PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  item_type VARCHAR(20) CHECK (item_type IN ('revenue', 'expense')),
  category VARCHAR(100),
  name VARCHAR(255),
  amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Verify in Database
```bash
cd backend
node -e "
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Get latest budget with line items
pool.query(\`
  SELECT b.budget_name, li.name, li.amount
  FROM budgets b
  LEFT JOIN budget_line_items li ON b.id = li.budget_id
  WHERE b.created_at > NOW() - INTERVAL '1 hour'
  ORDER BY b.created_at DESC, li.created_at ASC
  LIMIT 10
\`)
.then(r => console.table(r.rows))
.then(() => pool.end());
"
```

## 🔍 Technical Details

### Backend Changes
1. **POST /api/budgets** now accepts `expenses` array
2. Saves each expense as individual row in `budget_line_items` table
3. Uses transaction to ensure data integrity
4. **GET /api/budgets** fetches line items and includes them in response

### Frontend Changes
1. **Bookkeeping page** sends `expenses` array with original names
2. **Budget page** displays items from `budget.lineItems` array
3. Filters by `type === 'expense'` to show only expenses
4. Agent commission still shown separately (calculated field)

### Data Flow
```
User enters: "Van Rental" - €150
             "Hotel Rotterdam" - €250
      ↓
Frontend sends expenses array:
[
  { name: "Van Rental", amount: 150 },
  { name: "Hotel Rotterdam", amount: 250 }
]
      ↓
Backend saves to budget_line_items table:
budget_id | item_type | name            | amount
----------|-----------|-----------------|-------
<uuid>    | expense   | Van Rental      | 150.00
<uuid>    | expense   | Hotel Rotterdam | 250.00
      ↓
Backend returns budget with lineItems:
{
  ...budget fields,
  lineItems: [
    { type: "expense", name: "Van Rental", amount: 150 },
    { type: "expense", name: "Hotel Rotterdam", amount: 250 }
  ]
}
      ↓
Frontend displays each item individually
```

## 🎯 Success Criteria

- [x] Backend table `budget_line_items` created
- [x] POST endpoint saves individual line items
- [x] GET endpoint returns line items with budget
- [x] Frontend sends expenses array
- [x] Budget page displays line items with original names
- [x] Agent commission shown separately
- [x] No errors in backend or frontend
- [x] Backend server restarted
- [x] Changes committed and pushed to GitHub

## 📝 Notes

### Existing Budgets
- Old budgets won't have line items (table didn't exist)
- They still show totals and categorized expenses
- Create new budgets to see line items feature

### Future Enhancements
- Edit line items
- Add/remove items after creation
- Categorize items with dropdowns
- Revenue line items (if needed)
- Notes per line item
- Sorting and filtering

## 🚀 Status

**Implementation**: ✅ Complete
**Database Migration**: ✅ Complete
**Backend Server**: ✅ Restarted
**Changes Committed**: ✅ Pushed to GitHub
**Ready for Testing**: ✅ Yes!

---

**Create a new budget now to see your expenses displayed with their exact names!**
