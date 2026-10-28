# Edit Show Modal Fix

## Issue
When clicking the "Edit" button on a show card (e.g., Rockefelle Oslo), nothing was happening. The modal was not appearing.

## Root Cause
The edit functionality had:
1. ✅ Correct state variables (`showEditModal`, `showToEdit`)  
2. ✅ Correct click handler (`handleEditShow`)
3. ❌ **Missing Edit Show Modal component in the JSX**

The state was being set, but there was no modal component rendering when `showEditModal` was true.

## Solution
Added the Edit Show Modal component to `/src/app/shows/page.tsx`:

```tsx
{/* Edit Show Modal */}
{showEditModal && showToEdit && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="panel-dark shadow-glow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b border-border-subtle">
        <h2 className="text-xl font-bold text-foreground">Edit Show</h2>
        <button
          onClick={() => {
            setShowEditModal(false);
            setShowToEdit(null);
          }}
          className="text-text-tertiary hover:text-foreground transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div className="p-6">
        <CreateShowForm
          show={showToEdit}
          onSuccess={() => {
            setShowEditModal(false);
            setShowToEdit(null);
            refetchShows();
          }}
          onCancel={() => {
            setShowEditModal(false);
            setShowToEdit(null);
          }}
        />
      </div>
    </div>
  </div>
)}
```

## Additional Fixes
1. **JSX Structure Fix**: Fixed missing closing tags for fragments and ternary operators
2. **Google Calendar Auth Fix**: Changed expired modal redirect from `/api/calendar/auth` to `/api/calendar/connect`

## How It Works
1. User clicks "Edit" on a show card
2. `handleEditShow(show)` sets `showToEdit` to the selected show and `showEditModal` to `true`
3. The modal renders with the `CreateShowForm` component in edit mode (via the `show` prop)
4. The form pre-populates with the existing show data
5. On success, the modal closes and the shows list refreshes via `refetchShows()`

## Testing
✅ Click "Edit" on any show card → modal opens with pre-filled data  
✅ Click close button or Cancel → modal closes without changes  
✅ Edit show details and save → modal closes and list updates  
✅ Delete button still works  

## Status
✅ **Complete** - Edit functionality now fully operational
