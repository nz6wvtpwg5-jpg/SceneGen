/**
 * Create budget_line_items table
 *
 * This table stores individual line items for budgets,
 * preserving the exact names and amounts entered by users.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTable() {
  try {
    console.log('🔨 Creating budget_line_items table...\n');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS budget_line_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('revenue', 'expense')),
        category VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Table created successfully');

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_line_items_budget_id
      ON budget_line_items(budget_id);
    `);

    console.log('✅ Index created on budget_id');

    // Create index for item_type filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_line_items_type
      ON budget_line_items(budget_id, item_type);
    `);

    console.log('✅ Index created on budget_id + item_type\n');

    console.log('🎉 Table creation complete!\n');

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createTable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
