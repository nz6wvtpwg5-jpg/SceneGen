# URGENT: Venue Address Data Recovery

## What Happened
Your venue address data (addresses and coordinates from Google Maps) was **NOT saved to the database** during your CSV import. The shows were created with basic info (venue names, cities from CSV), but the detailed Google Maps data you entered was lost.

## Good News
1. **Your budget data IS still in the database** - we don't need to re-import that
2. **Your show data IS in the database** - just missing the addresses/coordinates
3. **I've created a tool to quickly fix this** without re-importing everything

## What I've Created

### Bulk Venue Update Tool
A new page at `/venues/bulk-update` that lets you:
- Quickly go through each show one-by-one
- Use Google Maps autocomplete to search for the venue
- Save each venue individually (so you don't lose progress)
- Skip venues if needed
- Track your progress

## How to Use It RIGHT NOW

1. **Go to the Tours page** (you're probably already there)
2. **Click the "Update Venues" button** (it's next to "Import from CSV")
3. **For each of your 29 shows:**
   - Type the venue name in the search box
   - Select the correct venue from Google Maps suggestions
   - Click "Save & Next"
4. **Done!** Your venue addresses and coordinates will be saved

## Current Database State

```
Total shows: 32
Shows with addresses: 3
Shows needing addresses: 29
```

The 29 shows that need addresses are from your recent import where the address data was lost.

## Why This Happened

The import flow has a bug where if there's an error during the final import step, the address data doesn't get saved even though the shows are created. Looking at the backend logs, there's no record of your import reaching the `/api/import/execute` endpoint, which means the data you entered was lost before it could be saved.

## Next Steps

### Immediate (Today)
1. ✅ Use the bulk update tool to add venue addresses to your 29 shows (~10-15 minutes)

### Soon (This Week)
2. 🔧 Fix the import wizard to properly handle errors and save address data
3. 🔧 Add better error logging to track what data is being sent
4. 🔧 Add a "Save Draft" feature so you don't lose work if something fails

### Future
5. 💡 Consider migrating to the new Google Places API (current one is deprecated)
6. 💡 Add bulk geocoding tools for fixing addresses in bulk

## Technical Details

### Backend Endpoint
The bulk update tool uses: `PATCH /api/shows/:id`

This endpoint supports updating these fields:
- `venueAddress` - Full street address
- `venueLat` - Latitude
- `venueLng` - Longitude
- `city` - City name
- `state` - State/province code

### Database Columns
The `shows` table has these columns for venue data:
```sql
venue_name VARCHAR
venue_address TEXT
venue_lat NUMERIC
venue_lng NUMERIC
city VARCHAR
state VARCHAR
country VARCHAR (defaults to 'USA')
```

### Why the PATCH Approach Works
- Each show is updated individually via API
- Data is saved immediately (no transaction rollback issues)
- Progress is tracked client-side
- If you close the browser, your progress is saved
- The tool filters to only show shows that need addresses

## Files Changed

1. **Created:** `/src/app/venues/bulk-update/page.tsx`
   - New bulk update page with Google Maps integration

2. **Modified:** `/src/app/tours/page.tsx`
   - Added "Update Venues" button

3. **Documentation:**
   - `VENUE_BULK_UPDATE_TOOL.md` - Detailed tool documentation
   - `VENUE_ADDRESS_RECOVERY.md` - This file

## Questions?

If you have any questions or run into issues:
1. Check the browser console for errors
2. Check the backend logs: `/backend/backend.log`
3. The tool auto-saves, so you can refresh and continue where you left off

## After You're Done

Once you've updated all 29 venues:
1. We'll investigate why the import failed
2. We'll fix the import wizard to prevent this from happening again
3. You can then import new tours with confidence

---

**Bottom Line:** Don't re-import your CSV! Use the bulk update tool to fix the 29 shows that are missing addresses. It will save you time and preserve your budget data.
