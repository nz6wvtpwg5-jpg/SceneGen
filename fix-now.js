#!/usr/bin/env node

const BACKEND_URL = 'http://localhost:8000';
const TOUR_ID = '9d21a757-70e4-4708-995b-b11057ce7fab';
const ENTITY_ID = '1f60064e-3dc6-4612-a5c4-2be834806277';

// You need to get this from your backend or login
const EMAIL = 'jon@jonluca.com'; // Update this
const PASSWORD = process.env.PASSWORD || 'your-password'; // Set via env or update here

async function login() {
  console.log('🔐 Logging in...');
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const data = await res.json();
  return data.access_token;
}

async function getShows(token) {
  const res = await fetch(`${BACKEND_URL}/api/tours/${TOUR_ID}/shows`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Entity-Id': ENTITY_ID
    }
  });
  return await res.json();
}

async function getBudgets(token) {
  const res = await fetch(`${BACKEND_URL}/api/budgets?tour_id=${TOUR_ID}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Entity-Id': ENTITY_ID
    }
  });
  return await res.json();
}

async function createBudget(token, showId) {
  const res = await fetch(`${BACKEND_URL}/api/budgets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Entity-Id': ENTITY_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tour_id: TOUR_ID,
      show_id: showId,
      name: 'Show Budget',
      total_amount: 0
    })
  });
  return await res.json();
}

async function calculateDistance(token, fromShowId, toShowId) {
  const res = await fetch(`${BACKEND_URL}/api/routing/distance`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Entity-Id': ENTITY_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from_show_id: fromShowId,
      to_show_id: toShowId
    })
  });
  return await res.json();
}

async function main() {
  try {
    console.log('🚀 Starting retroactive fix...\n');

    const token = await login();
    console.log('✅ Logged in\n');

    console.log('📊 Fetching shows...');
    const shows = await getShows(token);
    console.log(`✅ Found ${shows.length} shows\n`);

    console.log('💰 Fetching budgets...');
    const budgets = await getBudgets(token);
    const budgetShowIds = new Set(budgets.map(b => b.show_id));
    console.log(`✅ Found ${budgets.length} budgets\n`);

    // Create missing budgets
    let created = 0;
    for (const show of shows) {
      if (!budgetShowIds.has(show.id)) {
        console.log(`💰 Creating budget for show: ${show.venue_name} (${show.venue_city})`);
        await createBudget(token, show.id);
        created++;
      }
    }
    console.log(`\n✅ Created ${created} missing budgets\n`);

    // Calculate distances
    console.log('🗺️  Calculating distances...');
    const sortedShows = shows.sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalDistance = 0;

    for (let i = 0; i < sortedShows.length - 1; i++) {
      const fromShow = sortedShows[i];
      const toShow = sortedShows[i + 1];

      console.log(`  ${fromShow.venue_city} → ${toShow.venue_city}`);
      const result = await calculateDistance(token, fromShow.id, toShow.id);

      if (result.distance_miles) {
        totalDistance += result.distance_miles;
        console.log(`    ✅ ${result.distance_miles} miles`);
      }
    }

    console.log(`\n✅ Total tour distance: ${totalDistance} miles`);
    console.log('\n🎉 FIX COMPLETE!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
