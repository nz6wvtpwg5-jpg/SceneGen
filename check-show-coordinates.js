require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/db');

async function checkCoordinates() {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.date,
        s.city,
        s.state,
        s.venue_name,
        s.latitude,
        s.longitude,
        s.tour_id,
        t.name as tour_name,
        CASE
          WHEN s.latitude IS NOT NULL AND s.longitude IS NOT NULL THEN '✅'
          ELSE '❌'
        END as has_coords
      FROM shows s
      LEFT JOIN tours t ON s.tour_id = t.id
      ORDER BY s.created_at DESC
      LIMIT 10
    `);

    console.log('\n📍 Last 10 Shows - Coordinate Check:\n');
    result.rows.forEach((row) => {
      console.log(`${row.has_coords} ${row.city}, ${row.state} - ${row.venue_name}`);
      console.log(`   Date: ${row.date}`);
      console.log(`   Tour: ${row.tour_name || 'No tour'}`);
      console.log(`   Lat/Lng: ${row.latitude || 'NULL'}, ${row.longitude || 'NULL'}`);
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCoordinates();
