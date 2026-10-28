require('dotenv').config();
const pool = require('./db');

async function checkMissingVenues() {
  try {
    const result = await pool.query(`
      SELECT id, venue_name, date
      FROM shows
      WHERE date BETWEEN '2026-03-31' AND '2026-04-27'
      ORDER BY date
    `);

    console.log('All shows in the tour date range:\n');
    result.rows.forEach(r => {
      const dateStr = r.date.toISOString().split('T')[0];
      console.log(`${dateStr} - ${r.venue_name}`);
    });

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    await pool.end();
  }
}

checkMissingVenues();
