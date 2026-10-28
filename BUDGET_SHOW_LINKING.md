# Budget-to-Show Linking Feature

## Date: March 17, 2026

## Overview
Updated the bookkeeping feature to require show selection when creating budgets. Budgets can only be created for existing shows (past or future).

## Changes Made

### 1. Show Selector in Create Budget Modal
Added a dropdown to select from existing shows when creating a budget:

```typescript
// Fetch shows when modal opens
useEffect(() => {
  if (showCreateModal) {
    setShowsLoading(true);
    fetchShows()
      .then((shows) => setAvailableShows(shows))
      .catch((err) => console.error('Error fetching shows:', err))
      .finally(() => setShowsLoading(false));
  }
}, [showCreateModal, fetchShows]);
```

### 2. Auto-Population of Budget Details
When a show is selected, the budget name and currency are automatically populated:

**Budget Name**: Auto-populated as `{Venue Name} - {Show Date}`
- Example: "Madison Square Garden - Mar 15, 2026"
- Can be customized by the user

**Currency**: Auto-populated from the show's currency if available
- Falls back to USD if show doesn't have a currency set
- Can be changed by the user

```typescript
useEffect(() => {
  if (selectedShowId && availableShows.length > 0) {
    const selectedShow = availableShows.find((show: Show) => show.id === selectedShowId);
    if (selectedShow) {
      // Auto-populate budget name
      if (!budgetName) {
        const showDate = new Date(selectedShow.showDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        setBudgetName(`${selectedShow.venueName} - ${showDate}`);
      }
      // Set currency from show
      if (selectedShow.currency) {
        setSelectedCurrency(selectedShow.currency);
      }
    }
  }
}, [selectedShowId, availableShows]);
```

### 3. Show List Display
Shows are sorted by date (most recent first) and labeled as Past or Upcoming:

```
Madison Square Garden - New York (Mar 15, 2026) - Upcoming
Red Rocks Amphitheatre - Morrison (Feb 20, 2026) - Past
The Wiltern - Los Angeles (Jan 10, 2026) - Past
```

### 4. Form Validation
The "Create Budget" button is disabled unless:
- A show is selected
- Budget name is filled in

```typescript
disabled={!budgetName.trim() || !selectedShowId}
```

### 5. Empty State Handling
If no shows exist, displays a helpful message:
```
No shows available. Please create a show first before creating a budget.
```

## User Experience

### Creating a Budget (Step by Step)

1. **Click "New Budget"** on the bookkeeping page

2. **Select a Show** from the dropdown
   - Shows sorted by date (newest first)
   - Each show displays: Venue - City (Date) - Status
   - Both past and future shows available

3. **Budget Name Auto-Populated**
   - Automatically filled with "{Venue} - {Date}"
   - Can be customized (e.g., "NYC Show - Production Costs")

4. **Currency Auto-Selected**
   - Inherits from the show's currency
   - Can be changed if needed

5. **Add Optional Notes**
   - Additional context about the budget

6. **Click "Create Budget"**
   - Button only enabled when show is selected and name is filled

### Form Reset
When the modal is closed or cancelled, all fields reset to default values:
```typescript
const resetForm = () => {
  setBudgetName('');
  setSelectedShowId('');
  setSelectedCurrency('USD');
  setNotes('');
};
```

## Technical Implementation

### State Management
```typescript
const [selectedShowId, setSelectedShowId] = useState('');
const [availableShows, setAvailableShows] = useState<Show[]>([]);
const [showsLoading, setShowsLoading] = useState(false);
```

### Show Fetching
Uses the `useShows` hook to fetch available shows:
```typescript
const { fetchShows } = useShows();
```

### Type Safety
Imported `Show` type for proper TypeScript typing:
```typescript
import type { Show } from '@/types/show';
```

## Benefits

1. **Data Integrity**: Ensures every budget is linked to a real show
2. **Better Organization**: Budgets are always associated with specific events
3. **Auto-Population**: Reduces manual data entry
4. **Flexibility**: Works with both past and future shows
5. **User-Friendly**: Clear labels showing show status (Past/Upcoming)
6. **Validation**: Prevents creating orphaned budgets

## Example Use Cases

### Post-Show Budgeting
After a show is complete:
1. Navigate to bookkeeping
2. Click "New Budget"
3. Select the past show
4. Budget name auto-fills
5. Add actual revenue and expenses

### Pre-Show Planning
Before a future show:
1. Create the show first in /shows
2. Navigate to bookkeeping
3. Click "New Budget"
4. Select the upcoming show
5. Plan expected revenue and costs

### Tour Budgeting
For a tour with multiple shows:
1. Create all show entries first
2. Create individual budgets for each show
3. Each budget linked to its specific show
4. Can filter/group by tour later

## Future Enhancements

### Phase 2 (Optional)
1. **Quick Show Creation**: Add "Create New Show" button in the modal
2. **Show Filtering**: Filter shows by date range, status, or tour
3. **Bulk Budget Creation**: Create budgets for multiple shows at once
4. **Template Application**: Apply budget templates to selected show
5. **Show Details Preview**: Display more show info when selected
6. **Edit Show Link**: Allow changing the linked show after creation

### Advanced Features
1. **Tour Summary**: Aggregate budgets across all shows in a tour
2. **Comparison View**: Compare budgets across similar shows
3. **Forecasting**: Use past show budgets to predict future show budgets
4. **Alerts**: Warn if budget significantly differs from show guarantee

## Data Flow

```
User Action: Click "New Budget"
    ↓
Modal Opens
    ↓
Fetch Shows → Display in Dropdown
    ↓
User Selects Show
    ↓
Auto-populate Budget Name & Currency
    ↓
User Reviews/Edits
    ↓
Click "Create Budget"
    ↓
Budget Created with showId reference
```

## Files Modified

1. `src/app/bookkeeping/page.tsx`
   - Added show fetching logic
   - Added show selector UI
   - Added auto-population effects
   - Added form reset function
   - Updated validation logic
   - Enhanced modal with show selection

## Testing Checklist

- [x] Modal fetches shows when opened
- [x] Shows display in dropdown sorted by date
- [x] Past/Upcoming labels display correctly
- [x] Budget name auto-populates from selected show
- [x] Currency auto-selects from selected show
- [x] Empty state shows when no shows exist
- [x] Create button disabled without show selection
- [x] Create button disabled without budget name
- [x] Form resets when modal is closed
- [ ] Budget actually creates with showId (when API connected)
- [ ] Created budget displays linked show info in table

## Notes

- Shows can be in the past or future - both are valid for budget creation
- Budget name is auto-populated but fully customizable
- Currency inherits from show but can be overridden
- Modal is scrollable for long show lists (max-h-[90vh])
- Loading state shown while fetching shows
- Error handling in place for failed show fetches

---

**Status**: ✅ COMPLETE - Budget now requires show selection

**Next Step**: Connect create budget button to actual API endpoint for saving budgets with showId
