const https = require('https');
const { Client } = require('pg');
require('dotenv').config();

async function geocodeAndUpdate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  await client.connect();
  console.log('✅ Connected to database\n');

  try {
    // Get shows with addresses but missing coordinates
    const result = await client.query(
      `SELECT id, city, venue_name, venue_address, venue_lat, venue_lng
       FROM shows
       WHERE tour_id = '9d21a757-70e4-4708-995b-b11057ce7fab'
         AND venue_address IS NOT NULL
         AND (venue_lat IS NULL OR venue_lng IS NULL)
       ORDER BY date ASC`,
      []
    );

    console.log(`📍 Found ${result.rows.length} shows with missing coordinates:\n`);

    if (result.rows.length === 0) {
      console.log('✅ All shows already have coordinates!');
      return;
    }

    for (const show of result.rows) {
      console.log(`🔍 Geocoding: ${show.venue_name} in ${show.city}`);
      console.log(`   Address: ${show.venue_address}`);

      try {
        // Use Google Geocoding API
        const address = encodeURIComponent(show.venue_address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

        const data = await new Promise((resolve, reject) => {
          https.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(e);
              }
            });
          }).on('error', reject);
        });

        if (data.status === 'OK' && data.results && data.results[0]) {
          const location = data.results[0].geometry.location;
          const lat = location.lat;
          const lng = location.lng;

          // Update database
          await client.query(
            'UPDATE shows SET venue_lat = $1, venue_lng = $2 WHERE id = $3',
            [lat, lng, show.id]
          );

          console.log(`   ✅ Updated: ${lat}, ${lng}\n`);
        } else {
          console.log(`   ❌ Geocoding failed: ${data.status}\n`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }

      // Small delay to respect API rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('🎉 Geocoding complete!\n');
    console.log('Next step: Run recalculate-tour-distances.js to update route distances');

  } finally {
    await client.end();
  }
}

geocodeAndUpdate().catch(console.error);
