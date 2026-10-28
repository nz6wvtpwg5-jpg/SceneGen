# FINAL FIX - Budget Creation 400 Error

## THE REAL PROBLEM

The Next.js API route middleware at `/src/app/api/budgets/route.ts` requires **`entityId` in the request body**, not just in headers!

## THE FIX

Added `entityId` to the request body in both files:

### Step3Validation.tsx
```typescript
const budgetData = {
  entityId: entityId,      // ← ADDED THIS!
  showId: showResult.show.id,
  tourId: existingTourId,
  budgetName: `${showResult.show.venueCity || 'Show'} Budget`,
  currency: 'USD',
};
```

### CreateShowForm.tsx
```typescript
const budgetData = {
  entityId: entityId,      // ← ADDED THIS!
  showId: showId,
  tourId: tourId,
  budgetName: `${formData.venueCity || 'Show'} Budget`,
  currency: 'USD',
};
```

## WHY THIS WAS THE ISSUE

The Next.js API route validates the request body:

```typescript
const { entityId, showId, tourId, budgetName } = body;  // ← Expects entityId in BODY

if (!entityId || !showId || !budgetName) {
  return NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'entityId, showId, and budgetName are required' } },
    { status: 400 }  // ← This was the 400 error!
  );
}
```

We were sending `X-Entity-Id` as a header but **NOT in the body**, so the validation failed.

## TEST NOW

1. Go to http://localhost:3000/import
2. Add a show to a tour
3. Should see:
   ```
   ✅ Show created
   💰 Creating budget with data: {...}
   ✅ Budget created
   ✅ Mileage recalculated
   ```

No more 400 errors! 🎉
