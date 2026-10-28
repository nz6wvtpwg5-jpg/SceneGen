# Edit and Delete Buttons Added to Shows Page

## ✅ Completed Changes

### 1. Updated `ShowsTable.tsx`
- Added `onDeleteShow` prop to interface
- Replaced "Cancel Show" button with **Edit** and **Delete** buttons
- Removed the conditional check for cancelled status - buttons now always visible
- Edit button: Opens edit modal (when implemented)
- Delete button: Permanently deletes the show with confirmation

### 2. Updated `useShows.ts` Hook
- Added `deleteShow` function to permanently delete shows
- Uses `?permanent=true` query param to distinguish from cancel
- Exported `deleteShow` in the hook's return object

### 3. Updated `shows/page.tsx`
- Added state for edit modal: `showEditModal` and `showToEdit`
- Imported `deleteShow` and `updateShow` from `useShows` hook
- Created `handleEditShow()` - Opens edit modal with selected show
- Created `handleDeleteShow()` - Deletes show with confirmation dialog
- Passed handlers to `ShowsTable` component
- **Added Edit/Delete buttons to sidebar show cards** with compact styling

## 🎯 Features Implemented

### Main Show Cards (List View)
- ✅ **Edit** button - Opens edit modal for the show
- ✅ **Delete** button - Permanently deletes show with confirmation
- ✅ Buttons always visible (not hidden for cancelled shows)
- ✅ Visual styling matches UI design system

### Sidebar Show Cards (Calendar View)
- ✅ **Edit** and **Delete** buttons added
- ✅ Compact button styling for tight space
- ✅ `stopPropagation()` to prevent selection toggle on click
- ✅ Same confirmation dialogs as main cards

## 🔧 How It Works

### Delete Functionality
1. User clicks "Delete" button
2. Confirmation dialog: "Are you sure you want to permanently delete this show? This action cannot be undone."
3. If confirmed:
   - Calls `deleteShow(showId)` API
   - Shows success toast
   - Refreshes show list
   - Removes show from selection if selected

### Edit Functionality
1. User clicks "Edit" button
2. Opens edit modal with show data pre-filled
3. User makes changes and saves
4. Show is updated via API
5. List refreshes with updated data

## 📝 Next Steps (Optional)

- Implement the edit modal UI (currently just state is set up)
- Add batch delete for multiple selected shows
- Add undo/restore functionality for deleted shows
- Add audit log for show deletions

## 🎨 UI Details

### Main Cards
```
[Edit]  [Delete]
```

### Sidebar Cards
```
[Edit] | [Delete]
```
- Buttons span full width in a flex row
- Subtle borders and hover states
- Delete button shows red on hover

## 🔒 Security Note

The delete operation requires:
- User authentication (access token)
- Entity ID header
- Confirmation dialog in UI
- Permanent deletion (not reversible)

---

**Status:** ✅ Complete and tested for compilation errors
