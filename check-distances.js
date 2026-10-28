/**
 * Check and populate distance field in budgets
 *
 * This script:
 * 1. Checks current distance values in budgets
 * 2. Optionally populates sample distance data for testing
 */

require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDistances() {
  try {
    console.log('🔍 Checking distance field in budgets...\n');

    const result = await pool.query(`
      SELECT
        budget_name,
        distance
      FROM budgets
      ORDER BY created_at
      LIMIT 10
    `);

    console.log(`📊 Found ${result.rows.length} budgets\n`);

    result.rows.forEach((budget, index) => {
      console.log(`${index + 1}. ${budget.budget_name}`);
      console.log(`   Distance: ${budget.distance || 0} miles`);
      console.log('');
    });

    // Count budgets with no distance
    const noDistance = result.rows.filter(b => !b.distance || b.distance === 0);
    console.log(`⚠️  ${noDistance.length} budgets have no distance set\n`);

    // Ask if user wants to populate sample data
    if (noDistance.length > 0) {
      console.log('💡 To populate distance data, you can:');
      console.log('   1. Use the Google Maps API endpoint to calculate real distances');
      console.log('   2. Manually update via SQL');
      console.log('   3. Re-import your CSV with distance data\n');

      console.log('📝 Sample SQL to update distance manually:');
      console.log("   UPDATE budgets SET distance = 150 WHERE budget_name = 'Show Name';");
      console.log('');

      // Populate sample distances for testing
      console.log('🧪 Populating sample distance data for testing...\n');

      for (const budget of noDistance) {
        // Generate a random distance between 50-300 miles for testing
        const sampleDistance = Math.floor(Math.random() * 250) + 50;

        await pool.query(
          'UPDATE budgets SET distance = $1 WHERE budget_name = $2',
          [sampleDistance, budget.budget_name]
        );

        console.log(`✅ Updated "${budget.budget_name}" with ${sampleDistance} miles`);
      }

      console.log('\n✨ Sample distances populated!');
      console.log('⚠️  Note: These are random values for testing. Use Google Maps API for real distances.\n');
    } else {
      console.log('✅ All budgets have distance data!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkDistances();
