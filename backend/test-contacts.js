require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function testContactsQuery() {
  const entityId = '1f60064e-3dc6-4612-a5c4-2be834806277';

  console.log('Testing with entityId:', entityId);
  console.log('Type:', typeof entityId);

  try {
    const query = `SELECT c.*, e.name as contact_name, e.entity_type as contact_type,
              e.city as contact_city, e.state as contact_state
       FROM contacts c
       JOIN entities e ON (c.entity_a_id = e.id OR c.entity_b_id = e.id)
       WHERE (c.entity_a_id = $1::uuid OR c.entity_b_id = $1::uuid)
         AND e.id != $1::uuid
         AND c.status = 'accepted'
       ORDER BY e.name ASC`;

    console.log('\nQuery:', query);
    console.log('\nExecuting...');

    const result = await pool.query(query, [entityId]);

    console.log('\n✅ Success! Found', result.rows.length, 'contacts');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testContactsQuery();
