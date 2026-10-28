# Delete Show 401 Error - Fix Summary

## Problem
When attempting to delete a show from the frontend, the operation fails with a **401 Unauthorized** error.

## Root Cause
The backend's `authMiddleware` (in `/backend/server.js`) requires the `X-Entity-Id` header for all authenticated requests. This middleware is applied to the `DELETE /api/shows/:id` endpoint.

```javascript
// backend/server.js - authMiddleware
const authMiddleware = (req, res, next) => {
  const entityId = req.headers['x-entity-id'];

  if (!entityId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Entity ID is required (pass as X-Entity-Id header)'
      }
    });
  }

  req.entityId = entityId;
  next();
};
```

However, in the frontend hook `/src/hooks/useShows.ts`, the `cancelShow` function was **NOT** sending the `X-Entity-Id` header:

```typescript
// BEFORE (missing X-Entity-Id)
const cancelShow = async (showId: string): Promise<void> => {
  const headers: HeadersInit = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  // ❌ No X-Entity-Id header!
  const response = await fetch(`/api/shows/${showId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });
  // ...
};
```

## Solution
Added the `X-Entity-Id` header to the `cancelShow` function, matching the pattern used in other functions like `fetchShows` and `createShow`:

```typescript
// AFTER (includes X-Entity-Id)
const cancelShow = async (showId: string): Promise<void> => {
  const entityId = getEntityId(); // ✅ Get entity ID
  const headers: HeadersInit = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  if (entityId) {
    headers['X-Entity-Id'] = entityId; // ✅ Include entity ID header
  }
  const response = await fetch(`/api/shows/${showId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });
  // ...
};
```

## Files Modified
- `/src/hooks/useShows.ts` - Added `X-Entity-Id` header to the `cancelShow` function

## How Backend DELETE Works
1. **Authentication**: Backend checks for `X-Entity-Id` header via `authMiddleware`
2. **Authorization**: Only allows deletion if the show belongs to the requesting entity
3. **Query**: `DELETE FROM shows WHERE id = $1 AND entity_id = $2`
4. **Response**: Returns 204 No Content on success, 404 if show not found, 401 if unauthorized

## Testing
To test the fix:

1. **Login** to the app with a valid user account
2. **Create an artist/promoter entity** if you don't have one
3. **Create a test show** via the Shows page
4. **Delete the show** using the delete button
5. **Verify** the show is removed from the list without errors

You can also test directly via curl:
```bash
# Get an entity ID from localStorage or the frontend
ENTITY_ID="your-entity-id-here"
ACCESS_TOKEN="your-access-token-here"
SHOW_ID="show-id-to-delete"

# Delete show (should now work)
curl -X DELETE \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Entity-Id: $ENTITY_ID" \
  http://localhost:3000/api/shows/$SHOW_ID
```

## Related Debugging
- Added extensive logging to `/src/app/api/shows/[id]/route.ts` DELETE handler
- Fixed Next.js 15 compatibility issue where `params` must be awaited (already applied in previous session)
- Confirmed backend server is running on port 3001
- Verified backend `authMiddleware` requirements

## Prevention
All API hooks that require entity context should follow this pattern:
```typescript
const entityId = getEntityId();
const headers: HeadersInit = { 'Content-Type': 'application/json' };

if (accessToken) {
  headers['Authorization'] = `Bearer ${accessToken}`;
}
if (entityId) {
  headers['X-Entity-Id'] = entityId;
}
```

This ensures consistency across all authenticated API calls.
