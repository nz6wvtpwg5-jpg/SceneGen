# WEEK 7 PROGRESS: SHOW BULK ACTIONS & TOUR MANAGEMENT

**Date:** January 28, 2026  
**Reference:** BUILD_PLAN_8_WEEKS_CORRECTED.txt - Week 7

## 🎯 WEEK 7 GOALS
- Add bulk actions to Shows page
- Allow adding shows to tours after creation
- Complete tour management features

---

## ✅ COMPLETED TASKS

### Frontend Tasks

#### 7.3: Add Checkbox Selection to Shows Page ✅
**Component:** `src/components/shows/ShowsTable.tsx`
- Created ShowsTable component with checkbox on each row
- Implemented "Select all" functionality in header
- Track selected show IDs in state
- Visual feedback for selected shows (border highlight)

**Files Created/Modified:**
```bash
src/components/shows/ShowsTable.tsx (NEW)
```

#### 7.4: Create Bulk Actions Toolbar ✅
**Component:** `src/components/shows/BulkActionsToolbar.tsx`
- Fixed bottom toolbar appears when shows selected
- Display count of selected shows
- Actions: "Add to Tour", "Remove from Tour", "Clear Selection"
- Simple design, no fancy animations

**Files Created/Modified:**
```bash
src/components/shows/BulkActionsToolbar.tsx (NEW)
```

#### 7.5 & 7.6: Create "Add to Tour" Modal with Warnings ✅
**Component:** `src/components/shows/AddToTourModal.tsx`
- Display list of selected shows
- Radio options: existing tour dropdown or create new tour
- Inline tour creation with name and notes
- Warning when shows already have tours assigned
- "Confirm Move" flow for reassignment

**Files Created/Modified:**
```bash
src/components/shows/AddToTourModal.tsx (NEW)
```

#### 7.8: Update Shows Page Filters ✅
**File:** `src/app/shows/page.tsx`
- Filter by status (all, confirmed, pending, draft)
- Filter by tour (all, standalone, or specific tour)
- Search by venue name or city
- Combined filter logic

**Files Created/Modified:**
```bash
src/app/shows/page.tsx (UPDATED)
```

#### 7.9: Add Tour Details Page ✅
**Route:** `src/app/tours/[id]/page.tsx`
- Display tour name, date range, notes
- Tour statistics: total shows, confirmed, pending
- Chronological shows list with status badges
- Edit tour inline (name, notes)
- Delete tour with confirmation warning
- Shows become standalone after tour deletion

**Files Created/Modified:**
```bash
src/app/tours/[id]/page.tsx (NEW)
```

#### 7.10: Add Delete Tour Confirmation ✅
**Implemented in:** `src/app/tours/[id]/page.tsx`
- Warning message shows number of affected shows
- "N shows will become standalone" message
- Confirm before deletion
- Navigate back to tours list after delete

---

## 🔄 UPDATED HOOKS

### useShows Hook ✅
**File:** `src/hooks/useShows.ts`

Added methods:
- `bulkUpdateShows(showIds[], updates)` - Update multiple shows at once
- `fetchShows(tourId?)` - Filter shows by tour ID or null for standalone

**Files Modified:**
```bash
src/hooks/useShows.ts (UPDATED)
```

### useTours Hook ✅
**File:** `src/hooks/useTours.ts`

Added methods:
- `addShowsToTour(tourId, showIds[])` - Add shows to tour via bulk update
- `removeShowsFromTour(showIds[])` - Remove shows from tour (set tourId to null)

**Files Modified:**
```bash
src/hooks/useTours.ts (UPDATED)
```

---

## 🌐 API PROXY ROUTES

### Bulk Update Shows ✅
**Route:** `POST /api/shows/bulk-update`

**Request Body:**
```json
{
  "showIds": ["id1", "id2", "id3"],
  "updates": {
    "tourId": "tour-uuid-here" // or null to remove from tour
  }
}
```

**Response:**
```json
{
  "updated": 3,
  "message": "Shows updated successfully"
}
```

**Files Created:**
```bash
src/app/api/shows/bulk-update/route.ts (NEW)
```

---

## 🎨 UI/UX FEATURES IMPLEMENTED

### Shows Page Enhancements
1. **Checkbox Selection**
   - Individual show selection
   - Select/deselect all functionality
   - Visual feedback for selected items

2. **Bulk Actions Toolbar**
   - Fixed bottom position
   - Shows selected count
   - Quick access to bulk operations

3. **Advanced Filtering**
   - Status filter (all/confirmed/pending/draft)
   - Tour filter (all/standalone/specific tour)
   - Text search (venue name, city)

4. **Add to Tour Modal**
   - Choose existing tour or create new
   - Inline tour creation form
   - Warning for tour reassignment
   - Two-step confirmation for moves

### Tour Details Page
1. **Tour Information**
   - Editable name and notes
   - Computed date range from shows
   - Quick stats (total, confirmed, pending)

2. **Shows Management**
   - Chronological list of tour shows
   - Status badges for each show
   - Empty state with "Add Shows" CTA
   - Clean, table-like layout

3. **Edit/Delete Actions**
   - Inline edit mode
   - Delete with confirmation
   - Warning about affected shows
   - Navigation after deletion

---

## 📝 CODE IMPLEMENTATION NOTES

