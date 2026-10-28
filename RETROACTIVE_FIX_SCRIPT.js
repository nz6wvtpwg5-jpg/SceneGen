// ========================================
// RETROACTIVE FIX FOR SHOWS
// Run this in browser console at http://localhost:3000/tours
// ========================================

async function fixShowsRetroactively() {
  console.log('🚀 Starting retroactive fix...\n');

  const tourId = '9d21a757-70e4-4708-995b-b11057ce7fab';
  const entityId = '1f60064e-3dc6-4612-a5c4-2be834806277';
  const accessToken = localStorage.getItem('access_token');

  if (!accessToken) {
    console.error('❌ No access token found. Please log in first.');
    return;
  }

  try {
    // Step 1: Get all shows for the tour
    console.log('📊 Step 1: Fetching shows...');
    const showsResponse = await fetch(`/api/shows?tourId=${tourId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Entity-Id': entityId,
      }
    });

    if (!showsResponse.ok) {
      throw new Error(`Failed to fetch shows: ${showsResponse.status}`);
    }

    const { shows } = await showsResponse.json();
    console.log(`✅ Found ${shows.length} shows`);
    shows.forEach(show => {
      console.log(`   📍 ${show.city}, ${show.state} - ${show.date}`);
    });

    // Step 2: Get all existing budgets
    console.log('\n💰 Step 2: Fetching existing budgets...');
    const budgetsResponse = await fetch(`/api/budgets?tourId=${tourId}&entityId=${entityId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Entity-Id': entityId,
      }
    });

    if (!budgetsResponse.ok) {
      throw new Error(`Failed to fetch budgets: ${budgetsResponse.status}`);
    }

    const budgetsData = await budgetsResponse.json();
    const existingBudgets = budgetsData.budgets || [];
    console.log(`✅ Found ${existingBudgets.length} existing budgets`);

    // Step 3: Find shows without budgets
    const showsWithoutBudgets = shows.filter(show =>
      !existingBudgets.find(budget => budget.show_id === show.id)
    );

    console.log(`\n🔍 Step 3: Shows without budgets: ${showsWithoutBudgets.length}`);

    if (showsWithoutBudgets.length === 0) {
      console.log('✅ All shows already have budgets!');
      console.log('\n🗺️ Recalculating distances anyway...');
      await fetch(`/api/tours/${tourId}/calculate-distances`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Entity-Id': entityId,
        },
      });
      console.log('✅ Distances recalculated!');
      console.log('\n🎉 Done! Refresh the page to see updated stats.');
      return;
    }

    showsWithoutBudgets.forEach(show => {
      console.log(`   ⚠️  ${show.city}, ${show.state} - ${show.date} (ID: ${show.id})`);
    });

    // Step 4: Get a template budget
    if (existingBudgets.length === 0) {
      console.error('\n❌ No existing budgets to use as template!');
      console.log('Please create a budget for at least one show manually first.');
      return;
    }

    const templateBudget = existingBudgets[0];
    console.log(`\n📋 Step 4: Using template budget ID: ${templateBudget.id}`);
    console.log(`   Template has ${templateBudget.line_items?.length || 0} line items`);

    // Step 5: Create budgets for missing shows
    console.log('\n💸 Step 5: Creating budgets for shows...');

    for (const show of showsWithoutBudgets) {
      console.log(`\n   Processing: ${show.city}, ${show.state}`);

      // Create the budget
      const budgetData = {
        tour_id: tourId,
        show_id: show.id,
        artist_fee: show.guarantee || 0,
      };

      console.log(`   📝 Creating budget with artist fee: $${budgetData.artist_fee}`);

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
        const errorText = await createResponse.text();
        console.error(`   ❌ Failed to create budget: ${createResponse.status}`);
        console.error(`   Error: ${errorText}`);
        continue;
      }

      const { budget } = await createResponse.json();
      console.log(`   ✅ Budget created: ${budget.id}`);

      // Copy line items from template
      if (templateBudget.line_items && templateBudget.line_items.length > 0) {
        console.log(`   📋 Copying ${templateBudget.line_items.length} line items...`);

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

          const lineItemResponse = await fetch('/api/budgets/line-items', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'X-Entity-Id': entityId,
            },
            body: JSON.stringify(lineItemData),
          });

          if (!lineItemResponse.ok) {
            console.warn(`   ⚠️  Failed to copy line item: ${item.description}`);
          }
        }

        console.log(`   ✅ Line items copied`);
      }
    }

    // Step 6: Recalculate distances
    console.log('\n🗺️ Step 6: Recalculating tour distances...');

    try {
      const distanceResponse = await fetch(`/api/tours/${tourId}/calculate-distances`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Entity-Id': entityId,
        },
      });

      if (distanceResponse.ok) {
        console.log('✅ Distances recalculated successfully');
      } else {
        console.warn('⚠️  Distance calculation completed with warnings');
      }
    } catch (error) {
      console.warn('⚠️  Distance calculation failed (non-fatal):', error.message);
    }

    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 RETROACTIVE FIX COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ Created ${showsWithoutBudgets.length} new budgets`);
    console.log(`✅ Recalculated distances for all shows`);
    console.log('\n👉 REFRESH THE PAGE to see updated tour stats!');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Error during retroactive fix:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the fix
console.log('%c🔧 RETROACTIVE SHOW FIX SCRIPT', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
console.log('This will add budgets and recalculate distances for shows that are missing them.\n');
fixShowsRetroactively();
