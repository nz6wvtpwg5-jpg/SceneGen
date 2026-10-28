# Visual Guide: Upcoming vs Previous Shows Filter

## Feature Overview
This document provides a visual guide to the new upcoming/previous shows filter feature.

## UI Components

### 1. Right Rail Header (Upcoming Shows - Default)
```
┌─────────────────────────────────────────────┐
│ Upcoming shows              [Upcoming ▼]    │
│ 5 upcoming                                  │
└─────────────────────────────────────────────┘
```

### 2. Right Rail Header (Previous Shows)
```
┌─────────────────────────────────────────────┐
│ Previous shows              [Previous ▼]    │
│ 12 previous                                 │
└─────────────────────────────────────────────┘
```

### 3. Dropdown Menu
```
┌─────────────┐
│ Upcoming ✓  │  ← Currently selected
│ Previous    │
└─────────────┘

or

┌─────────────┐
│ Upcoming    │
│ Previous ✓  │  ← Currently selected
└─────────────┘
```

## Complete Show Card Example (Upcoming View)

```
┌──────────────────────────────────────────────┐
│ The Fillmore                    [confirmed] │
│ San Francisco, CA                           │
│ Fri, Dec 15                                 │
│                                             │
│ 💰 Budget Tracked                           │
│                                             │
│ Fees $2,500  Costs $800                     │
└──────────────────────────────────────────────┘
```

## Complete Show Card Example (Previous View)

```
┌──────────────────────────────────────────────┐
│ The Troubadour                  [confirmed] │
│ Los Angeles, CA                             │
│ Mon, Nov 20                                 │
│                                             │
│ 💰 Budget Tracked                           │
│                                             │
│ Fees $3,200  Costs $1,100                   │
└──────────────────────────────────────────────┘
```

## Empty States

### No Upcoming Shows
```
┌──────────────────────────────────────────────┐
│ Upcoming shows              [Upcoming ▼]    │
│ 0 upcoming                                  │
├──────────────────────────────────────────────┤
│                                             │
│        No upcoming shows scheduled          │
│                                             │
└──────────────────────────────────────────────┘
```

### No Previous Shows
```
┌──────────────────────────────────────────────┐
│ Previous shows              [Previous ▼]    │
│ 0 previous                                  │
├──────────────────────────────────────────────┤
│                                             │
│           No previous shows found           │
│                                             │
└──────────────────────────────────────────────┘
```

## User Interaction Flow

```
Step 1: User arrives at /shows page
        ↓
        Shows "Upcoming shows" by default
        ↓
        Displays only future shows (>= today)

Step 2: User clicks dropdown
        ↓
        Dropdown expands showing "Upcoming" and "Previous" options

Step 3: User selects "Previous"
        ↓
        Header updates to "Previous shows"
        ↓
        Show count updates
        ↓
        List refreshes to show only past shows

Step 4: User selects "Upcoming" again
        ↓
        Returns to upcoming shows view
```

## Date Filtering Logic

### Today = December 10, 2024

#### Upcoming Shows (>= Today)
- ✅ December 10, 2024 (Today)
- ✅ December 15, 2024
- ✅ December 25, 2024
- ✅ January 5, 2025
- ✅ March 15, 2025

#### Previous Shows (< Today)
- ✅ December 9, 2024
- ✅ December 1, 2024
- ✅ November 20, 2024
- ✅ October 15, 2024
- ✅ August 1, 2024

## Integration with Existing Filters

### Example: Status Filter + Date Filter
```
Status: "confirmed" + View: "Upcoming"
→ Shows only confirmed shows that are upcoming

Status: "cancelled" + View: "Previous"
→ Shows only cancelled shows from the past
```

### Example: Tour Filter + Date Filter
```
Tour: "Summer Tour 2024" + View: "Previous"
→ Shows only past shows from Summer Tour 2024

Tour: "Winter Tour 2024" + View: "Upcoming"
→ Shows only upcoming shows from Winter Tour 2024
```

