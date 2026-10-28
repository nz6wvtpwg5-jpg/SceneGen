# Infinite Loop Bug - FOUND!

**Date:** February 25, 2026
**Status:** 🔴 CRITICAL BUG IDENTIFIED

---

## The Problem

Infinite 401 errors on: `d5d67ff2-559e-47c5-ac99-f2278705f4e3`

```
GET /api/tours/d5d67ff2-559e-47c5-ac99-f2278705f4e3 (REPEATING FOREVER)
GET /api/shows?tourId=d5d67ff2-559e-47c5-ac99-f2278705f4e3&entityId=...
```

## Root Cause

**The entity ID is being used as a tour ID!**

### How It Happens

1. User navigates to `/tours/d5d67ff2-559e-47c5-ac99-f2278705f4e3`
2. The tour detail page (`/src/app/tours/[id]/page.tsx`) loads
3. It calls `fetchTour(tourId)` where `tourId = "d5d67ff2-559e-47c5-ac99-f2278705f4e3"`
4. The backend receives: `GET /api/tours/d5d67ff2-559e-47c5-ac99-f2278705f4e3`
5. Backend returns 401 because this isn't a valid tour ID
6. The page keeps retrying because of useEffect dependencies
7. **INFINITE LOOP**

### The Code

**File:** `/src/app/tours/[id]/page.tsx` (lines 41-47)

```typescript
useEffect(() => {
  const loadTourData = async () => {
    try {
      const [tourData, showsData] = await Promise.all([
        fetchTour(tourId),  // ← tourId is the entity ID!
        fetchShows(tourId)
      ]);
```

### Why Is Entity ID in the URL?

Somewhere in the code, a navigation is happening to `/tours/{entityId}` instead of `/tours/{actualTourId}`.

Possible causes:
1. A bug in `handleViewTour()` function
2. A link/button that uses entity ID instead of tour ID
3. localStorage corruption
4. Default navigation using wrong ID

---

## The Fix

### Option 1: Add Validation (Quick Fix)

Add UUID format validation in the tour detail page:

```typescript
useEffect(() => {
  // Validate that tourId looks like a tour ID, not an entity ID
  if (!tourId || tourId === getEntityId()) {
    router.push('/tours'); // Redirect back to tours list
    return;
  }

  loadTourData();
}, [isCheckingEntities, tourId]);
```

### Option 2: Find the Source (Proper Fix)

1. Check all calls to `router.push('/tours/...')`
2. Check all `<Link href="/tours/...">` components
3. Verify tour creation returns correct tour ID
4. Check if any code accidentally uses entity ID as tour ID

---

## Immediate Action Required

**STOP THE INFINITE LOOP:**

1. Navigate away from `/tours/d5d67ff2-559e-47c5-ac99-f2278705f4e3`
2. Go to `/tours` (tours list page)
3. Clear browser cache/localStorage if needed

**Then:** Apply one of the fixes above

---

## Backend Evidence

```bash
[2026-02-25T23:11:05.884Z] GET /api/tours/d5d67ff2-559e-47c5-ac99-f2278705f4e3
[2026-02-25T23:11:06.082Z] GET /api/tours/d5d67ff2-559e-47c5-ac99-f2278705f4e3
[2026-02-25T23:11:06.282Z] GET /api/tours/d5d67ff2-559e-47c5-ac99-f2278705f4e3
[2026-02-25T23:11:06.537Z] GET /api/tours/d5d67ff2-559e-47c5-ac99-f2278705f4e3
[2026-02-25T23:11:06.866Z] GET /api/tours/d5d67ff2-559e-47c5-ac99-f2278705f4e3
...continues forever...
```

All returning 401 because `d5d67ff2-559e-47c5-ac99-f2278705f4e3` is NOT a tour ID - it's your entity ID!

---

## Next Steps

1. **Navigate to `/shows` or `/dashboard`** to stop the loop
2. **Apply the validation fix** to prevent this from happening again
3. **Find why entity ID ended up in tour URL** (investigate navigation code)
4. **Test:** Try creating a real tour and viewing it
