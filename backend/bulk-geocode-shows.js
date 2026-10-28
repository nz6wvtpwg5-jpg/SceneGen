#!/usr/bin/env node

/**
 * Script to bulk geocode all shows that have TBD addresses
 * This will use Google's Geocoding API to find coordinates for venue names + cities
 */

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

async function geocodeAddress(venueName, city, state) {
  const query = `${venueName}, ${city}, ${state}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return {
        address: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        success: true
      };
    }

    return { success: false, error: data.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  await client.connect();
  console.log('✅ Connected to database');

  // Get all shows with TBD addresses
  const result = await client.query(`
    SELECT id, venue_name, city, state
    FROM shows
    WHERE venue_address IS NULL OR venue_address = 'TBD'
    ORDER BY date
  `);

  console.log(`\n📍 Found ${result.rows.length} shows needing geocoding\n`);

  let successCount = 0;
  let failCount = 0;

  for (const show of result.rows) {
    console.log(`🔍 Geocoding: ${show.venue_name}, ${show.city}, ${show.state}`);

    const geocode = await geocodeAddress(show.venue_name, show.city, show.state);

    if (geocode.success) {
      await client.query(
        `UPDATE shows
         SET venue_address = $1, venue_lat = $2, venue_lng = $3
         WHERE id = $4`,
        [geocode.address, geocode.lat, geocode.lng, show.id]
      );

      console.log(`   ✅ ${geocode.address}`);
      console.log(`   📍 ${geocode.lat}, ${geocode.lng}\n`);
      successCount++;
    } else {
      console.log(`   ❌ Failed: ${geocode.error}\n`);
      failCount++;
    }

    // Rate limit: wait 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully geocoded: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📍 Total: ${result.rows.length}\n`);

  await client.end();
}

main().catch(error => {
  console.error('❌ Error:', error);
  client.end();
  process.exit(1);
});
