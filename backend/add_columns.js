require('dotenv').config();
const pool = require('./db');

async function addColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding missing columns...\n');

    // Add alias column to entities
    console.log('Adding alias column...');
    await client.query(`
      ALTER TABLE entities 
      ADD COLUMN IF NOT EXISTS alias VARCHAR(50) UNIQUE
    `);

    // Add members column to entities
    console.log('Adding members column...');
    await client.query(`
      ALTER TABLE entities 
      ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb
    `);

    // Add tags column to entities
    console.log('Adding tags column...');
    await client.query(`
      ALTER TABLE entities 
      ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb
    `);

    // Add token column to invites
    console.log('Adding token column to invites...');
    await client.query(`
      ALTER TABLE invites 
      ADD COLUMN IF NOT EXISTS token VARCHAR(255) UNIQUE
    `);

    console.log('\n✅ All columns added successfully!');
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addColumns().then(() => {
  console.log('\n🎉 Database schema updated!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Migration error:', error);
  process.exit(1);
});
