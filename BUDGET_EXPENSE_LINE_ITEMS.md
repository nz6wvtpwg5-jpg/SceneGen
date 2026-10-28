# Budget Expense Line Items Feature

## Overview
Enhanced the budget creation modal to allow users to add individual expense line items instead of just a single "Total Expenses" field.

## Changes Made

### 1. **New Expense Line Items UI**
- Users can now add multiple expense items with:
  - **Expense Name**: e.g., "Hotel", "Gas", "Food", "Equipment"
  - **Amount**: Dollar value for each expense
- Each expense is displayed in a list with the ability to remove it
- Total expenses are automatically calculated from the line items

### 2. **User Experience Improvements**
- **Add Expense Flow**:
  1. Enter expense name (e.g., "Hotel")
  2. Enter amount (e.g., "200")
  3. Click "Add Expense" or press Enter
  4. Expense appears in the list above
  5. Can add multiple expenses
  6. Can remove any expense by clicking the "×" button

- **Real-time Calculations**:
  - Total expenses auto-calculate as items are added/removed
  - Net profit updates automatically (Fee Paid - Total Expenses)
  - Currency symbol displays correctly for all amounts

### 3. **Keyboard Shortcuts**
- Press **Enter** in expense name field → focuses amount field
- Press **Enter** in amount field → adds the expense

### 4. **Visual Design**
- Each expense shows as a card with name and amount
- Remove button (×) on the right of each expense
- Total expenses shown at bottom of expense list
- Net profit shown in green (positive) or red (negative)

## Technical Implementation

### State Management
```typescript
type Expense = {
  id: string;      // Unique ID for each expense
  name: string;    // Expense name
  amount: string;  // Amount as string for input handling
};

const [expenses, setExpenses] = useState<Expense[]>([]);
const [newExpenseName, setNewExpenseName] = useState('');
const [newExpenseAmount, setNewExpenseAmount] = useState('');
```

### Functions
- `addExpense()`: Validates and adds new expense to list
- `removeExpense(id)`: Removes expense from list
- `totalExpenses`: Calculated value from all expense amounts

### Data Sent to Backend
When creating a budget:
```json
{
  "budgetName": "Show Name - Date",
  "showId": "uuid",
  "entityId": "uuid",
  "currency": "USD",
  "totalSales": 2750,
  "totalExpenses": 850  // Sum of all expense line items
}
```

## Example Usage

### Creating a Budget with Expenses:
1. Click "New Budget"
2. Select a show
3. Enter fee paid: **$2,750**
4. Add expenses:
   - Hotel: $200
   - Gas: $150
   - Food: $100
   - Equipment rental: $400
5. **Total Expenses**: $850
6. **Net Profit**: $1,900 (shown in green)
7. Click "Create Budget"

## Benefits
- ✅ More detailed expense tracking
- ✅ Better visibility into where money was spent
- ✅ Easier to audit and review show finances
- ✅ Foundation for future detailed budget management features
- ✅ Intuitive UX with keyboard shortcuts

## Future Enhancements
- Save individual expense line items to database (currently only total is saved)
- Add expense categories (Travel, Accommodation, Food, etc.)
- Edit expenses after budget creation
- Import expenses from receipts/photos
- Expense templates for common shows

---
**Status**: ✅ Implemented and ready for testing
**Date**: March 18, 2026
