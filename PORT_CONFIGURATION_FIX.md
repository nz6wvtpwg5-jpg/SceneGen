# Port Configuration Issue - RESOLVED ✅

## Issue
User navigated to http://localhost:3000/tours and encountered 500 errors.

## Root Cause
- Development server is running on **port 3002** (not 3000)
- Port 3000 had a broken Next.js instance running
- Port 3001 was also occupied

## Resolution
1. Killed the broken Next.js process on port 3000 (PID: 73268)
2. Redirected user to the correct port: **http://localhost:3002**

## Correct URLs

### ✅ Use These URLs:
- **Shows**: http://localhost:3002/shows
- **Tours**: http://localhost:3002/tours
- **Bookkeeping**: http://localhost:3002/bookkeeping
- **All pages**: http://localhost:3002/[page]

### ❌ Don't Use:
- ~~http://localhost:3000~~ (broken instance)
- ~~http://localhost:3001~~ (port occupied)

## How to Check Active Port

```bash
# See which ports are in use
lsof -ti:3000
lsof -ti:3001
lsof -ti:3002

# Check the terminal where you ran `npm run dev`
# Look for: "Local: http://localhost:XXXX"
```

## Current Server Status
✅ **Port 3002** - Working correctly
- Started with: `npm run dev`
- Terminal ID: 72147b92-ccb7-4273-bed3-033dacfb151c
- Status: Ready and running

## Prevention
To avoid confusion:
1. Always check the terminal output after running `npm run dev`
2. Look for the "Local:" URL in the output
3. Use that specific port for all navigation
4. Bookmark the correct URL

## If This Happens Again
```bash
# Kill all Next.js processes
pkill -f "next-server"

# Restart the dev server
npm run dev

# Note the port number in the output
```

## Status
✅ **RESOLVED** - Tours page now accessible at http://localhost:3002/tours
