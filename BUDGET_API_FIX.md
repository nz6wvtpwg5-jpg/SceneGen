# Budget API Field Mapping Fix

## Problem Diagnosed

When attempting to auto-create budgets for new shows, the budget creation was failing with a **400 Bad Request** error. The console logs showed:

```
❌ Budget creation failed: {error: {…}}
POST http://localhost:3000/api/budgets 400 (Bad Request)
```

## Root Cause - TWO ISSUES FOUND

### Issue 1: Wrong Field Names
The frontend code was sending the wrong field names when calling `POST /api/budgets`:

**What Frontend Was Sending (WRONG ❌)**
```typescript
{
  show_id: showResult.show.id,  // snake_case
  tour_id: existingTourId,      // snake_case
  artist_fee: parseFloat(artistFee)  // doesn't exist!
}
```

**What Backend Requires (CORRECT ✅)**
```typescript
{
  showId: string,        // camelCase - REQUIRED
  budgetName: string,    // camelCase - REQUIRED
  tourId?: string,       // camelCase - optional
  currency?: string,     // optional
}
```

### Issue 2: Missing entityId in Request Body
The Next.js API route middleware at `/src/app/api/budgets/route.ts` requires `entityId` **in the request body**, not just in the headers!

**Next.js API Route Validation:**
```typescript
const { entityId, showId, tourId, budgetName, currency, notes } = body;

if (!entityId || !showId || !budgetName) {
  return NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'entityId, showId, and budgetName are required' } },
    { status: 400 }
  );
}
```

The frontend was only sending `X-Entity-Id` in headers but NOT in the body, causing the 400 error.

### Issue 3: Wrong Field Reference
Using `showResult.show.city` instead of `showResult.show.venueCity` (the show object uses `venueCity`, not `city`).

## Solution Implemented

### Files Changed

1. **`src/app/import/components/Step3Validation.tsx`**
2. **`src/components/shows/CreateShowForm.tsx`**

### Changes Made

Updated both files to:
1. Send correct camelCase field names
2. Include required `budgetName` field
3. **Include `entityId` in the request body**
4. Use correct field name `venueCity`

```typescript
// BEFORE (wrong)
const budgetData = {
  tour_id: existingTourId,
  show_id: showResult.show.id,
  artist_fee: parseFloat(artistFee),
};

// AFTER (correct)
const budgetData = {
  entityId: entityId,      // REQUIRED in body by Next.js API route! ✅
  showId: showResult.show.id,
  tourId: existingTourId,
  budgetName: `${showResult.show.venueCity || 'Show'} Budget`,
  currency: 'USD',
};
```

## API Flow

```
Frontend → Next.js API Route (/api/budgets) → Backend Express Server
```

**Next.js API Route Requirements:**
- `entityId` (body) - REQUIRED
- `showId` (body) - REQUIRED
- `budgetName` (body) - REQUIRED
- `tourId` (body) - optional
- `currency` (body) - optional
- `Authorization` (header)
- `X-Entity-Id` (header)

**Backend Express Server Requirements:**
- `showId` - REQUIRED
- `budgetName` - REQUIRED
- `tourId` - optional
- `currency` - optional (defaults to 'USD')

## Testing Instructions

1. **Test via Import Flow:**
   ```
   1. Go to http://localhost:3000/import
   2. Select a tour
   3. Import a show
   4. ✅ Budget should be created automatically
   5. ✅ Mileage should be recalculated
   ```

2. **Test via Manual Show Creation:**
   ```
   1. Go to Tours page
   2. Click "Add Show" on any tour
   3. Fill out the form and submit
   4. ✅ Budget should be created automatically
   5. ✅ Mileage should be recalculated
   ```

3. **Check Console Logs:**
   ```
   Expected success logs:
   ✅ Show created successfully
   💰 Creating budget with data: {...}
   ✅ Budget created automatically
   ✅ Line items copied from template (if template exists)
   ✅ Mileage recalculated for tour
   ```

## What Should Happen Now

When you add a new show (via import or manual creation):

1. ✅ Show is created in the database
2. ✅ Budget is auto-created with proper field names and `entityId` in body
3. ✅ If a template budget exists from another show in the tour, line items are copied
4. ✅ Mileage is automatically recalculated for the entire tour
5. ✅ User sees success message

## Status

✅ **FIXED** - Budget creation should now work correctly with:
- Correct camelCase field names
- Required `entityId` in request body
- Required `budgetName` field
- Correct `venueCity` field reference

Please test and confirm the fix works!
