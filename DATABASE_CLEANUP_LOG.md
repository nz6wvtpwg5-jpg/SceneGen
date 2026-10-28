# Database Cleanup - Future Shows Removed

## What Was Done

Deleted all future shows (shows with `date >= today`) from the database to allow fresh testing of the CSV import feature.

## Summary

### Before Cleanup
- **Total shows:** 319 (mix of past and future)
- **Future shows:** 316
- **Past shows:** 3

### After Cleanup
- **Total shows:** 3 (all past dates from February 2026)
- **Total budgets:** 2 (orphaned budgets removed)
- **Total tours:** 1 (empty tours removed)

### Remaining Shows (for reference)
All remaining shows are from **February 2026** (past dates):

| Venue Name | City | State | Date |
|------------|------|-------|------|
| Rue Dieudonné Lefèvre 4 | Belgium | - | Feb 28, 2026 |
| Burgerweeshuis | Deventer | OV | Feb 27, 2026 |
| Burgerweeshuis | Deventer | OV | Feb 27, 2026 |

These won't interfere with your testing as they're in the past.

## Database State

```sql
-- Shows: 3 (all past dates)
-- Budgets: 2 (linked to existing shows)
-- Tours: 1 (has associated shows)
```

## Next Steps

You can now:
1. ✅ Import fresh CSV data
2. ✅ Test venue address collection
3. ✅ Create new tours without conflicts
4. ✅ Verify all data saves correctly

## Clean Slate for Testing

The database is now clean and ready for testing:
- No future shows to cause confusion
- No orphaned data
- Only 3 old reference shows remain

**You're ready to test the import flow again!** 🎉

---

**Date:** 26 March 2026
**Shows deleted:** 316 future shows
**Shows remaining:** 3 past shows
