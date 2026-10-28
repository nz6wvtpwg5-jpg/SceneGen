require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDatabase() {
  try {
    console.log('\n=== CURRENT TOURS ===');
    const toursResult = await pool.query(`
      SELECT id, entity_id, name, start_date, end_date, created_at
      FROM tours
      ORDER BY start_date
    `);

    toursResult.rows.forEach(tour => {
      console.log(`\nTour: ${tour.name}`);
      console.log(`  ID: ${tour.id}`);
      console.log(`  Entity ID: ${tour.entity_id}`);
      console.log(`  Dates: ${tour.start_date} to ${tour.end_date}`);
      console.log(`  Created: ${tour.created_at}`);
    });

    console.log('\n=== CURRENT SHOWS ===');
    const showsResult = await pool.query(`
      SELECT id, entity_id, venue_name, city, state, date, tour_id, created_at
      FROM shows
      ORDER BY date
    `);

    showsResult.rows.forEach(show => {
      console.log(`\nShow: ${show.venue_name}`);
      console.log(`  ID: ${show.id}`);
      console.log(`  Entity ID: ${show.entity_id}`);
      console.log(`  City: ${show.city}, ${show.state}`);
      console.log(`  Date: ${show.date}`);
      console.log(`  Tour ID: ${show.tour_id}`);
      console.log(`  Created: ${show.created_at}`);
    });

    console.log('\n\n=== SUMMARY ===');
    console.log(`Total Tours: ${toursResult.rows.length}`);
    console.log(`Total Shows: ${showsResult.rows.length}`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDatabase();
