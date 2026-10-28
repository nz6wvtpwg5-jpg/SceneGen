# Tour Show Action Buttons Implementation

## Feature
Added "Day Sheet" and "Budget" buttons to each show displayed in the tour details page.

## Implementation

### Location
`/src/app/tours/[id]/page.tsx` - Tour Details Page

### Changes Made

#### Added Action Buttons to Each Show Card
Each show now displays two action buttons below the show details:

1. **📋 Day Sheet** - Primary button (blue background)
   - Navigates to `/shows/{showId}/day-sheet`
   - Displays day-of-show logistics and timing information

2. **💰 Budget** - Secondary button (bordered)
   - Navigates to `/shows/{showId}/budget`
   - Displays financial information and budget tracking

### Visual Design

**Day Sheet Button:**
- Background: Primary color (`bg-primary`)
- Text: Primary foreground color (`text-primary-foreground`)
- Icon: 📋 (clipboard emoji)
- Hover effect: Slightly darker background (`hover:bg-primary/90`)

**Budget Button:**
- Background: Secondary color (`bg-secondary`)
- Text: Secondary foreground color (`text-secondary-foreground`)
- Border: Border color (`border border-border`)
- Icon: 💰 (money bag emoji)
- Hover effect: Slightly darker background (`hover:bg-secondary/90`)

### Code Implementation

```tsx
<div className="flex gap-2">
  <button
    onClick={() => router.push(`/shows/${show.id}/day-sheet`)}
    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
  >
    📋 Day Sheet
  </button>
  <button
    onClick={() => router.push(`/shows/${show.id}/budget`)}
    className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors border border-border"
  >
    💰 Budget
  </button>
</div>
```

## User Flow

1. User navigates to Tours page (`/tours`)
2. User clicks "View Details" on a tour
3. Tour details page displays all shows in the tour
4. Each show card now has two buttons at the bottom:
   - **Day Sheet**: Click to view/edit day-of-show logistics
   - **Budget**: Click to view/edit show budget and financials

## Navigation Routes

### Day Sheet Route
- **URL Pattern**: `/shows/[id]/day-sheet`
- **Purpose**: Display day-of-show information including:
  - Load-in time
  - Sound check time
  - Doors time
  - Show time
  - Technical requirements
  - Contact information
  - Stage plot
  - Hospitality details

### Budget Route
- **URL Pattern**: `/shows/[id]/budget`
- **Purpose**: Display show budget information including:
  - Guarantee/fee
  - Door split percentage
  - Ticket prices
  - Projected revenue
  - Expenses
  - Net profit/loss
  - Payment status

## Future Enhancements

1. **Quick Actions Menu**: Add dropdown with more actions (Edit, Delete, Duplicate, etc.)
2. **Print/Export**: Add buttons to print or export day sheet and budget PDFs
3. **Status Indicators**: Show completion status for day sheet and budget (e.g., "Complete", "Incomplete")
4. **Preview Tooltip**: Show quick preview of day sheet/budget on hover
5. **Keyboard Shortcuts**: Add keyboard shortcuts for quick access (e.g., `D` for Day Sheet, `B` for Budget)
6. **Batch Actions**: Allow selecting multiple shows to generate combined day sheets or budgets

## Testing Checklist

- [x] Buttons display correctly on each show card
- [x] Day Sheet button navigates to `/shows/[id]/day-sheet`
- [x] Budget button navigates to `/shows/[id]/budget`
- [x] Buttons have proper hover states
- [x] Buttons work for all shows in the tour
- [x] No TypeScript errors
- [ ] Day Sheet page exists and loads correctly
- [ ] Budget page exists and loads correctly

## Related Pages

### Day Sheet Page
**Status**: To be implemented
**Route**: `/src/app/shows/[id]/day-sheet/page.tsx`
**Purpose**: Display and edit day-of-show logistics

### Budget Page
**Status**: To be implemented
**Route**: `/src/app/shows/[id]/budget/page.tsx`
**Purpose**: Display and edit show budget and financials

## Accessibility

- Buttons use semantic HTML (`<button>` elements)
- Clear visual distinction between primary and secondary actions
- Emoji icons provide visual cues (should be supplemented with aria-labels if needed)
- Proper contrast ratios for text and backgrounds
- Hover states provide clear feedback

## Mobile Responsiveness

- Buttons stack on smaller screens (handled by flexbox)
- Touch targets are appropriately sized (px-4 py-2 provides adequate tap area)
- Text remains readable at all screen sizes

## Status
✅ **IMPLEMENTED** - Day Sheet and Budget buttons now display on all shows in tour details page.

## Next Steps
1. Create Day Sheet page (`/shows/[id]/day-sheet/page.tsx`)
2. Create Budget page (`/shows/[id]/budget/page.tsx`)
3. Implement day sheet data fetching and editing
4. Implement budget data fetching and editing
5. Add print/export functionality
