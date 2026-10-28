# Show Count Investigation Results

## Summary
The sidebar badge was showing **6 shows**, but the /shows page was showing **0 shows** for Conan's entity. Investigation revealed that the 6 shows exist in the database, but they belong to a different entity (`test-entity-123`), not to any of the actual entities in the system.

## The 6 Shows Found

All 6 shows have `entity_id: "test-entity-123"`, which doesn't correspond to any real entity in the database:

### Show Details:

1. **Madison Square Garden, New York, NY**
   - Date: June 15, 2026
   - Time: 8:00 PM
   - Status: confirmed
   - Created: Feb 1, 2026

2. **Burgerweeshuis, Deventer, Netherlands** (Show #1)
   - Date: Feb 27, 2026
   - Time: 10:00 PM
   - Door Time: 9:00 PM
   - Fee: $2,000 guaranteed
   - Capacity: 300
   - Created: Feb 2, 2026

3. **Burgerweeshuis, Deventer, Netherlands** (Show #2)
   - Date: Feb 27, 2026
   - Time: 10:00 PM
   - Door Time: 6:30 PM
   - Fee: $2,000 guaranteed
   - Created: Feb 2, 2026

4. **Burgerweeshuis, Deventer, Netherlands** (Show #3)
   - Date: Feb 27, 2026
   - Time: 8:00 PM
   - Door Time: 7:00 PM
   - Created: Feb 2, 2026

5. **Burgerweeshuis, Deventer, Netherlands** (Show #4)
   - Date: Feb 27, 2026
   - Time: 8:00 PM
   - Door Time: 7:00 PM
   - Created: Feb 2, 2026

6. **Burgerweeshuis, Deventer, Netherlands** (Show #5)
   - Date: Feb 27, 2026
   - Time: 8:00 PM
   - Door Time: 7:00 PM
   - Created: Feb 2, 2026

## Actual Entities in Database

The database currently has **2 real entities**:

1. **Jon Davis Band**
   - ID: `1f60064e-3dc6-4612-a5c4-2be834806277`
   - Administrator: `31abcffb-6c8c-4988-bbbf-fd59350d4038`
   - Type: artist
   - Location: San Francisco, California, USA
   - Created: Feb 1, 2026

2. **Test Artist**
   - ID: `d96b8740-4948-48f8-9098-9fcc89b831a4`
   - Administrator: `test-user-jon`
   - Type: artist
   - Location: Los Angeles, California, USA
   - Created: Feb 1, 2026

## Why the Mismatch?

The 6 shows in the database are **orphaned test data** associated with a non-existent entity ID (`test-entity-123`). This is why:

1. **Sidebar badge showed 6**: The backend likely counted all shows in the database, regardless of entity
2. **Shows page showed 0**: The frontend correctly filtered shows by the actual logged-in user's entity ID
3. **No shows for Conan**: Neither entity in the database is named "Conan"

## Recommendations

### Option 1: Clean Up Test Data
Delete the orphaned shows:
```sql
DELETE FROM shows WHERE entity_id = 'test-entity-123';
```

### Option 2: Create Shows for Actual Entities
If you want to see shows in the app, create new shows associated with one of the real entity IDs:
- `1f60064e-3dc6-4612-a5c4-2be834806277` (Jon Davis Band)
- `d96b8740-4948-48f8-9098-9fcc89b831a4` (Test Artist)

### Option 3: Create a "Conan" Entity
If you need a "Conan" entity specifically, create a new entity with that name first, then create shows for it.

## Current State

- **Database shows count**: 6 (all orphaned)
- **Shows for real entities**: 0
- **Sidebar badge count**: Should be 0 (needs frontend to filter by valid entity)
- **Shows page count**: 0 (correctly showing 0)

## Resolution ✅

**Action Taken**: Deleted all 6 orphaned test shows on Feb 2, 2026

The database has been cleaned up and now contains:
- **Total shows**: 0
- **Shows for real entities**: 0
- **Orphaned shows**: 0 (cleaned up)

The sidebar badge and shows page should now both correctly show 0 shows.

## Next Steps

1. ✅ Deleted orphaned test shows
2. Create new shows using the Create Show form if needed
3. Ensure new shows are properly associated with real entity IDs
4. Verify the sidebar badge updates correctly
