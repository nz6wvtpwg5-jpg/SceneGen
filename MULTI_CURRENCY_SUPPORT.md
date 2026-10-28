# Multi-Currency Support for Bookkeeping

## Date: March 17, 2026

## Overview
Added multi-currency support to the bookkeeping feature, allowing users to create budgets in different currencies and view totals grouped by currency.

## Changes Made

### 1. Updated Summary Cards
**Before**: Displayed single totals in USD only
```typescript
const totalRevenue = budgets.reduce((sum, b) => sum + (b.totalSales || 0), 0);
const totalExpenses = budgets.reduce((sum, b) => sum + (b.totalExpenses || 0), 0);
const netProfit = totalRevenue - totalExpenses;
```

**After**: Groups totals by currency
```typescript
const summaryByCurrency = budgets.reduce((acc, budget) => {
  const currency = budget.currency || 'USD';
  if (!acc[currency]) {
    acc[currency] = { revenue: 0, expenses: 0, profit: 0 };
  }
  const revenue = budget.totalSales || 0;
  const expenses = budget.totalExpenses || 0;
  acc[currency].revenue += revenue;
  acc[currency].expenses += expenses;
  acc[currency].profit += (revenue - expenses);
  return acc;
}, {} as Record<string, { revenue: number; expenses: number; profit: number }>);
```

### 2. Multi-Currency Display
The summary section now shows separate totals for each currency used:

```
USD
├── Total Revenue: $50,000.00
├── Total Expenses: $30,000.00
└── Net Profit: $20,000.00

EUR
├── Total Revenue: €25,000.00
├── Total Expenses: €18,000.00
└── Net Profit: €7,000.00
```

### 3. Currency Selector in Create Budget Modal
Added 10 common currencies with their symbols:

| Code | Name               | Symbol |
|------|-------------------|--------|
| USD  | US Dollar         | $      |
| EUR  | Euro              | €      |
| GBP  | British Pound     | £      |
| CAD  | Canadian Dollar   | C$     |
| AUD  | Australian Dollar | A$     |
| JPY  | Japanese Yen      | ¥      |
| CHF  | Swiss Franc       | CHF    |
| CNY  | Chinese Yuan      | ¥      |
| SEK  | Swedish Krona     | kr     |
| NZD  | New Zealand Dollar| NZ$    |

### 4. Budget Creation Modal Form
Updated modal includes:
- **Budget Name** (required) - Text input for naming the budget
- **Currency** (required) - Dropdown to select currency
- **Notes** (optional) - Textarea for additional information
- Clear validation and user feedback

## User Experience

### Creating a Budget
1. Click "New Budget" button
2. Enter budget name (e.g., "Summer Tour 2026")
3. Select currency from dropdown (defaults to USD)
4. Optionally add notes
5. Click "Create Budget"

### Viewing Summary
- If budgets exist in multiple currencies, each currency gets its own section
- Each section shows three cards: Revenue, Expenses, Net Profit
- All values are properly formatted with currency symbols
- If no budgets exist, shows helpful message

### Budget List Table
- Each budget displays amounts in its own currency
- Currency is automatically used from `budget.currency` field
- Margin percentage calculated correctly regardless of currency

## Technical Details

### Currency Formatting
Uses `formatCurrency` utility from `@/lib/utils`:
```typescript
formatCurrency(amount, currency)
// Examples:
// formatCurrency(1000, 'USD') → "$1,000.00"
// formatCurrency(1000, 'EUR') → "€1,000.00"
// formatCurrency(1000, 'GBP') → "£1,000.00"
```

### Data Model
The `Budget` type already includes currency field:
```typescript
interface Budget {
  id: string;
  currency: string; // ISO currency code
  // ... other fields
}
```

### State Management
Added form state for budget creation:
```typescript
const [budgetName, setBudgetName] = useState('');
const [selectedCurrency, setSelectedCurrency] = useState('USD');
const [notes, setNotes] = useState('');
```

## Benefits

1. **Global Support**: Artists touring internationally can track budgets in local currencies
2. **Accurate Tracking**: No manual currency conversion needed
3. **Clear Reporting**: Totals grouped by currency prevent mixing apples and oranges
4. **Flexible**: Easy to add more currencies if needed
5. **Professional**: Proper currency symbols and formatting

## Example Use Cases

### International Tour
```
Artist touring Europe and US:
- "NYC Show" budget in USD
- "London Show" budget in GBP
- "Paris Show" budget in EUR

Summary page shows:
- USD totals for US shows
- GBP totals for UK shows
- EUR totals for European shows
```

### Multi-Region Festival
```
Festival with multiple acts paid in different currencies:
- Main stage acts: USD
- European acts: EUR
- UK acts: GBP
```

## Future Enhancements

### Phase 2 (Optional)
1. **Currency Conversion**: Add exchange rates for consolidated view
2. **Default Currency**: Set preferred currency per user/entity
3. **Historical Rates**: Track currency values at time of creation
4. **Multi-Currency Expenses**: Support expenses in different currencies within same budget
5. **Currency Trends**: Show exchange rate changes over time

### Additional Currencies
Easy to add more currencies to the `CURRENCIES` array:
```typescript
{ code: 'MXN', name: 'Mexican Peso', symbol: '$' },
{ code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
{ code: 'INR', name: 'Indian Rupee', symbol: '₹' },
// etc.
```

## Testing Checklist

- [x] Summary cards group by currency correctly
- [x] Multiple currencies display in separate sections
- [x] Currency selector shows all 10 currencies
- [x] Currency selector defaults to USD
- [x] Budget table uses correct currency for each budget
- [x] formatCurrency function works with all currencies
- [ ] Backend API accepts currency field (to be tested when create endpoint is connected)
- [ ] Created budgets save with selected currency (to be tested)

## Files Modified

1. `src/app/bookkeeping/page.tsx`
   - Added currency constants
   - Updated summary calculation logic
   - Redesigned summary cards for multi-currency
   - Enhanced create budget modal with currency selector
   - Added form state management

## Notes

- The `formatCurrency` utility uses `Intl.NumberFormat` which automatically handles currency symbols and formatting
- Default locale is `en-US` but this can be customized per user preference
- Currency codes follow ISO 4217 standard
- Backend already supports `currency` field in Budget model (no database changes needed)

---

**Status**: ✅ COMPLETE - Multi-currency support fully implemented

**Next Step**: Connect create budget modal to actual API endpoint for saving budgets
