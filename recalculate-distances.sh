#!/bin/bash

# Recalculate Tour Distances Script
# This calls the backend API to recalculate distances using accurate Directions API

BACKEND_URL="http://localhost:3001"
TOUR_ID="9d21a757-70e4-4708-995b-b11057ce7fab"
ENTITY_ID="1f60064e-3dc6-4612-a5c4-2be834806277"

# Since this is a backend-to-backend call, we'll need to get a real token
# For now, let's call the backend directly from a small Node script

cat > /tmp/recalc.js << 'EOF'
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Read .env file from backend - use absolute path
const PROJECT_ROOT = process.cwd();
const envPath = path.join(PROJECT_ROOT, 'backend', '.env');
console.log('📁 Reading env from:', envPath);

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const TOUR_ID = '9d21a757-70e4-4708-995b-b11057ce7fab';
const ENTITY_ID = '1f60064e-3dc6-4612-a5c4-2be834806277';

console.log('🗺️  Recalculating distances for Tour Mar 2026...\n');

// Use PostgreSQL directly
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  await client.connect();

  try {
    // Get all shows
    const showsResult = await client.query(
      `SELECT id, date, city, venue_name, latitude, longitude
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

      if (!prev.latitude || !curr.latitude) {
        console.log(`   ⚠️  Missing coords: ${prev.city} → ${curr.city}`);
        continue;
      }

      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${prev.latitude},${prev.longitude}&destination=${curr.latitude},${curr.longitude}&key=${env.GOOGLE_MAPS_API_KEY}`;

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

          console.log(`   ✅ ${prev.city} → ${curr.city}: ${Math.round(miles)} miles`);
          totalMiles += miles;
          count++;
        }
      } catch (err) {
        console.log(`   ❌ Error: ${prev.city} → ${curr.city}`);
      }

      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n✅ Updated ${count} distances`);
    console.log(`📊 Total: ${Math.round(totalMiles).toLocaleString()} miles\n`);
    console.log('🎉 Done! Refresh your browser.\n');

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
EOF

cd "$(dirname "$0")/backend" && node /tmp/recalc.js
