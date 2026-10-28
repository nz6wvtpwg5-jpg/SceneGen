require('dotenv').config();
const pool = require('./db');

async function listTours() {
  try {
    console.log('📋 All tours in database:\n');

    const result = await pool.query(`
      SELECT id, entity_id, name, start_date, end_date, created_at
      FROM tours
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('   No tours found in database.');
    } else {
      result.rows.forEach((tour, index) => {
        console.log(`${index + 1}. "${tour.name}"`);
        console.log(`   ID:        ${tour.id}`);
        console.log(`   Entity ID: ${tour.entity_id}`);
        console.log(`   Dates:     ${tour.start_date} to ${tour.end_date}`);
        console.log(`   Match:     ${tour.id.toString() === tour.entity_id ? '⚠️  YES (BUG!)' : '✅ No'}`);
        console.log('');
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

listTours();
