# Upcoming vs Previous Shows Filter - Implementation Complete ✅

## Overview
Successfully implemented filtering to show only future shows in the "Upcoming shows" section, with a dropdown selector to toggle between upcoming and previous shows.

## Changes Made

### 1. State Management (`/src/app/shows/page.tsx`)
Added new state to track whether to show previous shows:
```typescript
const [showPreviousShows, setShowPreviousShows] = useState(false);
```

### 2. Date Filtering Helper Functions
Added two helper functions to filter shows by date:

```typescript
// Filter for upcoming shows (today and future)
const getUpcomingShows = (shows: Show[]): Show[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day
  return shows.filter(show => {
    const showDate = new Date(show.showDate);
    return showDate >= today;
  });
};

// Filter for previous shows (before today)
const getPreviousShows = (shows: Show[]): Show[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day
  return shows.filter(show => {
    const showDate = new Date(show.showDate);
    return showDate < today;
  });
};
```

### 3. Computed Rail Shows
Added logic to determine which shows to display based on the toggle:
```typescript
const railShows = showPreviousShows
  ? getPreviousShows(filteredShows)
  : getUpcomingShows(filteredShows);
```

### 4. Updated UI Header
Enhanced the right rail header to include:
- Dynamic title (changes between "Upcoming shows" and "Previous shows")
- Dynamic count based on filtered results
- Dropdown selector to toggle between upcoming and previous shows

```tsx
<div className="flex items-center justify-between">
  <div className="flex-1">
    <h2 className="text-sm font-semibold text-foreground">
      {showPreviousShows ? "Previous shows" : "Upcoming shows"}
    </h2>
    <p className="text-xs text-muted-foreground mt-0.5">
      {railShows.length} {statusFilter === "all"
        ? (showPreviousShows ? "previous" : "upcoming")
        : statusFilter.replace("_", " ")}
    </p>
  </div>
  <select
    value={showPreviousShows ? "previous" : "upcoming"}
    onChange={(e) => setShowPreviousShows(e.target.value === "previous")}
    className="text-xs px-2 py-1 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
  >
    <option value="upcoming">Upcoming</option>
    <option value="previous">Previous</option>
  </select>
</div>
```

### 5. Empty State Handling
Added appropriate empty state messages:
```tsx
{railShows.length === 0 ? (
  <div className="p-6 text-center text-sm text-muted-foreground">
    {showPreviousShows
      ? "No previous shows found"
      : "No upcoming shows scheduled"}
  </div>
) : (
  // Show cards...
)}
```

## Features

### ✅ Upcoming Shows (Default View)
- Shows only future shows (today and beyond)
- Displays count of upcoming shows
- Shows budget indicators if budgets are linked
- Displays "No upcoming shows scheduled" if no future shows exist

### ✅ Previous Shows
- Shows only past shows (before today)
- Displays count of previous shows
- Maintains all budget indicator functionality
- Shows "No previous shows found" if no past shows exist

### ✅ Seamless Integration
- Works with existing filters (status, tour, search)
- Maintains budget indicator display
- Preserves show selection functionality
- Respects existing UI/UX patterns

## User Flow
1. User views Shows page with Google Calendar connected
2. Right rail displays "Upcoming shows" by default
3. User can click dropdown to select "Previous" to view past shows
4. Rail updates to show only previous shows with updated title and count
5. User can switch back to "Upcoming" at any time

## Technical Details

### Date Comparison Logic
- Uses `new Date()` to get today's date
- Sets hours to 0:00:00 to ensure proper day-level comparison
- Show date parsed from `show.showDate` field (ISO 8601 format)
- Upcoming: `showDate >= today`
- Previous: `showDate < today`

### Performance
- Filtering happens in memory (no additional API calls)
- Uses existing `filteredShows` (already filtered by status, tour, search)
- Lightweight date parsing and comparison
- No impact on existing features

## Testing Checklist
- [x] Default view shows only upcoming shows
- [x] Dropdown toggles to previous shows
- [x] Empty states display correctly
- [x] Budget indicators work for both views
- [x] Show count updates correctly
- [x] Filters (status, tour, search) work with both views
- [x] No console errors
- [x] TypeScript compiles successfully

## Future Enhancements (Optional)
- Add date range selector (e.g., "Last 30 days", "Last 3 months")
- Add sorting options (date ascending/descending)
- Add "Show all" option to view both upcoming and previous together
- Add visual separator between past and future shows in combined view

## Related Documentation
- `BUDGET_INDICATORS_ON_SHOWS.md` - Budget display in show cards
- `BOOKKEEPING_SHOW_DATE_COLUMN.md` - Show date integration
- `GOOGLE_CALENDAR_INTEGRATION.md` - Calendar integration overview

## Status
✅ **COMPLETE** - Ready for user testing
