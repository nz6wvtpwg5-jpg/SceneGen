// Run this script in the browser console on http://localhost:3000/tours
// It will fix budgets for shows that don't have them

async function fixMissingBudgets() {
  const tourId = '9d21a757-70e4-4708-995b-b11057ce7fab';
  const entityId = '1f60064e-3dc6-4612-a5c4-2be834806277';

  // Get access token from session storage or cookies
  const accessToken = localStorage.getItem('access_token') ||
                      document.cookie.split('; ').find(row => row.startsWith('next-auth.session-token'))?.split('=')[1];

  if (!accessToken) {
    console.error('❌ No access token found. Please log in.');
    return;
  }

  console.log('🔍 Fetching shows...');

  // Get all shows for the tour
  const showsResponse = await fetch(`/api/shows?tourId=${tourId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Entity-Id': entityId,
    }
  });

  const { shows } = await showsResponse.json();
  console.log(`📊 Found ${shows.length} shows`);

  // Get all budgets for the tour
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

  // Find shows without budgets
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

  // Get template budget (use first budget as template)
  const templateBudget = budgets[0];
  if (!templateBudget) {
    console.error('❌ No budget template found');
    return;
  }

  console.log(`📋 Using budget template from ${templateBudget.id}`);

  // Create budgets for missing shows
  for (const show of showsWithoutBudgets) {
    console.log(`\n💸 Creating budget for ${show.city}...`);

    const budgetData = {
      tourId: tourId,
      showId: show.id,
      artistFee: show.fee || 0,
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

    // Copy line items from template
    if (templateBudget.line_items && templateBudget.line_items.length > 0) {
      console.log(`📝 Copying ${templateBudget.line_items.length} line items...`);

      for (const item of templateBudget.line_items) {
        const lineItemData = {
          budgetId: budget.id,
          category: item.category,
          description: item.description,
          type: item.type,
          amount: item.amount,
          isPercentage: item.is_percentage || item.isPercentage || false,
          percentageOf: item.percentage_of || item.percentageOf || null,
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

  // Recalculate distances
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

// Run it
fixMissingBudgets().catch(console.error);
