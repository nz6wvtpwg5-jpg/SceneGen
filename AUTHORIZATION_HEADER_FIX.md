# Authorization Header Fix for Shows and Tours APIs

## Problem
The `/api/shows` and `/api/tours` endpoints were returning 401 Unauthorized errors because:
1. The backend API routes expect an `Authorization: Bearer <token>` header to forward to the Azure backend
2. The frontend fetch calls were only sending `credentials: 'include'` but not the Authorization header
3. The user's Azure B2C access token was available in the session but wasn't being used

## Solution
Updated all frontend code that calls shows and tours APIs to:
1. Use `useSession()` from `next-auth/react` to get the user's access token
2. Pass the access token to the `useShows()` and `useTours()` hooks
3. Include the token in the Authorization header for all API requests

## Files Modified

### Hooks (Updated to accept access token parameter)
- `/src/hooks/useShows.ts` - Added `accessToken?: string` parameter and Authorization header to all fetch calls
- `/src/hooks/useTours.ts` - Added `accessToken?: string` parameter and Authorization header to all fetch calls

### Pages
- `/src/app/shows/page.tsx` - Added `useSession()`, passes `session?.access_token` to hooks
- `/src/app/tours/page.tsx` - Added `useSession()`, passes `session?.access_token` to hooks
- `/src/app/tours/[id]/page.tsx` - Added `useSession()`, passes `session?.access_token` to hooks

### Components
- `/src/components/shows/CreateShowForm.tsx` - Added `useSession()`, passes `session?.access_token` to hooks
- `/src/components/shows/AddToTourModal.tsx` - Added `useSession()`, passes `session?.access_token` to hooks
- `/src/components/touring/TouringLayout.tsx` - Added `useSession()`, passes `session?.access_token` to hooks
- `/src/components/tours/CreateTourModal.tsx` - Added `useSession()`, passes `session?.access_token` to hooks

## How It Works

### Before
```typescript
// Hook didn't accept token
export function useShows() {
  const fetchShows = async () => {
    const response = await fetch('/api/shows', {
      credentials: 'include',
    });
    // ...
  };
}

// Usage - no token passed
const { fetchShows } = useShows();
```

### After
```typescript
// Hook accepts optional access token
export function useShows(accessToken?: string) {
  const fetchShows = async () => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const response = await fetch('/api/shows', {
      credentials: 'include',
      headers,
    });
    // ...
  };
}

// Usage - token from session passed to hook
const { data: session } = useSession();
const { fetchShows } = useShows(session?.access_token as string);
```

## Expected Results
After these changes:
- ✅ `/api/shows` should return 200 OK with show data
- ✅ `/api/tours` should return 200 OK with tour data
- ✅ All CRUD operations for shows and tours should work correctly
- ✅ The calendar integration "Add as Show" feature should work without authentication errors

## Testing
1. Refresh the browser to clear any cached state
2. Navigate to `/shows` - should load shows without 401 errors
3. Navigate to `/tours` - should load tours without 401 errors
4. Try creating a new show - should work
5. Try the calendar integration "Add as Show" feature - should work

## Next Steps
If 401 errors persist, check:
1. Is the user properly authenticated? (Check session in browser console)
2. Is the access token valid? (Check `session.access_token` value)
3. Is the backend API expecting a different header format?
4. Are there any CORS or middleware issues blocking the headers?

## Related Files
- Session configuration: `/src/auth.ts`
- API routes: `/src/app/api/shows/route.ts`, `/src/app/api/tours/route.ts`
- Previous fix documentation: `AUTHENTICATION_FIX.md`
