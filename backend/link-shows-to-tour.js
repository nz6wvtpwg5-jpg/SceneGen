const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env from backend directory
const envPath = path.join(__dirname, '.env');
let DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (match) {
    DATABASE_URL = match[1].trim();
  }
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in backend/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function linkShowsToTour() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get the HPS Feb 2026 tour
    const tourResult = await client.query(`
      SELECT id, name, start_date, end_date, entity_id
      FROM tours
      WHERE name = 'HPS Feb 2026'
    `);

    if (tourResult.rows.length === 0) {
      console.error('HPS Feb 2026 tour not found');
      await client.query('ROLLBACK');
      process.exit(1);
    }

    const tour = tourResult.rows[0];
    console.log('Found tour:', {
      id: tour.id,
      name: tour.name,
      startDate: tour.start_date,
      endDate: tour.end_date,
      entityId: tour.entity_id
    });

    // Find shows that fall within the tour dates and belong to the same entity
    const showsResult = await client.query(`
      SELECT id, venue_name, city, date, entity_id, tour_id
      FROM shows
      WHERE entity_id = $1
        AND date >= $2
        AND date <= $3
    `, [tour.entity_id, tour.start_date, tour.end_date]);

    console.log(`\nFound ${showsResult.rows.length} shows within tour dates:`);
    showsResult.rows.forEach(show => {
      console.log(`  - ${show.venue_name}, ${show.city} on ${show.date.toISOString().split('T')[0]} (tour_id: ${show.tour_id || 'null'})`);
    });

    if (showsResult.rows.length === 0) {
      console.log('\nNo shows found within tour dates.');
      await client.query('ROLLBACK');
      client.release();
      await pool.end();
      return;
    }

    // Update shows to link them to the tour
    const updateResult = await client.query(`
      UPDATE shows
      SET tour_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE entity_id = $2
        AND date >= $3
        AND date <= $4
      RETURNING id, venue_name, city, date
    `, [tour.id, tour.entity_id, tour.start_date, tour.end_date]);

    console.log(`\n✅ Successfully linked ${updateResult.rows.length} shows to tour "${tour.name}":`);
    updateResult.rows.forEach(show => {
      console.log(`  - ${show.venue_name}, ${show.city} on ${show.date.toISOString().split('T')[0]}`);
    });

    await client.query('COMMIT');
    console.log('\n✅ Changes committed to database');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

linkShowsToTour().catch(console.error);
