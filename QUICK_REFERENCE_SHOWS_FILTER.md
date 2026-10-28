# Quick Reference: Upcoming vs Previous Shows Filter

## 🎯 What It Does
Filters the "Upcoming shows" section to display only future shows by default, with a dropdown to toggle to previous shows.

## 🚀 How to Use

### For Users
1. Navigate to `/shows` page
2. Right rail shows "Upcoming shows" by default (only future dates)
3. Click dropdown in header to select "Previous" to see past shows
4. Click dropdown again to switch back to "Upcoming"

### For Developers
```typescript
// State
const [showPreviousShows, setShowPreviousShows] = useState(false);

// Filter functions
const getUpcomingShows = (shows: Show[]): Show[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return shows.filter(show => new Date(show.showDate) >= today);
};

const getPreviousShows = (shows: Show[]): Show[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return shows.filter(show => new Date(show.showDate) < today);
};

// Computed shows
const railShows = showPreviousShows
  ? getPreviousShows(filteredShows)
  : getUpcomingShows(filteredShows);
```

## 📂 Files Changed
- `/src/app/shows/page.tsx` - Main implementation

## 📝 Documentation
- `UPCOMING_PREVIOUS_SHOWS_FILTER.md` - Full implementation guide
- `UPCOMING_PREVIOUS_SHOWS_VISUAL_GUIDE.md` - UI mockups and flows
- `TASK_COMPLETE_UPCOMING_PREVIOUS_FILTER.md` - Completion summary
- `ALL_TASKS_COMPLETE.md` - Comprehensive overview

## ✅ Features
- ✅ Date-based filtering (today = cutoff)
- ✅ Dropdown toggle (Upcoming ↔ Previous)
- ✅ Dynamic header and count
- ✅ Empty states for both views
- ✅ Works with all existing filters
- ✅ Preserves budget indicators
- ✅ Mobile responsive

## 🔍 Testing
```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3000/shows
# Verify:
# 1. "Upcoming shows" displays by default
# 2. Only future shows are shown
# 3. Dropdown switches to "Previous"
# 4. Only past shows are shown
# 5. Count updates correctly
# 6. Budget indicators work in both views
```

## 🐛 Troubleshooting

**Shows not filtering correctly?**
- Check show.showDate format (should be ISO 8601)
- Verify timezone handling
- Check browser console for errors

**Dropdown not appearing?**
- Ensure Google Calendar is connected
- Check showRightRail condition
- Verify responsive breakpoints

**Budget indicators missing?**
- Check budget.showId matches show.id
- Verify budgets are loaded
- Check useBudgets hook

## 📊 Related Features
- Budget indicators: `BUDGET_INDICATORS_ON_SHOWS.md`
- Show dates in bookkeeping: `BOOKKEEPING_SHOW_DATE_COLUMN.md`
- Google Calendar: `GOOGLE_CALENDAR_INTEGRATION.md`

## 🎉 Status
✅ Complete and deployed to GitHub (branch: Jon/Newstuff)

## 📌 Quick Links
- Code: `/src/app/shows/page.tsx`
- Docs: `UPCOMING_PREVIOUS_SHOWS_FILTER.md`
- Visual Guide: `UPCOMING_PREVIOUS_SHOWS_VISUAL_GUIDE.md`
- GitHub: https://github.com/SceneGenJD/scenegen.git
