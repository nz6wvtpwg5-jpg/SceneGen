# Show Edit Implementation

## Overview
Implemented the ability to edit existing shows with full persistence to the backend. Users can now click the "Edit" button on any show card to open a modal and modify all show details.

## Changes Made

### 1. Updated `CreateShowForm.tsx`
**File:** `/src/components/shows/CreateShowForm.tsx`

#### Added Features:
- **New `show` prop**: Accepts an existing Show object for editing mode
- **Dual mode support**: Form now works in both "create" and "edit" modes
- **Smart form population**: Automatically populates all fields when editing
- **Tour selection for edits**: When editing a show with an existing tour, the tour is pre-selected
- **Conditional counterparty selection**: Skips counterparty selection entirely when editing
- **Dynamic submit button**: Shows "Update Show" vs "Create Show" based on mode
- **Update API integration**: Calls `updateShow` when editing instead of `createShow`

#### Key Changes:
```typescript
// Added show prop to interface
interface CreateShowFormProps {
    show?: Show; // Show to edit (if editing existing show)
    // ...other props
}

// Added edit mode detection
const isEditing = !!show;

// Populate form with show data when editing
const [formData, setFormData] = useState<Partial<CreateShowInput>>({
    dealType: 'guarantee',
    ...(show && {
        // All show fields populated here
    }),
    // ...
});

// Updated submit handler
const handleSubmit = async (e: React.FormEvent) => {
    if (isEditing && show) {
        // Update existing show
        await updateShow(show.id, updates);
    } else {
        // Create new show
        await createShow(showInput);
    }
};
```

### 2. Updated `ShowsTable.tsx`
**File:** `/src/components/shows/ShowsTable.tsx`

- Already had the Edit button and `onEditShow` callback implemented
- No changes needed - was already calling the parent's `onEditShow` handler

### 3. Updated `shows/page.tsx`
**File:** `/src/app/shows/page.tsx`

#### Added:
- **Edit state management**: `showToEdit` state to track which show is being edited
- **Edit handler**: `handleEditShow` function to open modal with show data
- **Update success handler**: `handleUpdateSuccess` to refresh data after edit
- **Modal title logic**: Shows "Edit Show" vs "Create New Show" based on mode

#### Key Functions:
```typescript
const handleEditShow = (show: Show) => {
    setShowToEdit(show);
    setShowCreateModal(true);
};

const handleUpdateSuccess = async () => {
    setShowCreateModal(false);
    setShowToEdit(null);
    toast.success('Show updated successfully!');
    // Refresh shows list
    const data = await fetchShows();
    setShows(data);
};
```

### 4. Backend API (`useShows.ts`)
**File:** `/src/hooks/useShows.ts`

- The `updateShow` function was already implemented
- It properly calls the PATCH endpoint: `/api/shows/${showId}`
- Includes proper authentication headers

## How It Works

### User Flow:
1. User navigates to Shows page (`/shows`)
2. User clicks "Edit" button on any show card
3. Modal opens with CreateShowForm pre-populated with show data
4. Modal title shows "Edit Show"
5. User modifies any fields (venue, date, times, deal terms, etc.)
6. User clicks "Update Show" button
7. Form calls `updateShow(showId, updates)` via the useShows hook
8. API sends PATCH request to `/api/shows/${showId}`
9. Backend updates the show in the database
10. Success toast appears: "Show updated successfully!"
11. Shows list refreshes to display updated data
12. Modal closes

### Data Flow:
```
ShowsTable (Edit button clicked)
    ↓
shows/page.tsx (handleEditShow)
    ↓
CreateShowForm (show prop passed)
    ↓
Form populated with show data
    ↓
User makes changes
    ↓
handleSubmit (isEditing=true)
    ↓
useShows.updateShow(showId, updates)
    ↓
API: PATCH /api/shows/${showId}
    ↓
Backend updates database
    ↓
Response: Updated show object
    ↓
handleUpdateSuccess
    ↓
Toast notification + refresh list
```

## Features Supported in Edit Mode

