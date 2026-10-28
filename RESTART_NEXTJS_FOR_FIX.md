# 🔄 RESTART REQUIRED - Distance Calculation Fix

## The Issue
The distance calculation is still failing with a 500 error because **Next.js hasn't picked up the route file changes yet**.

From your console logs:
```
POST http://localhost:3000/api/tours/.../calculate-distances 500 (Internal Server Error)
⚠️ Distance calculation failed: {error: 'Failed to calculate distances'}
```

## Why This Happens
Next.js API routes are cached, and changes to route files (especially in the `app/api` directory) sometimes require a server restart to take effect.

## Solution: Restart the Next.js Dev Server

### Option 1: Terminal Restart
1. Find the terminal running `npm run dev`
2. Press `Ctrl+C` to stop the server
3. Run `npm run dev` again
4. Wait for "Ready" message

### Option 2: Kill and Restart (If terminal is not accessible)
```bash
# Kill the Next.js process
pkill -f "next dev"

# Start it again
npm run dev
```

## After Restart - Test Steps

1. **Refresh your browser** (hard refresh: Cmd+Shift+R)
2. **Navigate to a tour**
3. **Click "Add Show"**
4. **Fill in the form and submit**
5. **Watch the browser console** for these logs:

### Expected Success Logs:
```
✅ Show created
💰 Creating budget with data: {...}
✅ Budget created
🗺️  Calculating distances for tour...
✅ Distance calculation complete: {success: true, distancesCalculated: X}
```

### What You Should See:
- ✅ Budget created successfully
- ✅ Distance calculation succeeds (no 500 error)
- ✅ Tour mileage updates on the tours page
- ✅ The "Total Miles" value changes

## If It Still Fails After Restart

Check these:

1. **Backend server is running on port 3001:**
   ```bash
   ps aux | grep "node.*server.js" | grep -v grep
   ```

2. **Backend server logs:**
   ```bash
   tail -f backend.log
   ```
   Look for:
   ```
   🗺️  Calculating distances for tour: [tourId]
   📍 Found X shows, calculating Y distances...
   ```

3. **Google Maps API key is configured** in backend `.env`:
   ```bash
   grep GOOGLE_MAPS_API_KEY backend/.env
   ```

## Quick Test
Add a show and check the browser console. If you see:
- ❌ 500 error → Next.js server needs restart
- ✅ Success → Everything is working!

## Current Status
- ✅ Code fix applied
- ⏳ **Waiting for Next.js server restart**
- ⏳ After restart, test and verify mileage updates
