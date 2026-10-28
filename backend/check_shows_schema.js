require('dotenv').config();
const pool = require('./db');

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'shows'
      ORDER BY ordinal_position
    `);
    
    console.log('Shows table schema:');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(nullable)'}`);
    });
    
    // Get a sample show
    const sampleResult = await pool.query(`
      SELECT * FROM shows 
      WHERE entity_id = '1f60064e-3dc6-4612-a5c4-2be834806277'
      ORDER BY date DESC 
      LIMIT 1
    `);
    
    console.log('\nSample show:');
    if (sampleResult.rows.length > 0) {
      console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();
