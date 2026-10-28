# Backend Server Required

## Current Status
✅ **Frontend Fixed** - The authentication and infinite loop issues are completely resolved!
❌ **Backend Down** - The backend API server on port 3001 is not running.

## Error Details
```
[cause]: [AggregateError: ] { code: 'ECONNREFUSED' }
```

All API routes are trying to connect to:
- `http://localhost:3001/api/budgets`
- `http://localhost:3001/api/user/entities`
- `http://localhost:3001/api/shows`
- `http://localhost:3001/api/tours`

But nothing is listening on port 3001.

## What You Need to Do

### Option 1: Start the Backend Server
If you have a separate backend project, navigate to it and start it:
```bash
# Example (adjust based on your backend setup):
cd /path/to/backend
npm run dev  # or yarn dev, python manage.py runserver, etc.
```

The backend should start on `http://localhost:3001`

### Option 2: Check Environment Variables
Verify `.env.local` has the correct backend URL:
```bash
USE_LOCAL_BACKEND=true
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Option 3: Switch to Production Backend
If you don't need local backend, change `.env.local`:
```bash
USE_LOCAL_BACKEND=false
# Use production backend instead
```

## Verification
Once the backend is running, refresh the bookkeeping page. You should see:
- ✅ No 500 errors
- ✅ No ECONNREFUSED errors
- ✅ Data loads successfully from all APIs

## What We Fixed Today
1. ✅ Authentication: Added `useSession` and passed `access_token` to API calls
2. ✅ Infinite Loop: Fixed `useEffect` dependencies to prevent re-render cycles
3. ✅ No more 401 errors or request spam in the browser console

The frontend is ready - it just needs a working backend server! 🚀
