const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Fetching merch sales...');
    const response = await fetch('http://localhost:3001/api/merch/sales?entityId=1f60064e-3dc6-4612-a5c4-2be834806277');
    const data = await response.json();
    
    console.log('\nStats:', data.stats);
    console.log('\nFirst sale:', JSON.stringify(data.sales[0], null, 2));
    console.log('\nSample fields from first sale:');
    console.log('  total_money:', data.sales[0].total_money);
    console.log('  created_at:', data.sales[0].created_at);
    console.log('  location_id:', data.sales[0].location_id);
    console.log('  item_count:', data.sales[0].item_count);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
