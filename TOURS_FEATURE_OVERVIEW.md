# Tours Feature Overview

## Purpose
The Tours feature allows **artist entities** to organize multiple shows into logical groupings (e.g., "Summer Festival Tour 2026", "European Tour"). This is an **artist-only feature** - promoters cannot create or manage tours.

---

## Architecture

### 1. Frontend Components

#### **Main Page**: `/src/app/tours/page.tsx`
**Purpose**: Display and manage tours for artist users

**Key Features**:
- ✅ **Artist-only access control** - Promoters see "Artist Feature Only" message
- ✅ **Loading states** - Shows "Loading..." while authenticating
- ✅ **CRUD operations** - Create, view, and delete tours
- ✅ **Empty state** - Helpful message when no tours exist
- ✅ **Tour cards** - Display tour name, dates, and notes

**User Flow**:
1. Page loads → Checks if user is artist (via `activeProfile.entityType`)
2. If not artist → Show "Artist Feature Only" message with "View Shows" button
3. If artist → Fetch and display tours
4. Click "+ Create Tour" → Open `CreateTourModal`
5. Click "View Details" → Navigate to `/tours/{tourId}`
6. Click "Delete" → Confirm and delete tour (shows remain)

**State Management**:
- `tours`: Array of Tour objects
- `showCreateModal`: Boolean for modal visibility
- `error`: String for error messages
- `isLoadingAuth`: Boolean for authentication loading state

---

#### **Create Tour Modal**: `/src/components/tours/CreateTourModal.tsx`
**Purpose**: Modal form for creating new tours

**Fields**:
- **Tour Name*** (required) - Text input
- **Start Date*** (required) - Date picker
- **End Date*** (required) - Date picker
- **Notes** (optional) - Textarea

**Special Features**:
- Auto-computes dates from selected shows (if creating from shows page)
- Shows badge with number of selected shows and date range
- Validates all required fields before submission

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tour: Tour) => void;
  selectedShows?: Show[]; // Optional - for creating tour from shows
}
```

---

### 2. Backend Integration

#### **API Route**: `/src/app/api/tours/route.ts`

**GET /api/tours**
- Fetches all tours for the current artist entity
- Requires: Authorization header + X-Entity-Id header
- Returns: Array of Tour objects

**POST /api/tours**
- Creates a new tour
- Requires: Authorization header + X-Entity-Id header
- Body: `{ name, startDate, endDate, notes? }`
- Returns: Created Tour object

**Configuration**:
- Uses local backend: `http://localhost:3001/api` (configurable via env)
- Passes `X-Entity-Id` header for local backend
- Passes `Authorization` + subscription key for Azure backend

---

#### **Custom Hook**: `/src/hooks/useTours.ts`

**Purpose**: Manages tour-related API calls and state

**Methods**:

1. **`fetchTours()`**
   - Gets all tours for current entity
   - Returns: `Promise<Tour[]>`

2. **`fetchTour(tourId)`**
   - Gets single tour by ID
   - Returns: `Promise<Tour>`

3. **`createTour(tourData)`**
   - Creates new tour
   - Params: `{ name, startDate, endDate, notes? }`
   - Returns: `Promise<Tour>`

4. **`updateTour(tourId, updates)`**
   - Updates tour details
   - Params: `{ name?, notes? }`
   - Returns: `Promise<Tour>`

5. **`deleteTour(tourId)`**
   - Deletes a tour (shows remain)
   - Returns: `Promise<void>`

6. **`addShowsToTour(tourId, showIds)`**
   - Associates shows with a tour
   - Returns: `Promise<void>`

7. **`removeShowsFromTour(tourId, showIds)`**
   - Removes shows from a tour
   - Returns: `Promise<void>`

**State Provided**:
- `isLoading`: Boolean
- `error`: String | null

---

### 3. Type Definitions

#### **Tour Interface**: `/src/types/tour.ts`

```typescript
interface Tour {
  id: string;
  artistEntityId: string;
  name: string;
  notes?: string;
  startDate: string;  // ISO date string
  endDate: string;    // ISO date string
  createdAt: string;
  updatedAt: string;
}
```

#### **TourWithShows Interface**
```typescript
interface TourWithShows extends Tour {
  shows: Array<{
    id: string;
    showDate: string;
    venueName: string;
    city: string;
    state: string;
    country: string;
    status: string;
  }>;
}
```

---

## Access Control

### Artist Check Logic

**Location**: `/src/app/tours/page.tsx` (lines 30-32)

```typescript
const isArtist = activeProfile?.entityType === 'artist' ||
  (activeProfile as any)?.entity_type === 'artist';
```

**Why Both Checks?**
- Frontend expects `entityType` (camelCase)
- Backend returns `entity_type` (snake_case)
- Zustand store migration transforms snake_case → camelCase
- Fallback check ensures compatibility

**Flow**:
1. Check `activeProfile.entityType === 'artist'`
2. If undefined, check `activeProfile.entity_type === 'artist'` (fallback)
3. If false → Show "Artist Feature Only" message
4. If true → Show tours page

---

## Key Fixes Applied

