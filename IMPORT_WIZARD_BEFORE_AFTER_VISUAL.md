# Import Wizard: Before & After Comparison 🎨

## Visual Changes Overview

### Before: All Shows Editable ❌
```
┌─────────────────────────────────────────────────────────┐
│ Venue Addresses                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ The Roxy Theatre                                    │ │
│ │ Los Angeles, CA • Wed, Jan 15, 2025                 │ │
│ │                                                      │ │
│ │ 🔍 [Search for The Roxy Theatre address...]        │ │ <- EDITABLE (Might be already saved!)
│ │                                                      │ │
│ │ [Mark as Off Day]  [Mark as Travel Day]             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ The Fillmore                                        │ │
│ │ San Francisco, CA • Thu, Jan 16, 2025               │ │
│ │                                                      │ │
│ │ 🔍 [Search for The Fillmore address...]            │ │ <- EDITABLE (New show)
│ │                                                      │ │
│ │ [Mark as Off Day]  [Mark as Travel Day]             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘

PROBLEM: Can't tell which shows are already in the tour!
         Risk of accidentally overwriting existing data.
```

---

### After: Smart Editing with Visual Indicators ✅
```
┌─────────────────────────────────────────────────────────┐
│ Venue Addresses                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ The Roxy Theatre  [✓ Already Saved]                │ │ <- BADGE INDICATOR
│ │ Los Angeles, CA • Wed, Jan 15, 2025                 │ │
│ │                                                      │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ 9009 Sunset Blvd, West Hollywood, CA 90069     │ │ │ <- READ-ONLY DISPLAY
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                      │ │
│ │          [Edit Address]                              │ │ <- EXPLICIT EDIT BUTTON
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ The Fillmore                                        │ │
│ │ San Francisco, CA • Thu, Jan 16, 2025               │ │
│ │                                                      │ │
│ │ 🔍 [Search for The Fillmore address...]            │ │ <- FULLY EDITABLE (New show)
│ │                                                      │ │
│ │ [Mark as Off Day]  [Mark as Travel Day]             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘

SOLUTION: Clear visual distinction!
          Accidental edits prevented by default.
          Intentional edits require clicking "Edit Address".
```

---

### After: Edit Mode Activated ✅
```
┌─────────────────────────────────────────────────────────┐
│ Venue Addresses                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ The Roxy Theatre  [✓ Already Saved]                │ │
│ │ Los Angeles, CA • Wed, Jan 15, 2025                 │ │
│ │                                                      │ │
│ │ 🔍 [9009 Sunset Blvd, West Hollywood, CA...]       │ │ <- NOW EDITABLE!
│ │                                                      │ │
│ │          [Cancel Edit]                               │ │ <- OPTION TO CANCEL
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘

USER CLICKED "Edit Address" - Now they can make intentional changes!
```

---

## Key UI/UX Improvements

### 1. Visual Hierarchy
```
Component                  Color/Style                      Purpose
────────────────────────────────────────────────────────────────────
"Already Saved" Badge      bg-semantic-success/20          Instant recognition
                          text-semantic-success
                          border-semantic-success/30

Address Display (locked)   bg-surface-elevated/30          Clearly read-only
                          border-border-subtle
                          text-text-secondary

Edit/Cancel Button         variant="outline"               Clear CTA
                          w-full (full width)
                          text-xs

New Show Container         bg-white/5                      Normal state
                          border-white/10
```

### 2. User Flow

#### Scenario A: Adding New Shows Only
1. User selects existing tour in import wizard
2. Shows in CSV that don't exist display as normal (editable)
3. User completes address entry for new shows
4. Import completes - only new shows added

#### Scenario B: Re-importing with Existing Shows
1. User selects existing tour in import wizard
2. Shows already in tour show "Already Saved" badge
3. Address inputs are read-only by default
4. User can add addresses for new shows
5. If user needs to fix existing show:
   - Click "Edit Address"
   - Make changes
   - Auto-save updates the show
   - Or click "Cancel Edit" to revert
6. Import completes - new shows added, edited shows updated

#### Scenario C: Pure Add Operation
1. User clicks "Edit Tour" → "Add Shows from CSV"
2. URL includes `?tourId=...` (tour pre-selected)
3. Import wizard loads existing shows from tour
4. User sees mix of saved (read-only) and new (editable) shows
5. Focused workflow: just add new shows!

---

## Design Tokens Used

### Badges
- `bg-semantic-success/20` - Success indicator background
- `text-semantic-success` - Success text color
- `border-semantic-success/30` - Success border

### Read-Only Display
- `bg-surface-elevated/30` - Elevated surface for disabled state
- `border-border-subtle` - Subtle border
- `text-text-secondary` - Secondary text color

### Containers
- `bg-white/5` - Light overlay for normal shows
- `border-white/10` - Subtle border for normal shows
- `bg-accent-blue/10` - Off day background
- `border-accent-blue/30` - Off day border
- `bg-accent-purple/10` - Travel day background
- `border-accent-purple/30` - Travel day border

---

## Benefits Summary

✅ **Data Integrity:** Prevents accidental overwrites of existing show data
✅ **Visual Clarity:** Instant recognition of saved vs. new shows
✅ **Intentional Editing:** Explicit user action required to edit saved shows
✅ **Preserved Functionality:** All existing features (auto-save, off days, etc.) still work
✅ **Better UX:** Clear workflow for adding shows to existing tours
✅ **Design System Compliance:** All new UI uses design tokens

---

## Code Highlights

### State Management
```typescript
// Track which already-saved shows are in edit mode
const [editableShows, setEditableShows] = useState<Record<number, boolean>>({});

// Toggle edit mode for individual shows
const handleToggleEdit = (showIndex: number) => {
  setEditableShows(prev => ({
    ...prev,
    [showIndex]: !prev[showIndex]
  }));
};
```

### Detection Logic
```typescript
// Check if show already exists in tour
const isAlreadySaved = isShowAlreadySaved(show, index);
// Check if user has enabled editing
const isEditable = editableShows[index] || false;
```

### Conditional Rendering
```typescript
{isRegularShow && (
  <>
    {isAlreadySaved && !isEditable ? (
      // READ-ONLY MODE: Show address + "Edit Address" button
      <div className="space-y-3">
        <div className="p-3 bg-surface-elevated/30 border border-border-subtle rounded-lg">
          <p className="text-sm text-text-secondary">
            {showAddresses[index]?.address || 'No address saved'}
          </p>
        </div>
        <Button onClick={() => handleToggleEdit(index)}>
          Edit Address
        </Button>
      </div>
    ) : (
      // EDIT MODE: Show PlacesAutocomplete + optional "Cancel Edit"
      <>
        <PlacesAutocomplete ... />
        {isAlreadySaved && isEditable && (
          <Button onClick={() => handleToggleEdit(index)}>
            Cancel Edit
          </Button>
        )}
      </>
    )}
  </>
)}
```

---

## Status: ✅ COMPLETE & DOCUMENTED
All visual improvements implemented, tested, and documented!
