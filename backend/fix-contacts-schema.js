const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log('\n🔧 Fixing contacts table schema...\n');

    // Alter the columns to UUID type
    const queries = [
      'ALTER TABLE contacts ALTER COLUMN entity_a_id TYPE uuid USING entity_a_id::uuid',
      'ALTER TABLE contacts ALTER COLUMN entity_b_id TYPE uuid USING entity_b_id::uuid',
      'ALTER TABLE contacts ALTER COLUMN requested_by TYPE uuid USING requested_by::uuid'
    ];

    for (const query of queries) {
      console.log(`Executing: ${query}`);
      await pool.query(query);
      console.log('✅ Success\n');
    }

    console.log('🎉 All columns updated to UUID!');

    // Verify the changes
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'contacts' AND column_name IN ('entity_a_id', 'entity_b_id', 'requested_by')
      ORDER BY column_name
    `);

    console.log('\n📋 Updated Schema:');
    console.log('='.repeat(50));
    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} ${row.data_type}`);
    });
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
})();
