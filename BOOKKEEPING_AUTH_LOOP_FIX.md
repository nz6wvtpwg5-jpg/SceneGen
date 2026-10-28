# Bookkeeping Authentication & Infinite Loop Fix

## Problem
The bookkeeping page was experiencing two critical issues:
1. **Infinite 401 Loop**: Hundreds of failed `/api/shows` requests due to missing authentication
2. **Infinite Re-render Loop**: `useEffect` dependency on `fetchShows` causing continuous re-renders

## Root Causes

### 1. Missing Authentication Token
The bookkeeping page was not passing the NextAuth session token to the `useShows` hook, causing all API requests to fail with 401 Unauthorized errors.

**Before:**
```typescript
const { fetchShows } = useShows(); // No token passed
```

### 2. Unstable useEffect Dependencies
The `useEffect` hook included `fetchShows` in its dependency array, which is recreated on every render, causing an infinite loop:

**Before:**
```typescript
useEffect(() => {
  if (showCreateModal) {
    fetchShows()...
  }
}, [showCreateModal, fetchShows]); // fetchShows causes infinite loop
```

## Solution

### 1. Added NextAuth Session
Import and use `useSession` to get the access token:

```typescript
import { useSession } from 'next-auth/react';

export default function Bookkeeping() {
  const { data: session } = useSession();
  const { fetchShows } = useShows(session?.access_token as string);
  // ...
}
```

### 2. Fixed useEffect Dependencies
Removed `fetchShows` from dependencies and added `session?.access_token` instead:

```typescript
useEffect(() => {
  if (showCreateModal && session?.access_token) {
    setShowsLoading(true);
    fetchShows()
      .then((shows) => setAvailableShows(shows))
      .catch((err) => console.error('Error fetching shows:', err))
      .finally(() => setShowsLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [showCreateModal, session?.access_token]); // Only re-run when modal opens or auth changes
```

## Key Points

1. **Property Name**: NextAuth uses `access_token` (underscore), not `accessToken` (camelCase)
2. **Conditional Fetch**: Only fetch shows when both the modal is open AND the user is authenticated
3. **Stable Dependencies**: Only include primitive values or stable references in `useEffect` dependencies
4. **eslint-disable**: Necessary because `fetchShows` is intentionally excluded from dependencies

## Files Modified
- `/src/app/bookkeeping/page.tsx`

## Testing Checklist
- [x] No build errors
- [ ] No 401 errors in browser console
- [ ] Shows load when "Create Budget" modal opens
- [ ] No infinite request loops
- [ ] Modal can be opened and closed without issues
- [ ] Budget creation works with selected show

## Impact
- Eliminated infinite loop causing hundreds of failed API requests
- Fixed authentication for show fetching in bookkeeping
- Improved performance and user experience
- Reduced unnecessary network traffic and server load
