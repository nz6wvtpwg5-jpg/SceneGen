/**
 * Server-side script to fix budgets for shows
 * Run with: node --loader ts-node/esm fix-shows-server.ts
 */

const BACKEND_URL = 'http://localhost:8000';
const TOUR_ID = '9d21a757-70e4-4708-995b-b11057ce7fab';
const ENTITY_ID = '1f60064e-3dc6-4612-a5c4-2be834806277';

// You need to provide a valid access token
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';

async function fixShows() {
  if (!ACCESS_TOKEN) {
    console.error('❌ Please provide ACCESS_TOKEN environment variable');
    console.log('\nGet it from browser:');
    console.log('  localStorage.getItem("access_token")');
    console.log('\nThen run:');
    console.log('  ACCESS_TOKEN=your_token node fix-shows-server.ts');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'X-Entity-Id': ENTITY_ID,
    'Content-Type': 'application/json',
  };

  try {
    console.log('🚀 Starting fix process...\n');

    // Get shows
    console.log('📊 Fetching shows...');
    const showsRes = await fetch(`${BACKEND_URL}/api/shows?tourId=${TOUR_ID}`, { headers });
    const { shows } = await showsRes.json();
    console.log(`✅ Found ${shows.length} shows\n`);

    // Get budgets
    console.log('💰 Fetching budgets...');
    const budgetsRes = await fetch(`${BACKEND_URL}/api/budgets?tourId=${TOUR_ID}`, { headers });
    const { budgets } = await budgetsRes.json();
    console.log(`✅ Found ${budgets.length} budgets\n`);

    // Find missing
    const missing = shows.filter((s: any) => !budgets.find((b: any) => b.show_id === s.id));
    console.log(`🔍 Shows without budgets: ${missing.length}`);
    missing.forEach((s: any) => console.log(`   - ${s.city}, ${s.state} (${s.date})`));
    console.log('');

    if (missing.length === 0) {
      console.log('✅ All shows have budgets!');
      return;
    }

    const template = budgets[0];
    console.log(`📋 Using template budget with ${template.line_items?.length || 0} line items\n`);

    // Create budgets
    for (const show of missing) {
      console.log(`💸 Processing: ${show.city}, ${show.state}`);

      const budgetRes = await fetch(`${BACKEND_URL}/api/budgets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tour_id: TOUR_ID,
          show_id: show.id,
          artist_fee: show.guarantee || 0,
        }),
      });

      if (!budgetRes.ok) {
        console.error(`   ❌ Failed: ${budgetRes.status}`);
        const error = await budgetRes.text();
        console.error(`   Error: ${error}`);
        continue;
      }

      const { budget } = await budgetRes.json();
      console.log(`   ✅ Budget created: ${budget.id}`);

      // Copy line items
      if (template.line_items) {
        for (const item of template.line_items) {
          await fetch(`${BACKEND_URL}/api/budgets/line-items`, {
            method: 'POST',
            headers,
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
        console.log(`   ✅ Copied ${template.line_items.length} line items`);
      }
      console.log('');
    }

    // Recalculate distances
    console.log('🗺️ Recalculating distances...');
    await fetch(`${BACKEND_URL}/api/tours/${TOUR_ID}/calculate-distances`, {
      method: 'POST',
      headers,
    });
    console.log('✅ Distances recalculated\n');

    console.log('🎉 FIX COMPLETE!');
    console.log(`✅ Fixed ${missing.length} shows`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixShows();
