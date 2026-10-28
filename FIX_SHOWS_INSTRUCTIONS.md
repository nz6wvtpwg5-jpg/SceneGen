# 🚀 FIX ASHEVILLE & MURFREESBORO SHOWS

## Problem
The two shows you see (Asheville, NC and Murfreesboro, TN) are **not showing in budget or mileage calculations** because they were added before the budget creation logic was working properly.

## Solution - Run This Script NOW

### Step 1: Open Browser Console
1. Stay on the page at **http://localhost:3000/tours**
2. Open browser console:
   - **Mac**: Press `Cmd + Option + I` or `F12`
   - **Windows**: Press `F12`

### Step 2: Copy & Paste the Script

**Open this file**: `/Users/jon/Desktop/scenegen/SceneGenUIV2/RETROACTIVE_FIX_SCRIPT.js`

Copy the **ENTIRE contents** of that file and paste it into the browser console.

### Step 3: Press Enter

The script will:
1. ✅ Find shows without budgets (Asheville, Murfreesboro)
2. ✅ Create budgets for them
3. ✅ Copy line items from existing budget template
4. ✅ Recalculate distances for all shows
5. ✅ Update tour stats

### Step 4: Refresh the Page

Once you see:
```
🎉 RETROACTIVE FIX COMPLETE!
```

**Refresh the page** (Cmd+R or F5) and you should see:
- ✅ Correct show count in tour stats
- ✅ Total distance includes all shows
- ✅ Budget totals include Asheville & Murfreesboro
- ✅ Both shows have budget buttons that work

## What This Does

The script will:
- Get all shows for your tour
- Identify which shows don't have budgets
- Create budgets for those shows using an existing budget as a template
- Copy all line items from the template
- Recalculate the route distances
- Update all tour statistics

## Expected Output in Console

You should see something like:
```
🚀 Starting retroactive fix...

📊 Step 1: Fetching shows...
✅ Found 29 shows
   📍 Asheville, NC - 2026-04-27
   📍 Murfreesboro, TN - 2026-04-28
   ... (other shows)

💰 Step 2: Fetching existing budgets...
✅ Found 27 existing budgets

🔍 Step 3: Shows without budgets: 2
   ⚠️  Asheville, NC - 2026-04-27
   ⚠️  Murfreesboro, TN - 2026-04-28

📋 Step 4: Using template budget...

💸 Step 5: Creating budgets...
   ✅ Budget created for Asheville
   ✅ Budget created for Murfreesboro

🗺️ Step 6: Recalculating distances...
✅ Distances recalculated

🎉 RETROACTIVE FIX COMPLETE!
```

## Alternative: Quick One-Liner

If you just want to verify the issue first, paste this in console:
```javascript
const tourId = '9d21a757-70e4-4708-995b-b11057ce7fab';
const entityId = '1f60064e-3dc6-4612-a5c4-2be834806277';
const token = localStorage.getItem('access_token');

Promise.all([
  fetch(`/api/shows?tourId=${tourId}`, {headers: {'Authorization': `Bearer ${token}`, 'X-Entity-Id': entityId}}).then(r => r.json()),
  fetch(`/api/budgets?tourId=${tourId}&entityId=${entityId}`, {headers: {'Authorization': `Bearer ${token}`, 'X-Entity-Id': entityId}}).then(r => r.json())
]).then(([shows, budgets]) => {
  console.log('Shows:', shows.shows.length);
  console.log('Budgets:', budgets.budgets.length);
  console.log('Missing budgets:', shows.shows.length - budgets.budgets.length);
});
```

## If It Doesn't Work

If you see errors in the console:
1. Make sure you're logged in
2. Make sure you're on http://localhost:3000/tours
3. Check that you have at least one show with a budget already (to use as template)
4. Share the error message with me

---

**Ready? Open the browser console and paste the script!** 🚀