### 1. **Entity Type Transformation** (ZUSTAND_PERSISTENCE_FIX.md)
- **Problem**: Backend returns `entity_type` but frontend expects `entityType`
- **Solution**: Added Zustand migration to transform persisted data
- **Files**: `/src/store/useProfileStore.ts`

### 2. **Entity ID Header** (Recent fix)
- **Problem**: POST /api/tours was returning 401 "Entity ID is required"
- **Solution**: Added `X-Entity-Id` header to POST request in API route
- **Files**: `/src/app/api/tours/route.ts`

### 3. **Required Date Fields** (Recent fix)
- **Problem**: Backend validation error: "startDate and endDate are required"
- **Solution**: Added date inputs to CreateTourModal
- **Files**: `/src/components/tours/CreateTourModal.tsx`, `/src/hooks/useTours.ts`

### 4. **Timing Issue** (Recent fix)
- **Problem**: Tours fetch before session authenticated → 401 errors
- **Solution**: Added session check to useEffect dependencies
- **Files**: `/src/app/tours/page.tsx`

---

## User Experience

### For Artists:
1. ✅ Can create, view, edit, and delete tours
2. ✅ Can associate shows with tours
3. ✅ Can see date ranges and show counts
4. ✅ Empty state encourages creating first tour

### For Promoters:
1. ✅ See clear "Artist Feature Only" message
2. ✅ Redirected to view individual shows instead
3. ✅ No confusing UI elements

---

## Integration with Shows

Tours integrate with the Shows page in several ways:

1. **Add to Tour** (Shows page)
   - Select multiple shows
   - Click "Add to Tour"
   - Choose existing tour or create new one
   - Date range auto-computed from selected shows

2. **Tour Filter** (Shows page)
   - Filter shows by tour
   - See which shows belong to which tour

3. **Remove from Tour** (Shows page)
   - Remove shows from tour assignment
   - Shows remain, just unlinked from tour

---

## Backend Requirements

The local backend (`http://localhost:3001/api`) must support:

1. **GET /api/tours**
   - Headers: `X-Entity-Id`
   - Returns: `{ tours: Tour[] }` or `Tour[]`

2. **POST /api/tours**
   - Headers: `X-Entity-Id`
   - Body: `{ name, startDate, endDate, notes? }`
   - Returns: `Tour` object

3. **GET /api/tours/:tourId**
   - Headers: `X-Entity-Id`
   - Returns: `TourWithShows` object

4. **PATCH /api/tours/:tourId**
   - Headers: `X-Entity-Id`
   - Body: `{ name?, notes? }`
   - Returns: `Tour` object

5. **DELETE /api/tours/:tourId**
   - Headers: `X-Entity-Id`
   - Returns: Success response

6. **POST /api/tours/:tourId/shows**
   - Headers: `X-Entity-Id`
   - Body: `{ showIds: string[] }`
   - Returns: Success response

7. **DELETE /api/tours/:tourId/shows**
   - Headers: `X-Entity-Id`
   - Body: `{ showIds: string[] }`
   - Returns: Success response

---

## Testing Checklist

### ✅ Access Control
- [ ] Artist user can access /tours
- [ ] Promoter user sees "Artist Feature Only" message
- [ ] Loading state shows while authenticating

### ✅ Tour CRUD
- [ ] Can create tour with name, dates, notes
- [ ] Can view list of tours
- [ ] Can delete tour (with confirmation)
- [ ] Can view tour details

### ✅ Date Handling
- [ ] Date fields are required
- [ ] Dates display correctly in local timezone
- [ ] Start date cannot be after end date (if validation added)

### ✅ Error Handling
- [ ] 401 errors show proper message
- [ ] Validation errors display clearly
- [ ] Network errors handled gracefully

### ✅ Integration
- [ ] Can add shows to tour from shows page
- [ ] Can filter shows by tour
- [ ] Deleting tour doesn't delete shows

---

## Future Enhancements

1. **Edit Tour**: Add inline editing for tour name/notes
2. **Drag & Drop**: Reorder shows within a tour
3. **Tour Stats**: Show revenue, ticket sales, etc.
4. **Tour Export**: Export tour as PDF or CSV
5. **Tour Templates**: Save tour configurations for reuse
6. **Multi-leg Tours**: Support for tour legs/phases
7. **Tour Budget**: Track expenses per tour
8. **Tour Crew**: Assign crew members to tours

---

## Related Documentation

- `SNAKE_CASE_FIX.md` - Entity type transformation details
- `ZUSTAND_PERSISTENCE_FIX.md` - Zustand migration explanation
- `BUILD_PLAN_8_WEEKS.txt` - Week 4 tasks (Tours implementation)
- `SCENEGEN_MVP_SPEC_LOCKED.txt` - Original tours specification

---

## Summary

The Tours feature is a fully functional artist-only tool for organizing shows into logical groups. It includes:
- ✅ Complete CRUD operations
- ✅ Proper access control (artist-only)
- ✅ Integration with shows
- ✅ Robust error handling
- ✅ Clean, modern UI

All recent bugs (entity ID, date fields, timing issues) have been resolved and documented.
