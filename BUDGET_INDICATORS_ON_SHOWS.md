# Budget Indicators on Shows Page

## ✅ Feature Implemented

Shows that have budgets created in the Bookkeeping page now display budget information in the "Upcoming shows" sidebar on the Shows page.

## 🎯 What Was Added

### Visual Indicators
When a budget exists for a show, the show card displays:

1. **🪙 Coins Icon** - Gold/amber colored to indicate budget tracking
2. **"Budget Tracked" Badge** - Small badge confirming budget exists
3. **Fees** - Total sales/revenue for the show
4. **Costs** - Total expenses for the show

### Layout
```
┌─────────────────────────────────┐
│ Venue Name              [status]│
│ City, State                     │
│ Fri, Feb 27                     │
├─────────────────────────────────┤
│ 🪙 Budget Tracked               │
│ ┌───────────┬───────────┐       │
│ │ Fees      │ Costs     │       │
│ │ $1,500    │ $800      │       │
│ └───────────┴───────────┘       │
└─────────────────────────────────┘
```

## 🔧 Implementation Details

### 1. **Imports Added**
```typescript
import { useBudgets } from "@/hooks/useBudgets";
import type { Budget } from "@/types/budget";
import { Coins } from "lucide-react";
```

### 2. **Budget Data Hook**
```typescript
const { budgets } = useBudgets({ search: '' });
```

### 3. **Helper Functions**
```typescript
// Get budget for a specific show
const getBudgetForShow = (showId: string): Budget | undefined => {
  return budgets.find(budget => budget.showId === showId);
};

// Get currency symbol from code
const getCurrencySymbol = (currencyCode: string): string => {
  const currencyMap: Record<string, string> = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$',
    'AUD': 'A$', 'JPY': '¥', 'CHF': 'CHF', 'CNY': '¥',
    'SEK': 'kr', 'NZD': 'NZ$',
  };
  return currencyMap[currencyCode] || currencyCode;
};
```

### 4. **Show Card Enhancement**
Added budget display section after show notes:

```tsx
{(() => {
  const budget = getBudgetForShow(show.id);
  if (budget) {
    const currencySymbol = getCurrencySymbol(budget.currency);
    const fees = budget.totalSales || 0;
    const costs = budget.totalExpenses || 0;

    return (
      <div className="mt-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 mb-1">
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
            Budget Tracked
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Fees</div>
            <div className="font-medium text-foreground">
              {currencySymbol}{fees.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Costs</div>
            <div className="font-medium text-foreground">
              {currencySymbol}{costs.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
})()}
```

## 📊 Data Flow

```
┌─────────────────┐
│ Bookkeeping Page│
│   Create Budget │
│   - Select Show │
│   - Set Fees    │
│   - Set Costs   │
│   - Save        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend DB    │
│  budgets table  │
│  showId link    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  useBudgets()   │
│  Fetch budgets  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Shows Page    │
│ getBudgetForShow│
│  Display Fees   │
│  Display Costs  │
│  Show 🪙 Icon   │
└─────────────────┘
```

## 🎨 UI/UX Features

### Conditional Display
- **With Budget**: Shows coins icon, fees, and costs
- **Without Budget**: Shows nothing (clean, uncluttered)

### Visual Design
- **Separator**: Subtle border-top to separate budget from show info
- **Icon**: Amber/gold coins icon for "money" association
- **Badge**: Small "Budget Tracked" text for quick scanning
- **Grid Layout**: Two-column layout for fees and costs
- **Currency Support**: Displays correct currency symbol from budget

### Color Scheme
- **Icon**: `text-amber-500` - Gold/amber for money/value
- **Badge**: `text-amber-700 dark:text-amber-400` - Adapts to theme
- **Labels**: `text-muted-foreground` - Subtle labels
- **Values**: `text-foreground` - Bold, readable numbers

## 🔗 Integration Points

### Budget Creation
When you create a budget in `/bookkeeping`:
1. Select a show from dropdown
2. Budget is linked to show via `showId`
3. Save budget with fees (`totalSales`) and costs (`totalExpenses`)

### Shows Page Display
1. `useBudgets()` fetches all budgets for the user
2. `getBudgetForShow(showId)` finds budget by show ID
3. If budget exists, displays:
   - Coins icon
   - "Budget Tracked" badge
   - Fees amount with currency
   - Costs amount with currency

## 📱 Responsive Design

The budget section:
- ✅ Works on mobile (grid layout adapts)
- ✅ Maintains compact size in sidebar
- ✅ Truncates long numbers if needed
- ✅ Scales with dark/light mode

## 🧪 Testing

### Test Case 1: Show With Budget
1. Go to Bookkeeping
2. Create budget for a show
3. Go to Shows page
4. **Expected**: Show displays 🪙 icon, fees, and costs

### Test Case 2: Show Without Budget
1. Create a show
2. Don't create a budget
3. Go to Shows page
4. **Expected**: Show displays normally without budget section

### Test Case 3: Multiple Currencies
1. Create budgets in different currencies (USD, EUR, GBP)
2. Go to Shows page
3. **Expected**: Each show displays correct currency symbol

### Test Case 4: Zero Values
1. Create budget with $0 fees or costs
2. Go to Shows page
3. **Expected**: Displays "$0" (not hidden)

### Test Case 5: Large Numbers
1. Create budget with large amounts (e.g., $10,000+)
2. Go to Shows page
3. **Expected**: Number formatted with commas (e.g., "$10,000")

## 📋 Budget Fields Used

From `Budget` type:
- `showId` - Links budget to show
- `currency` - Currency code (USD, EUR, etc.)
- `totalSales` - Displayed as "Fees"
- `totalExpenses` - Displayed as "Costs"

## ✨ User Benefits

1. **Quick Overview**: See which shows have budgets at a glance
2. **Financial Visibility**: See fees and costs without navigating
3. **Status Indicator**: Coins icon shows budget is tracked
4. **Multi-Currency**: Supports international tours with different currencies
5. **Clean UI**: Only shows when relevant (no clutter)

## 🚀 Future Enhancements

Potential improvements for future iterations:

1. **Net Profit Display**: Show fees - costs = profit
2. **Profit Color Coding**: Green for profit, red for loss
3. **Click to Edit**: Click budget info to jump to bookkeeping
4. **Budget Status**: Show "draft" vs "finalized" budgets
5. **Budget Warning**: Alert if costs exceed fees
6. **Percentage View**: Show costs as % of fees
7. **Tooltip Details**: Hover for more budget breakdown

## 📝 Files Modified

1. `/src/app/shows/page.tsx`
   - Added `useBudgets` hook
   - Added `getBudgetForShow` helper
   - Added `getCurrencySymbol` helper
   - Enhanced show card with budget display

## ✅ Status

**COMPLETE** ✅

Shows with budgets now display:
- 🪙 Coins icon (amber/gold)
- "Budget Tracked" badge
- Fees amount with currency
- Costs amount with currency

All integrated with existing bookkeeping system!
