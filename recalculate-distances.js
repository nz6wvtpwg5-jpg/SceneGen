#!/usr/bin/env node

/**
 * Recalculate Tour Distances Using Accurate Directions API
 *
 * This script directly calls the backend to recalculate distances
 * for a tour using the new Directions API (actual driving routes).
 *
 * Run from project root: node recalculate-distances.js
 */

// Use dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BACKEND_URL = 'http://localhost:3001';
const TOUR_ID = '9d21a757-70e4-4708-995b-b11057ce7fab'; // Tour Mar 2026
const ENTITY_ID = '1f60064e-3dc6-4612-a5c4-2be834806277';

async function recalculateDistances() {
  console.log('🗺️  Starting distance recalculation for Tour Mar 2026...\n');

  const client = await pool.connect();

  try {
    // Get all shows for this tour, sorted by date
    const showsResult = await client.query(
      `SELECT id, date, city, venue_name, latitude, longitude
       FROM shows
       WHERE tour_id = $1 AND entity_id = $2
       ORDER BY date ASC`,
      [TOUR_ID, ENTITY_ID]
    );

    const shows = showsResult.rows;

    console.log(`📍 Found ${shows.length} shows in tour`);
    console.log(`🔢 Will calculate ${shows.length - 1} distances\n`);

    if (shows.length < 2) {
      console.log('⚠️  Not enough shows to calculate distances');
      return;
    }

    let distancesCalculated = 0;
    let totalMiles = 0;

    // Calculate distance for each consecutive pair using Directions API
    for (let i = 1; i < shows.length; i++) {
      const prevShow = shows[i - 1];
      const currShow = shows[i];

      // Check if both shows have coordinates
      if (!prevShow.latitude || !prevShow.longitude || !currShow.latitude || !currShow.longitude) {
        console.log(`   ⚠️  Missing coordinates: ${prevShow.city} → ${currShow.city}`);
        continue;
      }

      try {
        // Use Google Maps Directions API for accurate driving distance
        const origin = `${prevShow.latitude},${prevShow.longitude}`;
        const destination = `${currShow.latitude},${currShow.longitude}`;

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data.status === 'OK' && data.routes && data.routes[0] && data.routes[0].legs) {
            // Sum up all leg distances
            const totalMeters = data.routes[0].legs.reduce((sum, leg) => {
              return sum + (leg.distance?.value || 0);
            }, 0);

            // Convert meters to miles
            const miles = totalMeters / 1609.34;
            const roundedMiles = Math.round(miles * 10) / 10;

            // Update the budget for the current show with the distance
            const updateResult = await client.query(
              `UPDATE budgets
               SET distance = $1
               WHERE show_id = $2 AND entity_id = $3
               RETURNING id`,
              [roundedMiles, currShow.id, ENTITY_ID]
            );

            if (updateResult.rows.length > 0) {
              console.log(`   ✅ ${prevShow.city} → ${currShow.city}: ${Math.round(miles)} miles (actual route)`);
              distancesCalculated++;
              totalMiles += miles;
            } else {
              console.log(`   ⚠️  No budget found for ${currShow.city}`);
            }
          } else {
            console.log(`   ⚠️  Directions API error: ${data.status} for ${prevShow.city} → ${currShow.city}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error calculating ${prevShow.city} → ${currShow.city}:`, error.message);
      }

      // Small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Successfully calculated ${distancesCalculated} distances`);
    console.log(`📊 Total tour distance: ${Math.round(totalMiles).toLocaleString()} miles`);
    console.log(`\n🎉 Done! Refresh your browser to see updated mileage.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run it
recalculateDistances().catch(console.error);
