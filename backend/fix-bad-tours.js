require('dotenv').config();
const pool = require('./db');

async function fixBadTour() {
  const client = await pool.connect();

  try {
    console.log('🔍 Finding and fixing bad tour data...\n');

    // Find tours where id = entity_id (the bug)
    const badTours = await client.query(`
      SELECT id, entity_id, name, start_date, end_date
      FROM tours
      WHERE id::text = entity_id
    `);

    if (badTours.rows.length === 0) {
      console.log('✅ No bad tours found! Database is clean.');
      return;
    }

    console.log(`🚨 Found ${badTours.rows.length} bad tour(s):\n`);
    badTours.rows.forEach(tour => {
      console.log(`   - "${tour.name}" (ID: ${tour.id})`);
    });

    console.log('\n🗑️  Deleting bad tours...\n');

    // Delete the bad tours
    const deleteResult = await client.query(`
      DELETE FROM tours
      WHERE id::text = entity_id
      RETURNING name
    `);

    console.log(`✅ Deleted ${deleteResult.rows.length} bad tour(s):`);
    deleteResult.rows.forEach(tour => {
      console.log(`   - ${tour.name}`);
    });

    console.log('\n✨ Database cleaned successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});

async function runMigration() {
  await fixBadTour();
}
