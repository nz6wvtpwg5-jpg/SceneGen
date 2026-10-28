import fetch from 'node-fetch';

const tourId = '9d21a757-70e4-4708-995b-b11057ce7fab';
const entityId = '1f60064e-3dc6-4612-a5c4-2be834806277';

// You'll need to get the access token from the browser
// This script shows what needs to be done

async function fixShows(accessToken) {
  try {
    // 1. Get all shows
    const showsRes = await fetch(`http://localhost:3000/api/shows?tourId=${tourId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Entity-Id': entityId,
      }
    });
    const { shows } = await showsRes.json();
    console.log(`Found ${shows.length} shows`);

    // 2. Get all budgets
    const budgetsRes = await fetch(`http://localhost:3000/api/budgets?tourId=${tourId}&entityId=${entityId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Entity-Id': entityId,
      }
    });
    const budgetsData = await budgetsRes.json();
    const budgets = budgetsData.budgets || [];
    console.log(`Found ${budgets.length} budgets`);

    // 3. Find shows without budgets
    const showsWithoutBudgets = shows.filter(show =>
      !budgets.find(b => b.show_id === show.id)
    );

    console.log(`Shows without budgets: ${showsWithoutBudgets.length}`);
    showsWithoutBudgets.forEach(s => console.log(`  - ${s.city}, ${s.state}`));

    if (showsWithoutBudgets.length === 0) {
      console.log('All shows have budgets!');
      return;
    }

    // 4. Use template budget
    const template = budgets[0];
    console.log(`Using template budget: ${template.id}`);

    // 5. Create budgets
    for (const show of showsWithoutBudgets) {
      console.log(`Creating budget for ${show.city}...`);

      const budgetRes = await fetch('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Entity-Id': entityId,
        },
        body: JSON.stringify({
          tour_id: tourId,
          show_id: show.id,
          artist_fee: show.guarantee || 0,
        }),
      });

      if (!budgetRes.ok) {
        console.error(`Failed: ${budgetRes.status}`);
        continue;
      }

      const { budget } = await budgetRes.json();
      console.log(`  ✓ Budget created: ${budget.id}`);

      // Copy line items
      if (template.line_items) {
        for (const item of template.line_items) {
          await fetch('http://localhost:3000/api/budgets/line-items', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'X-Entity-Id': entityId,
            },
            body: JSON.stringify({
              budget_id: budget.id,
              category: item.category,
              description: item.description,
              type: item.type,
              amount: item.amount,
              is_percentage: item.is_percentage || false,
              percentage_of: item.percentage_of || null,
            }),
          });
        }
        console.log(`  ✓ Copied ${template.line_items.length} line items`);
      }
    }

    // 6. Recalculate distances
    console.log('Recalculating distances...');
    await fetch(`http://localhost:3000/api/tours/${tourId}/calculate-distances`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Entity-Id': entityId,
      },
    });
    console.log('✓ Done!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// To run: node fix-backend.js YOUR_ACCESS_TOKEN
const token = process.argv[2];
if (token) {
  fixShows(token);
} else {
  console.log('Usage: node fix-backend.js YOUR_ACCESS_TOKEN');
  console.log('\nGet your token from browser localStorage.getItem("access_token")');
}
