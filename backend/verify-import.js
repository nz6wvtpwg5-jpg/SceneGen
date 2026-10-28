require('dotenv').config();
const pool = require('./db');

async function verifyImport() {
  try {
    const result = await pool.query(`
      SELECT
        venue_name,
        date,
        capacity,
        promoter_name,
        promoter_phone,
        promoter_email
      FROM shows
      WHERE date BETWEEN '2026-03-30' AND '2026-04-29'
      ORDER BY date
    `);

    console.log('\n📊 VENUE DATA IMPORT SUMMARY\n');
    console.log('Total shows:', result.rows.length);

    const withCapacity = result.rows.filter(r => r.capacity !== null);
    const withPromoter = result.rows.filter(r => r.promoter_name !== null);

    console.log('Shows with capacity:', withCapacity.length);
    console.log('Shows with promoter info:', withPromoter.length);

    console.log('\n📋 SHOWS MISSING DATA:\n');
    let missingCount = 0;
    result.rows.forEach(r => {
      if (!r.capacity || !r.promoter_name) {
        const dateStr = r.date.toISOString().split('T')[0];
        const missing = [];
        if (!r.capacity) missing.push('capacity');
        if (!r.promoter_name) missing.push('promoter');
        console.log(`  ${dateStr} - ${r.venue_name} (missing: ${missing.join(', ')})`);
        missingCount++;
      }
    });

    if (missingCount === 0) {
      console.log('  ✓ All shows have complete data!');
    }

    console.log('\n✅ SAMPLE OF UPDATED SHOWS:\n');
    result.rows.slice(0, 5).forEach(r => {
      const dateStr = r.date.toISOString().split('T')[0];
      console.log(`${dateStr} - ${r.venue_name}`);
      console.log(`  Capacity: ${r.capacity || 'N/A'}`);
      console.log(`  Promoter: ${r.promoter_name || 'N/A'}`);
      console.log(`  Phone: ${r.promoter_phone || 'N/A'}`);
      console.log(`  Email: ${r.promoter_email || 'N/A'}\n`);
    });

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    await pool.end();
  }
}

verifyImport();
