# Contacts Entity ID Header Fix

## Issue
The contacts page was failing with a 401 UNAUTHORIZED error:
```
Entity ID is required (pass as query param, body field, or X-Entity-Id header)
```

## Root Cause
The frontend code was attempting to retrieve the `entityId` directly from localStorage using:
```typescript
localStorage.getItem('entityId')
```

However, the app uses a Zustand store to manage entity data, and the `entityId` is stored in `localStorage` under the key `'profile-storage'` as part of the `activeProfile` object.

## Solution
Updated the following files to use the `getEntityId()` helper function from `/src/lib/entity.ts`:

### Files Modified
1. **`/src/components/contacts/ContactsTable.tsx`**
   - Added import: `import { getEntityId } from '@/lib/entity';`
   - Changed `localStorage.getItem('entityId')` to `getEntityId()` in:
     - `fetchContacts` function
     - `handleDelete` function

2. **`/src/components/contacts/ConnectionsTable.tsx`**
   - Added import: `import { getEntityId } from '@/lib/entity';`
   - Changed `localStorage.getItem('entityId')` to `getEntityId()` in the `fetchConnections` function

## How It Works
The `getEntityId()` helper function:
1. Reads from `localStorage.getItem('profile-storage')`
2. Parses the JSON to get `state.activeProfile.id`
3. Returns the entity ID if it exists, or null otherwise

This ensures the correct entity ID is retrieved from the Zustand store and sent as the `X-Entity-Id` header in all API requests.

## Testing
To verify the fix:
1. Ensure you're logged in and have selected an entity profile
2. Navigate to the contacts page
3. Open browser DevTools → Network tab
4. Check that the request to `/api/contacts` includes the `X-Entity-Id` header
5. Verify the contacts load successfully without 401 errors

## Next Steps
- The contacts page should now load successfully
- If you see an empty contacts list, that's expected if no contacts exist yet
- You can add contacts using the "Add Contact" button on the page
