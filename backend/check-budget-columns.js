require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

async function checkAndAddColumns() {
  try {
    console.log('🔍 Checking budgets table columns...');

    // Check if columns exist
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'budgets'
      ORDER BY ordinal_position
    `);

    console.log('📋 Current columns in budgets table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    const columnNames = result.rows.map(row => row.column_name);

    // Add total_sales if it doesn't exist
    if (!columnNames.includes('total_sales')) {
      console.log('\n➕ Adding total_sales column...');
      await pool.query(`
        ALTER TABLE budgets
        ADD COLUMN total_sales DECIMAL(10, 2) DEFAULT 0
      `);
      console.log('✅ total_sales column added');
    } else {
      console.log('✅ total_sales column already exists');
    }

    // Add total_expenses if it doesn't exist
    if (!columnNames.includes('total_expenses')) {
      console.log('\n➕ Adding total_expenses column...');
      await pool.query(`
        ALTER TABLE budgets
        ADD COLUMN total_expenses DECIMAL(10, 2) DEFAULT 0
      `);
      console.log('✅ total_expenses column added');
    } else {
      console.log('✅ total_expenses column already exists');
    }

    console.log('\n✅ Database schema check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAndAddColumns();