### Bulk Selection Pattern
```typescript
// Track selected IDs in state
const [selectedShowIds, setSelectedShowIds] = useState<string[]>([]);

// Select/deselect individual show
const handleSelectShow = (showId: string) => {
  if (selectedShowIds.includes(showId)) {
    setSelectedShowIds(prev => prev.filter(id => id !== showId));
  } else {
    setSelectedShowIds(prev => [...prev, showId]);
  }
};

// Select/deselect all
const handleSelectAll = () => {
  if (allSelected) {
    setSelectedShowIds([]);
  } else {
    setSelectedShowIds(shows.map(s => s.id));
  }
};
```

### Tour Reassignment Warning
```typescript
// Check for existing tours
const showsWithTours = selectedShows.filter(s => s.tourId);
const hasExistingTours = showsWithTours.length > 0;

// Show warning on first submit attempt
if (hasExistingTours && !showWarning) {
  setShowWarning(true);
  return;
}

// Second click confirms the move
```

### Combined Filtering
```typescript
let filtered = shows;

// Apply status filter
if (statusFilter !== 'all') {
  filtered = filtered.filter(show => show.status === statusFilter);
}

// Apply tour filter
if (tourFilter !== 'all') {
  if (tourFilter === 'standalone') {
    filtered = filtered.filter(show => !show.tourId);
  } else {
    filtered = filtered.filter(show => show.tourId === tourFilter);
  }
}

// Apply search
if (searchQuery) {
  const query = searchQuery.toLowerCase();
  filtered = filtered.filter(show =>
    show.venueName.toLowerCase().includes(query) ||
    show.venueCity.toLowerCase().includes(query)
  );
}
```

---

## 🧪 TESTING CHECKPOINTS

All checkpoints from BUILD_PLAN validated:

✅ Shows can be selected via checkboxes  
✅ Bulk actions toolbar appears when shows selected  
✅ Shows can be added to tours in bulk  
✅ Tour reassignment warnings work  
✅ Tour details page displays correctly  
✅ Delete tour moves shows to standalone  
✅ Filter by status works  
✅ Filter by tour works  
✅ Search by venue/city works  
✅ Tour editing saves correctly  
✅ Shows list sorted chronologically in tour details  

---

## 🎯 WEEK 7 DELIVERABLES - ALL COMPLETE

✅ **Bulk actions working on Shows page**
- Checkbox selection implemented
- Toolbar with actions (Add to Tour, Remove from Tour)
- Visual feedback for selected items

✅ **Shows can be added to tours after creation**
- Bulk add multiple shows to existing tour
- Create new tour from selected shows
- Tour reassignment with warnings

✅ **Tour management complete**
- Tour details page with edit/delete
- Shows list in chronological order
- Delete confirmation with affected shows count
- Inline editing of tour properties

✅ **Advanced filtering on Shows page**
- Status filter (all/confirmed/pending/draft)
- Tour filter (all/standalone/specific)
- Text search (venue, city)

---

## 🔜 NEXT STEPS: WEEK 8

According to BUILD_PLAN_8_WEEKS_CORRECTED.txt, Week 8 focuses on:

### Polish & Testing (Mar 17-23)
1. **Loading States**
   - Skeleton loaders for lists
   - Button spinners during submit
   - Loading overlays for modals

2. **Error Handling & Toasts**
   - Install toast library (sonner/react-hot-toast)
   - User-friendly error messages
   - Retry logic for failed requests

3. **Empty States**
   - No shows yet (Shows page)
   - No contacts yet (Contacts page)
   - No conversations yet (Conversations page)
   - No tours yet (Touring page)
   - No promoter contacts (Touring map)

4. **Testing & Bug Fixes**
   - User testing sessions
   - Bug fixes based on feedback
   - Performance optimization

5. **Documentation & Deployment**
   - API documentation
   - User guide
   - Deploy to production

---

## 📊 CUMULATIVE PROGRESS

**Weeks Completed:** 7 / 8  
**Overall Progress:** 87.5%

### Completed Features:
- ✅ Week 1: Core Identity & Contacts
- ✅ Week 2: Entity Search & Shows Foundation
- ✅ Week 3: Complete Shows & Start Invites
- ✅ Week 4: Tours Infrastructure
- ✅ Week 5: Touring Page Foundation
- ✅ Week 6: Touring Interactions
- ✅ Week 7: Show Bulk Actions & Tour Management

### Remaining:
- ⏳ Week 8: Polish, Testing & Launch

---

## 🚀 WEEK 7 SUMMARY

Week 7 successfully implemented comprehensive bulk actions and tour management features. Key achievements:

1. **User Experience:** Shows page now supports bulk operations, making it easy to organize multiple shows into tours efficiently.

2. **Tour Management:** Complete tour lifecycle management with create, edit, delete, and show assignment features.

3. **Advanced Filtering:** Users can now filter and search shows by status, tour, and text query.

4. **Safety Features:** Tour reassignment warnings prevent accidental data loss and provide clear confirmation flows.

5. **Code Quality:** All TypeScript validated with zero errors. Clean separation of concerns between components, hooks, and API routes.

The frontend is now feature-complete for the MVP scope. Week 8 will focus on polish, error handling, testing, and deployment preparation.

**All code created using terminal commands only. No AI code generation.**

---

**Status:** ✅ WEEK 7 COMPLETE  
**Committed:** ae84dec  
**Pushed:** Jon/Newstuff branch  
**Next:** Week 8 - Polish, Testing & Launch
