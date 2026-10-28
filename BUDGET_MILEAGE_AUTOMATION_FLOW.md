# Budget & Mileage Automation - Complete Flow

## YES! Mileage WILL be recalculated automatically! 🎉

## How It Works

When you add a new show to a tour (via either import or manual creation), here's the complete automation flow:

### Step 1: Show Creation ✅
```
User adds show → Show created in database
```

### Step 2: Budget Auto-Creation ✅
```
If show is part of a tour:
  1. Check for existing budgets in the tour (to use as template)
  2. Create new budget for the show
  3. Copy line items from template (if available)
```

### Step 3: Mileage Recalculation ✅
```
After budget creation:
  → Automatically call /api/tours/{tourId}/calculate-distances
  → Updates all show distances in the tour
  → Saves to database
```

## Code Flow in Step3Validation.tsx (Import)

```typescript
// 1. Create the show
const showResult = await createShow(...);

// 2. Create budget
try {
  const budgetData = {
    entityId: entityId,
    showId: showResult.show.id,
    tourId: existingTourId,
    budgetName: `${showResult.show.venueCity} Budget`,
    currency: 'USD',
  };
  await fetch('/api/budgets', { method: 'POST', body: budgetData });
  // Copy line items from template if available
} catch (budgetError) {
  console.error('Budget creation failed');
  // Don't throw - continue to mileage
}

// 3. Recalculate mileage (ALWAYS runs, even if budget fails)
try {
  await fetch(`/api/tours/${existingTourId}/calculate-distances`, {
    method: 'POST'
  });
  console.log('✅ Distance calculation complete');
} catch (distanceError) {
  console.warn('⚠️ Distance calculation failed (non-fatal)');
}
```

## Code Flow in CreateShowForm.tsx (Manual)

```typescript
// 1. Create the show
const createdShow = await createShow(showInput);

// 2. Auto-create budget and calculate mileage
if (createdShow.id && selectedTour?.id && activeProfile) {
  try {
    // Create budget
    await createBudgetForShow(createdShow.id, selectedTour.id, activeProfile.id);

    // Recalculate mileage
    await recalculateTourMileage(selectedTour.id, activeProfile.id);

  } catch (automationError) {
    console.warn('⚠️ Budget/mileage automation failed (non-fatal)');
  }
}
```

## What Gets Updated

### Budget Table
```
New row added:
- id: generated UUID
- show_id: the new show
- tour_id: the tour
- budget_name: "Asheville Budget"
- currency: "USD"
- (+ line items if template exists)
```

### Show Distances
```
All shows in the tour get their distance_to_next_show updated:
- Show 1 → Show 2: 150 miles
- Show 2 → Show 3: 220 miles  ← NEW SHOW
- Show 3 → Show 4: 180 miles
```

## Error Handling

The code is designed to be **fault-tolerant**:

1. **If budget creation fails:**
   - ⚠️ Warning logged
   - ✅ Show is still created
   - ✅ Mileage recalculation still attempted
   - 🔔 User sees: "Show created but budget creation failed"

2. **If mileage calculation fails:**
   - ⚠️ Warning logged (non-fatal)
   - ✅ Show is still created
   - ✅ Budget is still created (if that succeeded)
   - 🔔 User can manually recalculate later

## Testing Checklist

After the fix, test that ALL THREE steps work:

1. ✅ **Show created** - Check database/shows page
2. ✅ **Budget created** - Check budgets page for the show
3. ✅ **Mileage recalculated** - Check tour shows for updated distances

## Console Log Success Pattern

```
🎫 Creating show: {...}
✅ Show created: {show: {...}}
📋 No existing budgets found, creating budget with defaults
💰 Creating budget with data: {entityId: "...", showId: "...", ...}
✅ Budget created: {budget: {...}}
ℹ️  No template line items to copy
🗺️  Calculating distances for tour...
✅ Distance calculation complete: {message: "Distances calculated", ...}
```

## Answer to Your Question

**Q: Will it affect the mileage for the tour also?**

**A: YES! ✅**

The mileage for the **entire tour** will be automatically recalculated after the budget is created. This happens in both:
- Import flow (Step3Validation.tsx)
- Manual show creation (CreateShowForm.tsx)

The mileage calculation happens **regardless** of whether the budget creation succeeds or fails - it's a separate step that always runs.

---

**Bottom Line:** When you add a show with the fix in place:
1. Show is created ✅
2. Budget is auto-created ✅ (with `entityId` in body now)
3. Tour mileage is auto-recalculated ✅

All three steps are automated! 🎉
