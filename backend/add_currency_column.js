const { Client } = require('pg');
require('dotenv').config();

async function addCurrencyColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add currency column if it doesn't exist
    console.log('Adding currency column to shows table...');
    await client.query(`
      ALTER TABLE shows
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
    `);

    console.log('✅ Currency column added successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addCurrencyColumn()
  .then(() => {
    console.log('Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
