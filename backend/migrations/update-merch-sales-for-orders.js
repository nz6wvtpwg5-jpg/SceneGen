require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('../db');

async function updateMerchSalesTable() {
  const client = await pool.connect();

  try {
    console.log('Dropping old merch_sales table if exists...');

    // Drop the old table
    await client.query(`DROP TABLE IF EXISTS merch_sales CASCADE`);
    console.log('✓ Old table dropped');

    // Create new merch_sales table with order and item details
    await client.query(`
      CREATE TABLE merch_sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_id UUID NOT NULL,
        square_order_id TEXT UNIQUE NOT NULL,
        total_money INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        state TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP,
        location_id TEXT,
        show_id UUID,
        matched BOOLEAN DEFAULT false,
        synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
        item_count INTEGER DEFAULT 0,
        customer_id TEXT,
        FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ merch_sales table created successfully');

    // Create merch_sale_items table for individual line items
    await client.query(`
      CREATE TABLE IF NOT EXISTS merch_sale_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merch_sale_id UUID NOT NULL,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        variation TEXT,
        base_price_money INTEGER,
        total_money INTEGER,
        catalog_object_id TEXT,
        FOREIGN KEY (merch_sale_id) REFERENCES merch_sales(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ merch_sale_items table created successfully');

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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merch_sale_items_sale_id ON merch_sale_items(merch_sale_id)
    `);
    console.log('✓ Sale items index created successfully');

    console.log('\n✅ All merch sales tables and indexes created successfully!');
  } catch (error) {
    console.error('❌ Error updating merch_sales table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateMerchSalesTable().catch(console.error);
