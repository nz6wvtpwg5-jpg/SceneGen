require('dotenv').config();
const SquareService = require('./services/squareService');

async function checkItems() {
  try {
    console.log('Fetching ALL orders from Square...');
    const squareService = new SquareService();
    const orders = await squareService.fetchAllOrders();
    
    console.log(`\nFound ${orders.length} total orders\n`);

    let itemsWithNullName = 0;
    let totalItems = 0;
    let ordersWithNullItems = [];

    for (const order of orders) {
      if (order.lineItems) {
        totalItems += order.lineItems.length;
        let hasNullItem = false;
        
        order.lineItems.forEach((item, idx) => {
          if (!item.name) {
            itemsWithNullName++;
            hasNullItem = true;
          }
        });
        
        if (hasNullItem) {
          ordersWithNullItems.push({
            id: order.id,
            createdAt: order.createdAt,
            state: order.state,
            itemsCount: order.lineItems.length
          });
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`Total orders: ${orders.length}`);
    console.log(`Total items checked: ${totalItems}`);
    console.log(`Items with NULL name: ${itemsWithNullName}`);
    console.log(`Orders with NULL name items: ${ordersWithNullItems.length}`);
    console.log(`Percentage: ${totalItems > 0 ? ((itemsWithNullName / totalItems) * 100).toFixed(2) : 0}%`);
    
    if (ordersWithNullItems.length > 0) {
      console.log(`\n⚠️  First 5 orders with NULL items:`);
      ordersWithNullItems.slice(0, 5).forEach(o => {
        console.log(`  - ${o.id} (${o.createdAt}) - State: ${o.state} - Items: ${o.itemsCount}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkItems();
