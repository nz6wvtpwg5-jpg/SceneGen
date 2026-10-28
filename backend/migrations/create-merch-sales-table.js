require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('../db');

async function createMerchSalesTable() {
  const client = await pool.connect();

  try {
    console.log('Creating merch_sales table...');

    // Create merch_sales table
    await client.query(`
      CREATE TABLE IF NOT EXISTS merch_sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_id UUID NOT NULL,
        square_payment_id TEXT UNIQUE NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        location_id TEXT,
        show_id UUID,
        matched BOOLEAN DEFAULT false,
        synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ merch_sales table created successfully');

    // Create indexes for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merch_sales_entity_id ON merch_sales(entity_id)
    `);
    console.log('✓ Entity ID index created successfully');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merch_sales_show_id ON merch_sales(show_id)
    `);
    console.log('✓ Show ID index created successfully');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merch_sales_created_at ON merch_sales(created_at)
    `);
    console.log('✓ Created_at index created successfully');

    console.log('\n✅ All merch_sales table and indexes created successfully!');
  } catch (error) {
    console.error('❌ Error creating merch_sales table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createMerchSalesTable().catch(console.error);
