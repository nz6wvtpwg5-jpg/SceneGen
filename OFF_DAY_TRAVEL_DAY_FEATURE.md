# Off Day and Travel Day Feature

## Overview
Added functionality to mark shows as "Off Day" or "Travel Day" during CSV import. When marked as such, the system automatically clears all income and expense line items except for fuel and hotel costs.

## Database Changes

### Migration: `add_show_type.sql`
Added a new `show_type` column to the `shows` table:
- **Type**: `VARCHAR(20)`
- **Default**: `'show'`
- **Allowed values**: `'show'`, `'off_day'`, `'travel_day'`
- **Index**: Created `idx_shows_show_type` for performance

```sql
ALTER TABLE shows
ADD COLUMN show_type VARCHAR(20) DEFAULT 'show'
CHECK (show_type IN ('show', 'off_day', 'travel_day'));

CREATE INDEX idx_shows_show_type ON shows(show_type);
```

## Frontend Changes

### `/src/app/import/components/Step3Validation.tsx`

#### New State
```typescript
const [showTypes, setShowTypes] = useState<Record<number, 'show' | 'off_day' | 'travel_day'>>({});
```

#### New Icons
- `Coffee` - for Off Day
- `Plane` - for Travel Day

#### New Handler
```typescript
const handleShowTypeChange = (showIndex: number, type: 'show' | 'off_day' | 'travel_day') => {
  setShowTypes(prev => ({
    ...prev,
    [showIndex]: type
  }));
};
```

#### UI Changes
Each venue card now includes:
1. **Regular Show State**:
   - Google Places Autocomplete for venue address
   - "Mark as Off Day" button (Coffee icon)
   - "Mark as Travel Day" button (Plane icon)

2. **Off Day State**:
   - Blue background (`bg-blue-50`)
   - Shows "Off Day" instead of venue name
   - Message: "☕ Day off - Only fuel & hotel costs will be included"
   - "Change Back to Regular Show" button

3. **Travel Day State**:
   - Purple background (`bg-purple-50`)
   - Shows "Travel Day" instead of venue name
   - Message: "✈️ Travel day - Only fuel & hotel costs will be included"
   - "Change Back to Regular Show" button

#### Budget Filtering Logic
```typescript
const updatedBudgets = importData.budgets.map((budget, index) => {
  const showType = showTypes[budget.showIndex] || 'show';

  if (showType === 'off_day' || showType === 'travel_day') {
    // Keep only fuel and hotel expenses
    const filteredLineItems = budget.lineItems.filter(item => {
      const category = item.category.toLowerCase();
      return category.includes('fuel') ||
             category.includes('gas') ||
             category.includes('hotel') ||
             category.includes('accommodation') ||
             category.includes('lodging');
    });

    return { ...budget, lineItems: filteredLineItems };
  }

  return budget;
});
```

## Backend Changes

### `/backend/server.js` - Import Endpoint

Updated the `POST /api/import/execute` endpoint to include `show_type`:

```javascript
INSERT INTO shows (
  entity_id, tour_id, date, city, state, country,
  venue_name, venue_address, venue_lat, venue_lng, fee, status, start_time, end_time, show_type
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
```

The `show_type` value is passed from the frontend:
```javascript
show.show_type || 'show' // Default to 'show' if not specified
```

## User Flow

1. **Import CSV**: User uploads a CSV file with show data
2. **Map Fields**: User maps CSV columns to SceneGen fields
3. **Validation & Addresses**: User enters venue addresses using Google Places
4. **Mark Special Days**:
   - Click "Mark as Off Day" for rest days
   - Click "Mark as Travel Day" for travel between venues
5. **Budget Auto-Filter**: System automatically removes all income/expenses except fuel & hotel
6. **Import**: Shows are created with the appropriate `show_type`

## Display Logic

Shows marked as off days or travel days will:
- ✅ Display with a special badge and icon
- ✅ Show descriptive text instead of venue name
- ✅ Use distinct background colors (blue for off, purple for travel)
- ✅ Only include fuel and hotel costs in budgets
- ✅ Be stored with `show_type` field in database

## Future Enhancements

Potential improvements:
- [ ] Allow editing show type after import
- [ ] Show off days and travel days in calendar view
- [ ] Different visualization on tour route map
- [ ] Statistics: "X shows, Y off days, Z travel days"
- [ ] Custom expense categories to keep for off/travel days
- [ ] Bulk mark multiple consecutive dates as off days

## Files Changed
- `/backend/migrations/add_show_type.sql` (new)
- `/backend/server.js` (import endpoint updated)
- `/src/app/import/components/Step3Validation.tsx` (UI and logic)

## Related Documentation
- [VENUE_ADDRESS_UPDATE_FIX.md](./VENUE_ADDRESS_UPDATE_FIX.md)
- [GOOGLE_CALENDAR_VENUE_FIELDS_COMPLETE.md](./GOOGLE_CALENDAR_VENUE_FIELDS_COMPLETE.md)
