/**
 * Geocode shows by venue name + city + state
 * For the recently imported tour
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const GOOGLE_MAPS_API_KEY = String(process.env.GOOGLE_MAPS_API_KEY || '').trim();
if (!GOOGLE_MAPS_API_KEY) {
  throw new Error('GOOGLE_MAPS_API_KEY is required');
}

async function geocodeVenue(venueName, city, state) {
  return new Promise((resolve, reject) => {
    const searchQuery = `${venueName}, ${city}, ${state}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${GOOGLE_MAPS_API_KEY}`;

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
            const formatted = response.results[0].formatted_address;
            resolve({
              lat: location.lat,
              lng: location.lng,
              address: formatted,
            });
          } else {
            console.log(`   ⚠️  No results for: ${searchQuery}`);
            resolve(null);
          }
        } catch (error) {
          console.error('   ❌ Parse error:', error.message);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error('   ❌ Request error:', error.message);
      resolve(null);
    });
  });
}

async function geocodeLatestTour() {
  try {
    // Get the latest tour
    const tourResult = await pool.query(`
      SELECT id, name
      FROM tours
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (tourResult.rows.length === 0) {
      console.log('No tours found');
      return;
    }

    const tour = tourResult.rows[0];
    console.log(`\n🗺️  Geocoding shows for: "${tour.name}"\n`);

    // Get all shows for this tour that don't have coordinates
    const showsResult = await pool.query(`
      SELECT id, venue_name, city, state, date
      FROM shows
      WHERE tour_id = $1
        AND (venue_lat IS NULL OR venue_lng IS NULL)
        AND show_type != 'off_day'
      ORDER BY date
    `, [tour.id]);

    console.log(`📍 Found ${showsResult.rows.length} shows without coordinates\n`);

    let updated = 0;
    let failed = 0;

    for (const show of showsResult.rows) {
      console.log(`${show.date.toISOString().split('T')[0]} | ${show.venue_name} (${show.city}, ${show.state})`);

      const coords = await geocodeVenue(show.venue_name, show.city, show.state);

      if (coords) {
        await pool.query(
          `UPDATE shows
           SET venue_lat = $1, venue_lng = $2, venue_address = $3
           WHERE id = $4`,
          [coords.lat, coords.lng, coords.address, show.id]
        );
        console.log(`   ✅ ${coords.address.substring(0, 60)}`);
        console.log(`   📍 ${coords.lat}, ${coords.lng}\n`);
        updated++;
      } else {
        failed++;
        console.log('');
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\n✅ Complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

geocodeLatestTour();
