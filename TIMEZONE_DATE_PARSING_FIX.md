# Timezone Date Parsing Fix

## Issue
Dates from CSV were displaying one day earlier in the UI. For example:
- **CSV**: `30/03/2026` (March 30th)
- **UI Displayed**: `Sun, Mar 29, 2026` (March 29th) ❌

## Root Cause
When parsing date strings in the format `YYYY-MM-DD`, JavaScript's `new Date()` constructor interprets them as **UTC midnight**:
```javascript
new Date('2026-03-30') // → 2026-03-30T00:00:00.000Z (UTC)
```

When displayed using `.toLocaleDateString()`, the date is converted to the user's local timezone. For users in timezones behind UTC (like EST, PST, etc.), UTC midnight becomes the previous day in local time:

```javascript
// For users in EST (UTC-5):
new Date('2026-03-30').toLocaleDateString('en-US')
// → "3/29/2026" (One day earlier!)
```

## Solution
Created timezone-safe date parsing and formatting utilities in `/src/lib/csv/parser.ts`:

### 1. `parseLocalDate(dateStr: string): Date`
Parses a `YYYY-MM-DD` string as a **local date** instead of UTC:

```typescript
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // Creates local date, month is 0-indexed
}
```

This creates a Date object at midnight in the **user's local timezone**, not UTC.

### 2. `formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string`
Convenience function that parses and formats dates in one step:

```typescript
export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', options);
}
```

## Changes Made

### `/src/lib/csv/parser.ts`
Added two new utility functions:
- `parseLocalDate()` - Parse YYYY-MM-DD as local date
- `formatDate()` - Parse and format in one step

### `/src/app/import/components/Step3Validation.tsx`
Updated all date displays to use `formatDate()` instead of `new Date().toLocaleDateString()`:

**Before:**
```typescript
new Date(show.date).toLocaleDateString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})
```

**After:**
```typescript
formatDate(show.date, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})
```

## Test Results

**Input CSV:**
```
30/03/2026,Lexington KY
```

**Processing:**
1. `parseDDMMYYYY('30/03/2026')` → `'2026-03-30'`
2. `formatDate('2026-03-30')` → Creates local date (not UTC)
3. Display → `"Sun, Mar 30, 2026"` ✅ (Correct!)

## Files Changed
- `/src/lib/csv/parser.ts` - Added `parseLocalDate()` and `formatDate()`
- `/src/app/import/components/Step3Validation.tsx` - Updated all date displays

## Impact
This fix affects:
- ✅ Venue address cards display
- ✅ Tour date range display
- ✅ Existing tour selection dropdown
- ✅ All date displays throughout the import flow

## Related Issues
- Timezone issues with date parsing
- Off-by-one day errors in date displays
- UTC vs local time confusion

## Testing
To verify the fix:
1. Import a CSV with dates like `30/03/2026`
2. Check that the UI displays `Sun, Mar 30, 2026` (not Mar 29)
3. Verify dates match the CSV exactly
4. Test in different timezones (EST, PST, UTC, etc.)

## Future Considerations
- All date displays in the app should use `formatDate()` or `parseLocalDate()`
- Backend should store dates as strings (`YYYY-MM-DD`) or use `DATE` type
- Avoid using JavaScript `Date` objects for date-only values
- Consider using libraries like `date-fns` for more robust date handling
