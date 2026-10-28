# Merch Sales Grouped by Date - Implementation Complete

## Overview
Completely restructured the "All Sales" table to group transactions by date, showing daily totals with expandable rows to view individual transactions and their details.

## Features Implemented

### 1. **Date Grouping**
- Sales are automatically grouped by date
- Shows daily totals for revenue, transactions, and items
- Dates displayed in user-friendly format (e.g., "Monday, May 11, 2026")
- Sorted by newest date first

### 2. **Three-Level Hierarchy**

#### Level 1: Date Row (Always Visible)
- **Date** - Full date with day of week
- **Total Revenue** - Sum of all transactions for that date (highlighted in cyan)
- **Transactions** - Number of individual sales
- **Total Items** - Sum of all items sold
- **Matched** - Count of matched vs total (e.g., "5 / 8")
- **Show** - Primary show name (most common show for that date)
- **Expand/Collapse Icon** - Click to show/hide individual transactions

#### Level 2: Individual Transactions (Expandable)
- **Time** - Time of transaction (e.g., "3:47 AM")
- **Order Total** - Individual transaction amount
- **Status** - Badge (Completed, Open, Canceled)
- **Items** - Number of items in this transaction
- **Matched** - Yes/No indicator
- **Show** - Show name and location for this specific transaction
- **Expand/Collapse Icon** - Click to show/hide item details

#### Level 3: Item Details (Expandable)
- **Item Name** - Product name
- **Variation** - Size, color, or other variation (e.g., "XL")
- **Quantity** - Number of items
- **Price** - Total price for this item
- **Order ID** - Square order ID

### 3. **Visual Hierarchy**
- **Date rows**: Slightly darker background, bold font
- **Transaction rows**: Standard background, indented chevron
- **Item details**: Muted background, double-indented, left border accent

### 4. **Smart Interactions**
- Click date row to expand/collapse all transactions for that day
- Click transaction row to expand/collapse item details
- Clicks are isolated (clicking a transaction doesn't collapse the date group)
- Smooth transitions with visual feedback

### 5. **Search Functionality**
- Search still works across all fields
- Grouped results maintain date organization
- Only matching transactions appear

## User Experience Flow

### Default View:
```
📅 Monday, May 11, 2026          $1,234.56    12 transactions    45 items    10/12    The Golden Pony
📅 Sunday, May 10, 2026          $987.65      8 transactions     32 items    8/8      The Golden Pony
📅 Saturday, May 9, 2026         $1,456.78    15 transactions    58 items    12/15    Haltom Theater
```

### After Clicking a Date:
```
📅 Monday, May 11, 2026          $1,234.56    12 transactions    45 items    10/12    The Golden Pony
    ▸ 3:57 AM    $34.50    ✓ Completed    1 item    ✓ Yes    The Golden Pony
    ▸ 3:53 AM    $48.00    ✓ Completed    1 item    ✓ Yes    The Golden Pony
    ▸ 3:52 AM    $40.00    ✓ Completed    1 item    ✓ Yes    The Golden Pony
    ▸ 3:51 AM    $75.00    ✓ Completed    2 items   ✓ Yes    The Golden Pony
    ...
```

### After Clicking a Transaction:
```
    ▾ 3:51 AM    $75.00    ✓ Completed    2 items   ✓ Yes    The Golden Pony
        Order Items:
        ┃ Band T-Shirt [XL]    Qty: 1    $35.00
        ┃ Hoodie [L]           Qty: 1    $40.00
        Order ID: abc123xyz
```

## Benefits

### For Users:
1. **Better Overview** - See total sales per day at a glance
2. **Less Clutter** - Default view is much cleaner
3. **Faster Navigation** - Quickly find specific dates
4. **Flexible Detail** - Expand only what you need to see
5. **Better Analytics** - Daily totals make trends more visible

### For Data:
1. **Organized** - Natural chronological grouping
2. **Scalable** - Works well with hundreds of transactions
3. **Intuitive** - Follows common UX patterns (like email clients)
4. **Searchable** - Maintains search functionality across all levels

## Technical Implementation

### State Management:
- `expandedDates` - Set of expanded date groups
- `expandedSales` - Set of expanded individual sales
- Separate state allows independent control of both levels

### Data Processing:
1. Filter sales based on search term
2. Group filtered sales by date (yyyy-MM-dd format)
3. Calculate aggregates for each date group
4. Sort date groups (newest first)
5. Render in hierarchical structure

### Performance:
- Uses `useMemo` to prevent unnecessary re-grouping
- Only re-groups when sales or search term changes
- Efficient Set-based expansion tracking

## Files Modified
- ✅ `src/components/merch/MerchSalesTable.tsx` - Complete rewrite with date grouping

## Testing Checklist
- [ ] Navigate to `/merch` → "All Sales" tab
- [ ] Verify dates are grouped and sorted correctly
- [ ] Click a date row to expand transactions
- [ ] Verify daily totals match sum of individual transactions
- [ ] Click a transaction to view item details
- [ ] Test search functionality across all fields
- [ ] Verify nested expansion states are independent
- [ ] Check with different date ranges and transaction volumes

## Future Enhancements (Optional)
- [ ] Add "Expand All" / "Collapse All" buttons
- [ ] Add date range picker to filter by date
- [ ] Add export functionality for daily summaries
- [ ] Add visual charts showing daily trends
- [ ] Add comparison between dates
- [ ] Add filters for matched/unmatched only

---
**Status**: ✅ Complete and ready for testing
**Date**: May 11, 2026
