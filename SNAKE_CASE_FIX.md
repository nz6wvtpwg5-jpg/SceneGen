# Snake Case to Camel Case Fix

**Date:** 2025-02-25
**Status:** ✅ FIXED

## Problem

User signed in as "CONAN" (an artist/band) was seeing "Artist Feature Only" message on `/tours` page, even though they were authenticated as an artist.

### Root Cause

**Backend → Frontend Data Mismatch:**
- Backend database returns `entity_type` (snake_case)
- Frontend TypeScript expects `entityType` (camelCase)

**Example:**
```javascript
// Backend response (from database)
{
  "id": "1f60064e-3dc6-4612-a5c4-2be834806277",
  "name": "CONAN",
  "entity_type": "artist",        // ❌ snake_case
  "administrator_id": "...",      // ❌ snake_case
  // ...
}

// Frontend TypeScript interface
interface Entity {
  id: string;
  name: string;
  entityType: string;             // ✅ camelCase
  administratorId: string;        // ✅ camelCase
  // ...
}
```

### Impact

The check `activeProfile?.entityType === 'artist'` was always `false` because:
- `activeProfile.entityType` was `undefined`
- `activeProfile.entity_type` was `"artist"` (not checked)

Result: Artist users saw the promoter guard message.

---

## Solution

Added data transformation when entities are fetched from the backend.

### Files Changed

1. **src/components/sidenav/SidebarEntities.tsx**
2. **src/app/tours/page.tsx**

---

### 1. SidebarEntities.tsx - Data Transformation

Added `transformEntity` function to convert snake_case to camelCase:

```typescript
// Transform snake_case from backend to camelCase for frontend
const transformEntity = (entity: any): Entity => ({
    id: entity.id,
    name: entity.name,
    entityType: entity.entity_type || entity.entityType,
    administratorId: entity.administrator_id || entity.administratorId,
    city: entity.city,
    country: entity.country,
    latitude: entity.latitude,
    longitude: entity.longitude,
    trialEndsAt: entity.trial_ends_at || entity.trialEndsAt,
});
```

**Applied transformation:**
```typescript
// Transform all entities to camelCase
const transformedData = data.map(transformEntity);
```

This ensures all entities stored in Zustand have consistent camelCase properties.

---

### 2. tours/page.tsx - Fallback Check

Added backward compatibility check:

```typescript
// Check if user is an artist
// Handle both camelCase (entityType) and snake_case (entity_type) from backend
const isArtist = activeProfile?.entityType === 'artist' ||
  (activeProfile as any)?.entity_type === 'artist';
```

This provides a safety net in case old data exists in localStorage.

---

## Testing

**Before Fix:**
```javascript
activeProfile = {
  entity_type: "artist",  // ❌ Not checked
  entityType: undefined
}
isArtist = false  // ❌ Wrong!
→ Shows "Artist Feature Only" message
```

**After Fix:**
```javascript
activeProfile = {
  entityType: "artist",   // ✅ Transformed
  entity_type: undefined
}
isArtist = true   // ✅ Correct!
→ Shows tours list
```

---

## Verification Steps

1. **Clear localStorage** (optional, to test fresh):
   ```javascript
   localStorage.removeItem('profile-storage');
   ```

2. **Sign in as artist** (e.g., CONAN)

3. **Navigate to /tours**

4. **Expected result:** See tours list, not "Artist Feature Only" message

5. **Check console:** Profile should show `entityType: "artist"`

---

## Long-Term Solution

### Option 1: Backend Transformation (Recommended)

Add a transformation layer in backend endpoints:

```javascript
// backend/server.js
function transformEntityToFrontend(dbEntity) {
  return {
    id: dbEntity.id,
    name: dbEntity.name,
    entityType: dbEntity.entity_type,
    administratorId: dbEntity.administrator_id,
    city: dbEntity.city,
    country: dbEntity.country,
    latitude: dbEntity.latitude,
    longitude: dbEntity.longitude,
    trialEndsAt: dbEntity.trial_ends_at,
  };
}

app.get('/api/user/entities', async (req, res) => {
  // ...
  const result = await pool.query('SELECT * FROM entities WHERE administrator_id = $1', [userId]);

  // Transform before sending
  const transformedEntities = result.rows.map(transformEntityToFrontend);
  res.json(transformedEntities);
});
```

### Option 2: Database Column Rename (Not Recommended)

Would require:
- Renaming all snake_case columns to camelCase
- Breaking changes to database schema
- Migration scripts
- Potential conflicts with PostgreSQL conventions

**Recommendation:** Keep database as snake_case (standard) and transform at API boundary.

---

## Related Issues

- [x] Fixed tours page artist check
- [x] Added data transformation in SidebarEntities
- [x] Added backward compatibility fallback
- [ ] (Optional) Add transformation to all entity endpoints

---

## Notes

- **Snake case in database:** PostgreSQL convention
- **Camel case in frontend:** JavaScript/TypeScript convention
- **Transformation layer:** Best practice for API boundaries
- **Backward compatibility:** Handles both formats for safety

---

## Impact

✅ Artists can now access tours page
✅ Proper entity type detection
✅ Consistent data format in frontend
✅ No breaking changes to existing code
