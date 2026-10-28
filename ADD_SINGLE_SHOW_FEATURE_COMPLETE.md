# Add Single Show Feature - Complete ✅

## Overview
Users can now manually add a single show to an existing tour with a simple 3-field form. The show will automatically use the same budget structure as existing shows in the tour.

## User Flow

### 1. Edit Tour Modal
- User clicks on a tour's "Edit" button
- Modal shows 3 options:
  1. **Add Shows from CSV** - Bulk import
  2. **Edit Tour Budget** - Manage budget
  3. **Add Single Show** - NEW! Manual single show entry

### 2. Confirmation Modal
When user clicks "Add Single Show", they see:
- 📋 **Budget Structure** - Explains the show will use the same budget template
- 💰 **Confirm Show Fee** - They'll need to enter the artist fee
- Buttons: Cancel / Continue

### 3. Single Show Form
User is taken to: `/import?tourId=...&tourName=...&mode=add-single-show`

**Form Fields:**
1. **📅 Show Date** - Date picker
2. **📍 Venue Name & Address** - Google Places Autocomplete (with fixed modal support!)
3. **💵 Artist Fee** - Number input with currency formatting

### 4. Submit & Redirect
When user clicks "Add Show":
1. Creates the show with venue coordinates
2. Creates budget using template from existing shows
3. Copies all line items from template
4. Recalculates tour distances
5. Shows success toast
6. **Redirects to `/tours`** where stats are updated

## Technical Implementation

### Files Modified:

1. **EditTourModal.tsx**
   - Added "Add Single Show" card
   - Added `AddShowModal` confirmation component
   - Routes to `/import?mode=add-single-show`

2. **page.tsx (import)**
   - Reads `mode` parameter from URL
   - Shows conditional heading: "Add Show to [Tour Name]"
   - Passes mode to ImportWizard

3. **ImportWizard.tsx**
   - Accepts `mode` prop
   - Skips directly to validation step for single show
   - Passes mode to Step3Validation

4. **Step3Validation.tsx**
   - Added `SingleShowForm` component
   - Conditional rendering based on mode
   - Form handles:
     - Show creation via `/api/shows`
     - Budget creation via `/api/budgets`
     - Line item copying from template
     - Distance recalculation
     - Navigation to `/tours`

### API Calls:

```typescript
// 1. Create Show
POST /api/shows
{
  tour_id, date, city, state, venue_name,
  venue_address, venue_lat, venue_lng,
  artist_fee, show_type
}

// 2. Fetch Budget Template
GET /api/budgets?tour_id=...

// 3. Create Budget
POST /api/budgets
{
  tour_id, show_id, artist_fee
}

// 4. Copy Line Items (multiple)
POST /api/budgets/line-items
{
  budget_id, category, description,
  type, amount, is_percentage, percentage_of
}

// 5. Recalculate Distances
POST /api/tours/{tourId}/calculate-distances
```

## Features

✅ **Simple 3-field form** - Date, Venue, Fee
✅ **Google Places integration** - With working modal support (onInteractOutside fix)
✅ **Budget template reuse** - Copies structure from existing shows
✅ **Automatic line items** - All expense/revenue items copied
✅ **Distance calculation** - Tour stats automatically updated
✅ **Clean UX** - Informative modals and confirmations
✅ **Redirect to tours** - User sees updated tour immediately

## Validation

- Date is required
- Venue must be selected from Google Places (ensures coordinates)
- Artist fee must be > 0
- Submit button disabled until all fields valid
- Loading state during submission

## Error Handling

- Toast notifications for success/error
- Console logging for debugging
- Try/catch around all API calls
- Graceful failure messages

## Testing Checklist

- [ ] Click "Add Single Show" in Edit Tour modal
- [ ] Confirmation modal shows budget structure info
- [ ] Form loads with 3 fields
- [ ] Date picker works
- [ ] Google Places dropdown works in modal (fixed!)
- [ ] Venue coordinates captured
- [ ] Artist fee accepts numbers
- [ ] Submit button disabled when fields empty
- [ ] Show created successfully
- [ ] Budget created with template
- [ ] Line items copied
- [ ] Distances recalculated
- [ ] Redirects to `/tours`
- [ ] Tour stats reflect new show
- [ ] New show visible in tour details

## Success Criteria

When complete, user should:
1. See the new show in the tour list
2. See updated tour statistics (total shows, revenue, miles)
3. See budget automatically created for the show
4. Be able to edit the show/budget normally

## Next Steps (Optional)

- [ ] Add show type selector (regular/off day/travel)
- [ ] Add capacity field
- [ ] Add notes field
- [ ] Add validation for duplicate dates
- [ ] Add preview before submit
- [ ] Add undo/rollback on error

---

**Status:** ✅ Ready for Testing
**Date:** April 4, 2026
