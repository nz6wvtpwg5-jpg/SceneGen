/**
 * Migrate Existing Budgets to Use Line Items
 *
 * This script updates existing budgets that only have total_sales and total_expenses
 * to include individual line item breakdowns.
 *
 * For existing budgets, we'll make reasonable assumptions:
 * - All revenue goes to ticket_sales (can be manually corrected later)
 * - Agent commission is 10% of total sales
 * - Remaining expenses go to extra_expenses
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateBudgets() {
  try {
    console.log('🔄 Starting budget migration...\n');

    // Find budgets with totals but no line items
    const result = await pool.query(`
      SELECT id, budget_name, total_sales, total_expenses, agent_commission_percent
      FROM budgets
      WHERE total_sales IS NOT NULL
        AND total_sales > 0
        AND ticket_sales IS NULL
    `);

    console.log(`Found ${result.rows.length} budgets to migrate\n`);

    if (result.rows.length === 0) {
      console.log('✅ No budgets need migration');
      return;
    }

    let migrated = 0;

    for (const budget of result.rows) {
      console.log(`📝 Migrating: ${budget.budget_name}`);
      console.log(`   Total Sales: €${budget.total_sales}`);
      console.log(`   Total Expenses: €${budget.total_expenses}`);

      const totalSales = parseFloat(budget.total_sales);
      const totalExpenses = parseFloat(budget.total_expenses);
      const agentPercent = parseFloat(budget.agent_commission_percent) || 10;

      // Calculate agent commission
      const agentCommission = (totalSales * agentPercent) / 100;

      // Put all remaining expenses into extra_expenses
      const extraExpenses = totalExpenses - agentCommission;

      // Update the budget with line items
      await pool.query(`
        UPDATE budgets
        SET
          ticket_sales = $1,
          agent_commission = $2,
          extra_expenses = $3
        WHERE id = $4
      `, [totalSales, agentCommission, extraExpenses > 0 ? extraExpenses : 0, budget.id]);

      console.log(`   ✅ Set ticket_sales = €${totalSales.toFixed(2)}`);
      console.log(`   ✅ Set agent_commission = €${agentCommission.toFixed(2)} (${agentPercent}%)`);
      if (extraExpenses > 0) {
        console.log(`   ✅ Set extra_expenses = €${extraExpenses.toFixed(2)}`);
      }
      console.log('');

      migrated++;
    }

    console.log(`\n🎉 Successfully migrated ${migrated} budgets!`);
    console.log('\n💡 Note: All revenue was assigned to ticket_sales.');
    console.log('   You can edit budgets to split between tickets and merch if needed.\n');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
migrateBudgets()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
