# Create Show Button Fix

## Issue
When creating a show from a calendar event, the "Create Show" button was disabled even after filling in the required information.

## Root Cause
The submit button had a disabled condition that checked for `!selectedCounterparty`, which was always true when creating from a calendar event since counterparty selection is optional in that flow.

```tsx
// OLD CODE (Line 841)
disabled={isLoading || !selectedCounterparty}
```

## Solution

### 1. Fixed Button Disabled Logic
Updated the disabled condition to respect the `isCreatingForSelf` flag:

```tsx
// NEW CODE
disabled={isLoading || (!isCreatingForSelf && !selectedCounterparty)}
```

This allows the button to be enabled when:
- Creating from calendar event (`isCreatingForSelf` is true)
- OR when a counterparty has been selected

### 2. Made Set Length Optional for Calendar Events
To support progressive data entry:

**Type Definition Update** (`src/types/show.ts`):
```typescript
// Changed from:
setLength: string;
// To:
setLength?: string; // Optional for progressive data entry
```

**Form Field Update** (`CreateShowForm.tsx`):
- Changed `required` attribute to `required={!fromCalendarEvent}`
- Added helper text: "Can be filled in later"
- Defaults to 'TBD' if empty when creating from calendar

### 3. Submit Handler Update
Added default value for `setLength` when empty:

```typescript
setLength: formData.setLength || (fromCalendarEvent ? 'TBD' : ''),
```

## Testing
After this fix, users can:
1. Open a calendar event
2. Click "Add as a show"
3. Fill in minimal information (just the date is required now)
4. Click "Create Show" - button is now enabled
5. Show is created with placeholder values for empty fields

## Files Changed
- `/src/components/shows/CreateShowForm.tsx` (lines 532-542, 841-846, 217)
- `/src/types/show.ts` (line 78)

## Progressive Data Entry
This fix completes the progressive data entry feature for calendar-based show creation:
- **Show Date**: Required (auto-filled from calendar)
- **Venue fields**: Optional (can use Google Places or fill later)
- **Times**: Optional (default to 7PM doors, 8PM show)
- **Set Length**: Optional (defaults to 'TBD')
- **Contact fields**: Optional (defaults to 'TBD')
- **Financial details**: Deal type required (defaults to 'guarantee'), amounts optional
- **Counterparty**: Optional when creating from calendar event

Users can save the show immediately and complete the details later.
