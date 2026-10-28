const { SquareClient, SquareEnvironment } = require('square');
require('dotenv').config();

class SquareService {
  constructor() {
    try {
      const environment = process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox;

      this.client = new SquareClient({
        token: process.env.SQUARE_ACCESS_TOKEN,
        environment,
      });
      console.log('✅ SquareService initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing SquareService:', error.message);
      throw error;
    }
  }

  /**
   * Fetch orders from Square within a date range with pagination
   * @param {Date} beginTime - Start date
   * @param {Date} endTime - End date
   * @returns {Promise<Array>} Array of order objects
   */
  async fetchOrders(beginTime, endTime) {
    try {
      // First, fetch all location IDs
      const locationIds = await this.getLocationIds();
      
      let allOrders = [];
      let cursor = null;

      do {
        const requestBody = {
          locationIds,
          query: {
            filter: {
              dateTimeFilter: {
                createdAt: {
                  startAt: beginTime.toISOString(),
                  endAt: endTime.toISOString()
                }
              }
            },
            sort: {
              sortField: 'CREATED_AT',
              sortOrder: 'DESC'
            }
          },
          limit: 500
        };

        if (cursor) {
          requestBody.cursor = cursor;
        }

        const response = await this.client.orders.search(requestBody);

        // Response is directly the object, not wrapped in .result
        const orders = response.orders || response.result?.orders;
        if (orders && orders.length > 0) {
          allOrders = allOrders.concat(orders);
        }

        cursor = response.cursor || response.result?.cursor;
      } while (cursor);

      return allOrders;
    } catch (error) {
      console.error('Error fetching orders from Square:', error);
      throw new Error(`Square API error: ${error.message || error}`);
    }
  }

  /**
   * Get all location IDs for the Square account
   * @returns {Promise<Array<string>>} Array of location IDs
   */
  async getLocationIds() {
    try {
      console.log('Fetching Square locations...');
      const response = await this.client.locations.list();
      
      // Response is directly the object, not wrapped in .result
      const locations = response.locations || response.result?.locations;
      
      if (locations && locations.length > 0) {
        const locationIds = locations.map(loc => loc.id);
        console.log(`Found ${locationIds.length} Square locations:`, locationIds);
        return locationIds;
      }
      
      // If no locations in the response, return empty array or throw error
      console.warn('No locations found in Square account response');
      throw new Error('No locations found in Square account');
    } catch (error) {
      console.error('Error fetching locations from Square:', error);
      throw new Error(`Square API error: ${error.message || error}`);
    }
  }

  /**
   * Fetch ALL orders from Square account (all historical data)
   * @returns {Promise<Array>} Array of all order objects
   */
  async fetchAllOrders() {
    // Square API requires a begin time, so we'll use a date far in the past
    const beginTime = new Date('2015-01-01T00:00:00Z');
    const endTime = new Date();

    console.log(`Fetching ALL Square orders from ${beginTime.toISOString()} to ${endTime.toISOString()}...`);
    return this.fetchOrders(beginTime, endTime);
  }

  /**
   * Fetch orders since a specific date
   * @param {Date} sinceDate - Date to fetch orders from
   * @returns {Promise<Array>} Array of order objects
   */
  async fetchOrdersSince(sinceDate) {
    const endTime = new Date();
    return this.fetchOrders(sinceDate, endTime);
  }

  /**
   * Fetch orders for the last N days
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Array of order objects
   */
  async fetchRecentOrders(days = 30) {
    const endTime = new Date();
    const beginTime = new Date();
    beginTime.setDate(beginTime.getDate() - days);

    return this.fetchOrders(beginTime, endTime);
  }

  /**
   * Transform Square order to our format with item details
   * @param {Object} order - Square order object
   * @returns {Object} Transformed order with line items
   */
  transformOrder(order) {
    const lineItems = order.lineItems || [];
    const items = lineItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      variation: item.variationName || null,
      basePriceMoney: item.basePriceMoney?.amount || 0,
      totalMoney: item.totalMoney?.amount || 0,
      catalogObjectId: item.catalogObjectId || null,
    }));

    return {
      square_order_id: order.id,
      state: order.state,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      location_id: order.locationId,
      total_money: order.totalMoney?.amount || 0,
      currency: order.totalMoney?.currency || 'USD',
      items: items,
      item_count: lineItems.length,
      customer_id: order.customerId || null,
    };
  }
}

module.exports = SquareService;
