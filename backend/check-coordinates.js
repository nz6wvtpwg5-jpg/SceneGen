const { Client } = require('pg');
require('dotenv').config();

async function checkCoordinates() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  await client.connect();
  console.log('✅ Connected to database\n');

  try {
    // Check shows for the tour
    const result = await client.query(
      `SELECT id, city, venue_name, venue_lat, venue_lng, venue_address
       FROM shows
       WHERE tour_id = '9d21a757-70e4-4708-995b-b11057ce7fab'
       ORDER BY date ASC`,
      []
    );

    console.log(`📍 Found ${result.rows.length} shows:\n`);

    result.rows.forEach((show, i) => {
      const hasCoords = !!(show.venue_lat && show.venue_lng);
      const icon = hasCoords ? '✅' : '❌';
      console.log(`${icon} ${i+1}. ${show.city} - ${show.venue_name}`);
      console.log(`   Coords: ${show.venue_lat ? `${show.venue_lat}, ${show.venue_lng}` : 'MISSING'}`);
      console.log(`   Address: ${show.venue_address || 'MISSING'}`);
      console.log('');
    });

    const withCoords = result.rows.filter(s => s.venue_lat && s.venue_lng).length;
    const withoutCoords = result.rows.length - withCoords;

    console.log(`\n📊 Summary:`);
    console.log(`   Total shows: ${result.rows.length}`);
    console.log(`   With coordinates: ${withCoords} ✅`);
    console.log(`   Without coordinates: ${withoutCoords} ❌`);

  } finally {
    await client.end();
  }
}

checkCoordinates().catch(console.error);
