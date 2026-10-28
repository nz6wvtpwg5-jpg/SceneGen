require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixEntityId() {
  const oldEntityId = 'd51c1b00-e4c8-46a7-ae1c-cb6f066d7481';
  const newEntityId = '1f60064e-3dc6-4612-a5c4-2be834806277';
  
  try {
    const result = await pool.query(
      'UPDATE shows SET entity_id = $1 WHERE entity_id = $2 RETURNING *',
      [newEntityId, oldEntityId]
    );
    console.log(`Updated ${result.rowCount} shows to new entity ID`);
    console.log('Shows:', result.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

fixEntityId();
