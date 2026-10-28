require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanupOrphanedShows() {
  try {
    console.log('\n=== Deleting Orphaned Shows ===');

    // Delete shows with null tour_id
    const result = await pool.query(`
      DELETE FROM shows
      WHERE tour_id IS NULL
      AND entity_id = '1f60064e-3dc6-4612-a5c4-2be834806277'
      RETURNING id, venue_name, city
    `);

    console.log(`\nDeleted ${result.rows.length} orphaned shows:`);
    result.rows.forEach(show => {
      console.log(`  - ${show.venue_name} (${show.city}) - ID: ${show.id}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

cleanupOrphanedShows();
