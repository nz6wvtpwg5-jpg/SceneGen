/**
 * Backfill missing venue coordinates for shows
 * This script geocodes venue addresses to get lat/lng coordinates
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

async function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.results && response.results.length > 0) {
            const location = response.results[0].geometry.location;
            resolve({
              lat: location.lat,
              lng: location.lng,
              formatted_address: response.results[0].formatted_address,
            });
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Parse error:', error.message);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error('Request error:', error.message);
      resolve(null);
    });
  });
}

async function backfillCoordinates() {
  try {
    // Get all shows without coordinates but with addresses
    const result = await pool.query(`
      SELECT id, venue_name, venue_address, city, state, date
      FROM shows
      WHERE (venue_lat IS NULL OR venue_lng IS NULL)
        AND venue_address IS NOT NULL
        AND venue_address != ''
      ORDER BY date
    `);

    console.log(`\n📍 Found ${result.rows.length} shows with addresses but no coordinates\n`);

    let updated = 0;
    let failed = 0;

    for (const show of result.rows) {
      console.log(`Processing: ${show.venue_name} (${show.city}, ${show.state}) on ${show.date.toISOString().split('T')[0]}`);
      console.log(`  Address: ${show.venue_address}`);

      const coords = await geocodeAddress(show.venue_address);

      if (coords) {
        await pool.query(
          `UPDATE shows
           SET venue_lat = $1, venue_lng = $2
           WHERE id = $3`,
          [coords.lat, coords.lng, show.id]
        );
        console.log(`  ✅ Updated: ${coords.lat}, ${coords.lng}\n`);
        updated++;
      } else {
        console.log(`  ❌ Failed to geocode\n`);
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n✅ Backfill complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

backfillCoordinates();
