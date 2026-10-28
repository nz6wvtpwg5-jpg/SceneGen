const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateDistances() {
  try {
    console.log('🔌 Connecting to database...');

    // Update distances
    console.log('\n📝 Updating distances...');

    const result1 = await pool.query(
      "UPDATE budgets SET distance = 0 WHERE budget_name LIKE 'Lexington%'"
    );
    console.log(`✅ Lexington: ${result1.rowCount} row(s) updated`);

    const result2 = await pool.query(
      "UPDATE budgets SET distance = 320 WHERE budget_name LIKE 'Atlants GA%' OR budget_name LIKE 'Atlanta%'"
    );
    console.log(`✅ Atlanta: ${result2.rowCount} row(s) updated`);

    const result3 = await pool.query(
      "UPDATE budgets SET distance = 440 WHERE budget_name LIKE 'Orlando%'"
    );
    console.log(`✅ Orlando: ${result3.rowCount} row(s) updated`);

    // Verify
    console.log('\n📊 Current distances:');
    const verify = await pool.query(`
      SELECT b.budget_name, b.distance, s.city, s.date
      FROM budgets b
      JOIN shows s ON b.show_id = s.id
      WHERE b.budget_name LIKE '%Lexington%'
         OR b.budget_name LIKE '%Atlanta%'
         OR b.budget_name LIKE '%Atlants%'
         OR b.budget_name LIKE '%Orlando%'
      ORDER BY s.date
    `);

    console.table(verify.rows);

    const total = verify.rows.reduce((sum, row) => sum + parseFloat(row.distance || 0), 0);
    console.log(`\n🎯 Total miles: ${total} mi`);

    console.log('\n✅ Done! Refresh the Tours page to see updated miles.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateDistances();