### Example: Search + Date Filter
```
Search: "Los Angeles" + View: "Previous"
→ Shows only past shows in Los Angeles

Search: "The" + View: "Upcoming"
→ Shows only upcoming shows with "The" in venue name
```

## Responsive Behavior

### Desktop (>= 1024px)
- Dropdown appears in right rail header
- Full show cards with all details
- Sticky header for easy access

### Tablet (768px - 1023px)
- Dropdown appears in right rail header
- Compact show cards
- Scrollable list

### Mobile (< 768px)
- Right rail not visible (single column layout)
- Filter applies to main show list
- Dropdown appears in main header

## Accessibility Features

### Keyboard Navigation
- Tab: Navigate to dropdown
- Enter/Space: Open dropdown
- ↑/↓: Navigate options
- Enter: Select option
- Esc: Close dropdown

### Screen Reader Support
- Clear labels: "Upcoming" and "Previous"
- Announced count: "5 upcoming shows"
- Focus management maintained

### Visual Indicators
- ✓ Selected option marked
- Focus ring on dropdown
- Clear color contrast
- No color-only indicators

## Performance Notes

### Optimization
- Client-side filtering (no API calls)
- Instant view switching
- Minimal re-renders
- Efficient date comparison

### Memory Usage
- No data duplication
- Uses existing filteredShows array
- Lightweight date objects
- Small state footprint

## Browser Support

✅ Chrome (all versions)
✅ Firefox (all versions)
✅ Safari (all versions)
✅ Edge (all versions)
✅ Mobile browsers

## Color Scheme (Light/Dark Mode)

### Light Mode
- Background: White/Light gray
- Text: Dark gray/Black
- Border: Light gray
- Dropdown: White background
- Focus: Blue ring

### Dark Mode
- Background: Dark gray/Black
- Text: Light gray/White
- Border: Dark gray
- Dropdown: Dark background
- Focus: Blue ring

## Example Scenarios

### Scenario 1: Artist Planning Next Month
- Selects "Upcoming" (default)
- Views all future shows
- Plans preparation and travel

### Scenario 2: Artist Reviewing Past Performance
- Selects "Previous"
- Reviews past show budgets
- Analyzes profitability trends

### Scenario 3: Artist Managing Active Tour
- Uses status filter: "confirmed"
- Uses date filter: "Upcoming"
- Focuses on upcoming confirmed shows

### Scenario 4: Artist Checking Cancelled History
- Uses status filter: "cancelled"
- Uses date filter: "Previous"
- Reviews past cancellations

## Technical Implementation Summary

### Components Used
- React useState for toggle state
- Date object for comparisons
- Filter functions for show separation
- Conditional rendering for UI updates

### Data Flow
```
shows (all)
  ↓ (apply filters)
filteredShows
  ↓ (apply date filter)
railShows (upcoming OR previous)
  ↓ (render)
UI display
```

### State Management
```typescript
// Single boolean state
const [showPreviousShows, setShowPreviousShows] = useState(false);

// Computed value
const railShows = showPreviousShows
  ? getPreviousShows(filteredShows)
  : getUpcomingShows(filteredShows);
```

## Feature Highlights

🎯 **User-Friendly**: Simple dropdown, clear labels
⚡ **Fast**: Instant switching, no loading
🎨 **Consistent**: Matches existing UI patterns
♿ **Accessible**: Keyboard and screen reader support
📱 **Responsive**: Works on all devices
🔧 **Maintainable**: Clean code, well documented
🚀 **Performant**: Efficient filtering
✅ **Tested**: No errors, works as expected

## Related Features

- Budget indicators (maintained in both views)
- Status filters (apply to both views)
- Tour filters (apply to both views)
- Search functionality (works in both views)
- Google Calendar integration (unaffected)
- Show selection (works in both views)

---

**Status**: ✅ Complete and Deployed
**Version**: 1.0
**Last Updated**: December 2024
