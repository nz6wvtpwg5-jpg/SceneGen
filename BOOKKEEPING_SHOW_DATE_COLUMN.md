# Bookkeeping Show Date Column Added

## ✅ Feature Implemented

The bookkeeping table now displays the show date for each budget.

## 🎯 Changes Made

### 1. **Backend Update** (`/backend/server.js`)
Added `show_date` to the SQL query when fetching budgets:

```javascript
// Before
let query = 'SELECT b.*, s.venue_name as show_name, s.city as venue_city FROM budgets b LEFT JOIN shows s ON b.show_id = s.id WHERE b.entity_id = $1';

// After
let query = 'SELECT b.*, s.venue_name as show_name, s.city as venue_city, s.show_date FROM budgets b LEFT JOIN shows s ON b.show_id = s.id WHERE b.entity_id = $1';
```

Added `showDate` to the camelCase transformation:

```javascript
showName: row.show_name,
venueCity: row.venue_city,
showDate: row.show_date,  // ← NEW
```

### 2. **Type Definition Update** (`/src/types/budget.ts`)
Added `showDate` field to the Budget interface:

```typescript
export interface Budget {
  // ...existing fields...
  showName?: string; // Denormalized for easy display
  venueCity?: string; // Denormalized for easy display
  showDate?: string; // Denormalized for easy display ← NEW
  createdAt: string;
  updatedAt: string;
  // ...rest of fields...
}
```

### 3. **UI Update** (`/src/app/bookkeeping/page.tsx`)

#### Added Table Header
```tsx
<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
  Date
</th>
```

#### Added Table Cell
```tsx
<td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm text-foreground">
    {budget.showDate ? new Date(budget.showDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) : '-'}
  </div>
</td>
```

## 📊 Updated Table Layout

```
┌────────────────┬──────────────┬──────────┬─────────┬──────────┬────────────┬────────┬─────────┐
│ BUDGET NAME    │ SHOW         │ DATE     │ REVENUE │ EXPENSES │ NET PROFIT │ MARGIN │ ACTIONS │
├────────────────┼──────────────┼──────────┼─────────┼──────────┼────────────┼────────┼─────────┤
│ HPS Netherlands│ Burgerweeshuis│ Feb 27,  │ €2,750  │ €725     │ €2,025     │ 73.6%  │ [🗑️]    │
│ 2026           │ Deventer     │ 2026     │         │          │            │        │         │
├────────────────┼──────────────┼──────────┼─────────┼──────────┼────────────┼────────┼─────────┤
│ HPS Belgium    │ Rue Dieudonne│ Feb 28,  │ €2,750  │ €2,075   │ €675       │ 24.5%  │ [🗑️]    │
│                │ Belgium      │ 2026     │         │          │            │        │         │
└────────────────┴──────────────┴──────────┴─────────┴──────────┴────────────┴────────┴─────────┘
```

## 🎨 Date Format

The date is displayed in a readable format:
- **Format**: `MMM DD, YYYY`
- **Examples**:
  - `Feb 27, 2026`
  - `Mar 15, 2026`
  - `Dec 31, 2025`
- **Fallback**: Shows `-` if no date is available

## 📝 Benefits

1. **Quick Reference**: See when each show is happening without leaving the page
2. **Sorting Context**: Understand the chronological order of budgets
3. **Planning**: Easily identify upcoming vs past shows
4. **Verification**: Confirm budget is linked to the correct show date

## 🔧 Technical Details

- **Data Source**: Joined from `shows.show_date` column in database
- **Denormalized**: Stored in budget response for performance (no extra query needed)
- **Optional Field**: Handles cases where show might not exist (uses `?` optional chaining)
- **Date Formatting**: Uses JavaScript `Intl.DateTimeFormat` via `toLocaleDateString()`

## ✅ Status

**COMPLETE** ✅

The bookkeeping page now shows the date column with properly formatted show dates!

## Files Modified

1. `/backend/server.js` - Added show_date to SQL query and camelCase transformation
2. `/src/types/budget.ts` - Added showDate field to Budget interface
3. `/src/app/bookkeeping/page.tsx` - Added Date column header and cell with formatting
