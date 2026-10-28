#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    console.log('🔍 Looking for orphaned shows...');

    // Delete all orphaned shows with test-entity-123
    const result = await pool.query('DELETE FROM shows WHERE entity_id = $1', ['test-entity-123']);
    console.log('✅ Deleted', result.rowCount, 'orphaned show(s) with entity_id = test-entity-123');

    // Verify
    const remaining = await pool.query('SELECT COUNT(*) as count FROM shows');
    console.log('📊 Total shows remaining in database:', remaining.rows[0].count);

    await pool.end();
    console.log('✨ Cleanup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
