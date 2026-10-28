require('dotenv').config();
const SquareService = require('./services/squareService');

async function checkItems() {
  try {
    const squareService = new SquareService();
    const orders = await squareService.fetchRecentOrders(7); // Last 7 days
    
    console.log(`\nFound ${orders.length} orders from last 7 days\n`);

    let itemsWithNullName = 0;
    let totalItems = 0;

    for (const order of orders.slice(0, 10)) {
      if (order.lineItems) {
        totalItems += order.lineItems.length;
        order.lineItems.forEach((item, idx) => {
          if (!item.name) {
            itemsWithNullName++;
            console.log(`\n⚠️  Order ${order.id} - Item ${idx + 1} has NULL name:`);
            console.log(`    quantity: ${item.quantity}`);
            console.log(`    catalogObjectId: ${item.catalogObjectId || 'NULL'}`);
            console.log(`    variationName: ${item.variationName || 'NULL'}`);
            console.log(`    basePriceMoney: ${JSON.stringify(item.basePriceMoney)}`);
            console.log(`    totalMoney: ${JSON.stringify(item.totalMoney)}`);
          }
        });
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`Total items checked: ${totalItems}`);
    console.log(`Items with NULL name: ${itemsWithNullName}`);
    console.log(`Percentage: ${totalItems > 0 ? ((itemsWithNullName / totalItems) * 100).toFixed(2) : 0}%`);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkItems();
