const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TOUR_ID = '9d21a757-70e4-4708-995b-b11057ce7fab';
const ENTITY_ID = '1f60064e-3dc6-4612-a5c4-2be834806277';

console.log('🗺️  Recalculating distances for Tour Mar 2026...\n');

const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  await client.connect();
  console.log('✅ Connected to database\n');

  try {
    const showsResult = await client.query(
      `SELECT id, date, city, venue_name, venue_lat, venue_lng
       FROM shows
       WHERE tour_id = $1 AND entity_id = $2
       ORDER BY date ASC`,
      [TOUR_ID, ENTITY_ID]
    );

    const shows = showsResult.rows;
    console.log(`📍 Found ${shows.length} shows\n`);

    if (shows.length < 2) {
      console.log('⚠️  Not enough shows');
      return;
    }

    let totalMiles = 0;
    let count = 0;

    for (let i = 1; i < shows.length; i++) {
      const prev = shows[i - 1];
      const curr = shows[i];

      if (!prev.venue_lat || !curr.venue_lat) {
        console.log(`   ⚠️  Missing coords: ${prev.city} → ${curr.city}`);
        continue;
      }

      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${prev.venue_lat},${prev.venue_lng}&destination=${curr.venue_lat},${curr.venue_lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.routes[0]) {
          const meters = data.routes[0].legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
          const miles = meters / 1609.34;
          const rounded = Math.round(miles * 10) / 10;

          await client.query(
            'UPDATE budgets SET distance = $1 WHERE show_id = $2 AND entity_id = $3',
            [rounded, curr.id, ENTITY_ID]
          );

          console.log(`   ✅ ${prev.city} → ${curr.city}: ${Math.round(miles)} miles (actual route)`);
          totalMiles += miles;
          count++;
        } else {
          console.log(`   ⚠️  API returned: ${data.status} for ${prev.city} → ${curr.city}`);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${prev.city} → ${curr.city} - ${err.message}`);
      }

      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n✅ Updated ${count} distances`);
    console.log(`📊 Total: ${Math.round(totalMiles).toLocaleString()} miles\n`);
    console.log('🎉 Done! Refresh your browser to see the updated mileage.\n');

  } finally {
    await client.end();
  }
}

// Simple fetch for Node
global.fetch = function(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, json: async () => JSON.parse(data) });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
};

main().catch(console.error);
