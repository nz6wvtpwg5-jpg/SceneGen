const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env.local from parent directory
const envPath = path.join(__dirname, '.env.local');
let DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (match) {
    DATABASE_URL = match[1].trim();
  }
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

console.log('Connecting to NeonDB...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkData() {
  try {
    console.log('\n=== TOURS ===');
    const tours = await pool.query('SELECT id, name, start_date, end_date, user_id FROM tours ORDER BY created_at DESC LIMIT 5');
    console.table(tours.rows);

    console.log('\n=== SHOWS (with tour info) ===');
    const shows = await pool.query('SELECT id, title, show_date, tour_id, user_id FROM shows ORDER BY created_at DESC LIMIT 10');
    console.table(shows.rows);

    console.log('\n=== Shows count by tour_id ===');
    const counts = await pool.query('SELECT tour_id, COUNT(*) as count FROM shows GROUP BY tour_id ORDER BY tour_id');
    console.table(counts.rows);

    if (tours.rows.length > 0) {
      const tourId = tours.rows[0].id;
      console.log(`\n=== Shows for tour ID ${tourId} ===`);
      const tourShows = await pool.query('SELECT id, title, show_date, tour_id FROM shows WHERE tour_id = $1', [tourId]);
      console.table(tourShows.rows);
    }

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

checkData();