### All Show Fields Editable:
- ✅ Venue information (name, address, city, state, country)
- ✅ Show date and times (doors, show time)
- ✅ Deal terms (guarantee, door split, ticket prices)
- ✅ Currency (auto-detected by country)
- ✅ Set length and technical requirements
- ✅ Contact information
- ✅ Notes
- ✅ Tour assignment (can change or remove tour)

### What's NOT Editable:
- ❌ Artist and Promoter (counterparty relationships are fixed once set)
- ❌ Show status (managed separately via Cancel Show action)
- ❌ Show ID (immutable)

## Technical Details

### Type Safety:
- All types properly defined with TypeScript
- `Show` type imported from `@/types/show`
- Proper null handling with `show || undefined`

### State Management:
- Edit mode detected via `isEditing = !!show`
- Form fields conditionally hidden/shown based on mode
- Tour selection pre-populated when editing show with existing tour

### Error Handling:
- Try-catch blocks around update operations
- Error messages logged to console
- Failed updates don't close modal (user can retry)

### UI/UX:
- Submit button text changes based on mode
- Loading states: "Updating..." vs "Creating..."
- Modal title: "Edit Show" vs "Create New Show"
- Cancel button clears edit state
- Success toast confirms update

## Testing

### To Test Edit Functionality:
1. Navigate to http://localhost:3002/shows
2. Ensure you have at least one show visible
3. Click the "Edit" button on a show card
4. Modal should open with all fields pre-populated
5. Make changes to any field(s)
6. Click "Update Show"
7. Verify success toast appears
8. Verify modal closes
9. Verify show list refreshes with updated data
10. Verify changes are persisted (refresh page, changes remain)

### Test Scenarios:
- ✅ Edit venue information
- ✅ Change show date/time
- ✅ Modify deal terms
- ✅ Update notes and technical requirements
- ✅ Change tour assignment
- ✅ Remove from tour (select "Standalone")
- ✅ Cancel edit (data not saved)
- ✅ Concurrent edits (edit multiple shows)

## Backend Requirements

### API Endpoint:
The implementation relies on the existing PATCH endpoint:
- **URL:** `/api/shows/${showId}`
- **Method:** PATCH
- **Headers:** Authorization, X-Entity-Id (when applicable)
- **Body:** Partial<Show> with updated fields
- **Response:** Updated Show object

This endpoint was already implemented and working correctly.

## Future Enhancements

### Potential Improvements:
1. **Optimistic updates**: Update UI immediately before API response
2. **Field validation**: Add client-side validation for required fields
3. **Change tracking**: Highlight which fields were modified
4. **Undo capability**: Allow reverting changes before save
5. **Edit history**: Track who made changes and when
6. **Bulk edit**: Edit multiple shows at once
7. **Inline editing**: Edit fields directly in the table without modal

## Files Modified

1. `/src/components/shows/CreateShowForm.tsx`
   - Added `show` prop
   - Added edit mode logic
   - Updated submit handler
   - Updated form initialization
   - Updated button text

2. `/src/app/shows/page.tsx`
   - Added `showToEdit` state
   - Added `handleEditShow` function
   - Added `handleUpdateSuccess` function
   - Updated modal rendering logic

3. `/src/components/shows/ShowsTable.tsx`
   - Already had Edit button (no changes needed)

## Dependencies

### No New Dependencies Added
The implementation uses existing hooks and components:
- `useShows` hook (already had `updateShow` function)
- `CreateShowForm` component (enhanced to support editing)
- Existing types from `@/types/show`

## Commit Message

```
feat: implement show editing with full persistence

- Add edit mode to CreateShowForm component
- Support both create and edit workflows in single form
- Pre-populate all fields when editing existing show
- Call updateShow API for edits, createShow for new shows
- Update modal title and button text based on mode
- Skip counterparty selection when editing
- Pre-select tour if show has existing tour assignment
- Refresh show list after successful update
- Show success toast on update
- All show fields editable except artist/promoter relationships

Users can now click Edit button on any show to modify details
with changes persisting to backend and updating across the UI.
```

## Status: ✅ Complete

Show editing is fully implemented and ready for testing. All changes persist to the backend via the PATCH API endpoint, and the UI updates correctly after edits.
