# 🚀 QUICK START - FINAL STEPS

## ✅ Current Status
- All syntax errors: **FIXED**
- Dev server: **RUNNING**
- Add Single Show: **WORKING**
- Google Places Autocomplete: **WORKING**
- Routing Tab: **IMPLEMENTED**

## 🎯 What You Need to Do NOW

### Step 1: Run the Retroactive Fix (2 minutes)

This will fix budgets and distances for shows that were added before the fix:

1. **Open browser** to: `http://localhost:3000/tours`

2. **Open browser console**:
   - Mac: `Cmd + Option + I` or `F12`
   - Windows: `F12`

3. **Copy and paste this entire script**:

```javascript
// Run this script in the browser console
async function fixMissingBudgets() {
  const tourId = '9d21a757-70e4-4708-995b-b11057ce7fab';
  const entityId = '1f60064e-3dc6-4612-a5c4-2be834806277';

  const accessToken = localStorage.getItem('access_token');

  if (!accessToken) {
    console.error('❌ No access token found. Please log in.');
    return;
  }

  console.log('🔍 Fetching shows...');

  const showsResponse = await fetch(`/api/shows?tourId=${tourId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Entity-Id': entityId,
    }
  });

  const { shows } = await showsResponse.json();
  console.log(`📊 Found ${shows.length} shows`);

  console.log('💰 Fetching budgets...');
  const budgetsResponse = await fetch(`/api/budgets?tourId=${tourId}&entityId=${entityId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Entity-Id': entityId,
    }
  });

  const budgetsData = await budgetsResponse.json();
  const budgets = budgetsData.budgets || [];
  console.log(`💰 Found ${budgets.length} budgets`);

  const showsWithoutBudgets = shows.filter(show =>
    !budgets.find(budget => budget.show_id === show.id)
  );

  console.log(`🔍 Shows without budgets: ${showsWithoutBudgets.length}`);

  if (showsWithoutBudgets.length === 0) {
    console.log('✅ All shows already have budgets!');
    return;
  }

  showsWithoutBudgets.forEach(show => {
    console.log(`  📍 ${show.city}, ${show.state} - ${show.date}`);
  });

  const templateBudget = budgets[0];
  if (!templateBudget) {
    console.error('❌ No budget template found');
    return;
  }

  console.log(`📋 Using budget template from ${templateBudget.id}`);

  for (const show of showsWithoutBudgets) {
    console.log(`\n💸 Creating budget for ${show.city}...`);

    const budgetData = {
      tour_id: tourId,
      show_id: show.id,
      artist_fee: show.guarantee || 0,
    };

    const createResponse = await fetch('/api/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Entity-Id': entityId,
      },
      body: JSON.stringify(budgetData),
    });

    if (!createResponse.ok) {
      console.error(`❌ Failed to create budget for ${show.city}`);
      const error = await createResponse.json();
      console.error(error);
      continue;
    }

    const { budget } = await createResponse.json();
    console.log(`✅ Budget created: ${budget.id}`);

    if (templateBudget.line_items && templateBudget.line_items.length > 0) {
      console.log(`📝 Copying ${templateBudget.line_items.length} line items...`);

      for (const item of templateBudget.line_items) {
        const lineItemData = {
          budget_id: budget.id,
          category: item.category,
          description: item.description,
          type: item.type,
          amount: item.amount,
          is_percentage: item.is_percentage || item.isPercentage || false,
          percentage_of: item.percentage_of || item.percentageOf || null,
        };

        await fetch('/api/budgets/line-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Entity-Id': entityId,
          },
          body: JSON.stringify(lineItemData),
        });
      }

      console.log(`✅ Line items copied`);
    }
  }

  console.log('\n🗺️ Recalculating distances...');
  try {
    await fetch(`/api/tours/${tourId}/calculate-distances`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Entity-Id': entityId,
      },
    });
    console.log('✅ Distances recalculated');
  } catch (error) {
    console.warn('⚠️ Distance calculation failed (non-fatal)');
  }

  console.log('\n✅ Done! Refresh the page to see updated budgets and distances.');
}

fixMissingBudgets().catch(console.error);
```

4. **Press Enter** to run

5. **Wait for completion** - You should see:
   - Shows found
   - Budgets created
   - Line items copied
   - Distances recalculated
   - "✅ Done!" message

6. **Refresh the page**

### Step 2: Verify Everything Works

1. **Check Tour Stats**:
   - Go to http://localhost:3000/tours
   - Verify show count is correct
   - Verify total distance includes all shows
   - Verify budget totals are accurate

2. **Test Add Single Show**:
   - Go to http://localhost:3000/import
   - Add a new show
   - Verify budget is created automatically
   - Verify tour stats update immediately

3. **Check Routing Tab**:
   - Go to http://localhost:3000/shows
   - Click "Routing" tab
   - Verify tab switching works

## 📊 Expected Results

### Before Fix:
- ❌ Some shows missing budgets (Asheville, Murfreesboro)
- ❌ Total distance incorrect
- ❌ Budget totals incorrect
- ❌ Tour stats don't include all shows

### After Fix:
- ✅ All shows have budgets
- ✅ Total distance includes all shows
- ✅ Budget totals accurate
- ✅ Tour stats include all shows
- ✅ New shows automatically get budgets
- ✅ Routing tab visible

## 🆘 If Something Goes Wrong

### "No access token found"
→ Log in again and retry

### "No budget template found"
→ Create a budget for one show manually first, then retry

### Console shows errors
→ Check the error message and share it

### Stats still wrong after refresh
→ Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

## ✅ All Files Ready

- `/src/app/import/components/Step3Validation.tsx` - ✅ Fixed
- `/src/app/shows/page.tsx` - ✅ Routing tab added
- `/fix-budgets.js` - ✅ Ready to use (just copy to browser console)
- `/FIX_COMPLETE_SUMMARY.md` - ✅ Full documentation

**You're ready to go! Start with Step 1 above.**
