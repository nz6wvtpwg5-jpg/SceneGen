// Populate distance field with sample data
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('🧪 Populating sample distances...\n');

  const budgets = await pool.query('SELECT id, budget_name, distance FROM budgets');
  console.log(`Found ${budgets.rows.length} budgets\n`);

  for (const budget of budgets.rows) {
    const currentDistance = parseFloat(budget.distance) || 0;

    if (currentDistance === 0) {
      const randomDistance = Math.floor(Math.random() * 250) + 50;
      await pool.query('UPDATE budgets SET distance = $1 WHERE id = $2', [randomDistance, budget.id]);
      console.log(`✅ ${budget.budget_name}: ${randomDistance} miles`);
    } else {
      console.log(`ℹ️  ${budget.budget_name}: ${currentDistance} miles (already set)`);
    }
  }

  console.log('\n✨ Done!');
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });
