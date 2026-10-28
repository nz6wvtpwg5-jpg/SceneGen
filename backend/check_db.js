require('dotenv').config();
const pool = require('./db');

async function checkDB() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM merch_sales');
    console.log(`Total merch_sales in DB: ${result.rows[0].count}`);
    
    const itemsResult = await pool.query('SELECT COUNT(*) as count FROM merch_sale_items');
    console.log(`Total merch_sale_items in DB: ${itemsResult.rows[0].count}`);
    
    // Check recent orders
    const recentResult = await pool.query(`
      SELECT square_order_id, created_at, total_money, item_count 
      FROM merch_sales 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log(`\nMost recent orders in DB:`);
    recentResult.rows.forEach(row => {
      console.log(`  - ${row.square_order_id} (${row.created_at}) - $${row.total_money / 100} - ${row.item_count} items`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDB();
