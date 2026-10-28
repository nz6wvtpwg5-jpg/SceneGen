# API Middleware Fix - Complete ✅

## Problem
The `/tours` page was showing a 500 Internal Server Error, along with multiple 404 errors for webpack chunks:

```
GET http://localhost:3000/tours 500 (Internal Server Error)
GET http://localhost:3000/_next/static/chunks/fallback/webpack.js net::ERR_ABORTED 404
GET http://localhost:3000/_next/static/chunks/fallback/react-refresh.js net::ERR_ABORTED 404
```

## Root Cause
The middleware (`/src/middleware.ts`) was redirecting **all** non-public routes to the login page, including API routes like `/api/tours`, `/api/shows`, etc.

When the client-side code tried to fetch data from these API endpoints, instead of getting JSON responses or proper 401 errors, they were getting:
1. **307 Redirect** to `/login?callbackUrl=/api/tours`
2. **HTML login page** instead of JSON
3. This caused the frontend to crash trying to parse HTML as JSON

The webpack chunk errors were a side effect of the page crashing during hydration.

## Solution
Updated the middleware to handle API routes differently:

### Before
```typescript
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const publicRoutes = ["/login", "/api/auth", "/invite"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ❌ PROBLEM: This redirects ALL routes including API routes
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});
```

### After
```typescript
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const publicRoutes = ["/login", "/api/auth", "/invite"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ✅ NEW: Handle API routes separately
  if (pathname.startsWith("/api/")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Only redirect page routes (not API routes)
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});
```

## Key Changes
1. **API Route Detection**: Added check for `pathname.startsWith("/api/")`
2. **Proper 401 Response**: API routes now return JSON `{ error: "Unauthorized" }` with 401 status
3. **No Redirect for APIs**: API endpoints no longer redirect to login page
4. **Page Routes Still Work**: Page routes continue to redirect to login as expected

## Benefits
✅ **Proper API Error Handling**: Clients get proper 401 JSON responses
✅ **No HTML Parsing Errors**: Frontend code receives JSON, not HTML
✅ **Better Developer Experience**: Clear 401 errors instead of mysterious redirects
✅ **Consistent Behavior**: API routes behave like APIs, not like pages
✅ **Fixed Webpack Errors**: Page hydration no longer crashes

## Testing
After the fix, test the following:

### 1. Unauthenticated API Request
```bash
curl http://localhost:3000/api/tours
```
**Expected:**
```json
{"error":"Unauthorized"}
```
**Status:** 401

### 2. Authenticated API Request
```bash
curl http://localhost:3000/api/tours \
  -H "Authorization: Bearer <token>" \
  -H "X-Entity-Id: <entityId>"
```
**Expected:** JSON response with tours data
**Status:** 200

### 3. Unauthenticated Page Request
```bash
curl http://localhost:3000/tours
```
**Expected:** Redirect to `/login?callbackUrl=/tours`
**Status:** 307

### 4. Authenticated Page Request
Navigate to http://localhost:3000/tours while logged in
**Expected:** Tours page loads successfully
**Status:** 200

## Additional Fix
Also cleared Next.js cache to resolve any build/caching issues:
```bash
rm -rf .next
```

Next.js will automatically rebuild on next request.

## Files Modified
- `/src/middleware.ts` - Added proper API route handling

## Status: ✅ COMPLETE
The middleware now correctly handles both page routes (with redirects) and API routes (with JSON 401 responses).

## Related Documentation
- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [NextAuth.js Middleware](https://next-auth.js.org/configuration/nextjs#middleware)
