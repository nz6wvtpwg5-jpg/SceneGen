/**
 * SceneGen Merch Analytics - Analytics Engine
 * Build comprehensive analytics from merch sales data
 */

import {
  MerchSale,
  MerchAnalytics,
  MerchItem,
  SizeBreakdown,
  ProductPerformance,
  GarmentTypeBreakdown,
  ShowAnalytics,
  CityAnalytics,
  MonthlyAnalytics,
  SeasonalAnalytics,
  MerchDesign,
  AnalyticsOptions,
  NormalizedMerchItem,
} from './types';
import { normalizeItem, normalizeItems } from './normalizeMerchItem';
import { SIZE_ORDER, getSeasonFromDate, CATEGORY_MAP } from './constants';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply date range filter to sales
 */
function applyDateRangeFilter(
  sales: MerchSale[],
  dateRange?: { start: string; end: string }
): MerchSale[] {
  if (!dateRange) return sales;
  
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  return sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    return saleDate >= startDate && saleDate <= endDate;
  });
}

/**
 * Apply filters to sales data
 */
function applyFilters(sales: MerchSale[], options?: AnalyticsOptions): MerchSale[] {
  let filtered = [...sales];
  
  // Date range filter
  if (options?.dateRange) {
    filtered = applyDateRangeFilter(filtered, options.dateRange);
  }
  
  // Show filter
  if (options?.showIds && options.showIds.length > 0) {
    filtered = filtered.filter(sale => 
      sale.showId && options.showIds!.includes(sale.showId)
    );
  }
  
  // City filter
  if (options?.cities && options.cities.length > 0) {
    filtered = filtered.filter(sale => 
      sale.showCity && options.cities!.includes(sale.showCity)
    );
  }
  
  // Product filter (requires normalization)
  if (options?.productIds && options.productIds.length > 0) {
    filtered = filtered.filter(sale => {
      const normalizedItems = normalizeItems(sale.items);
      return normalizedItems.some(item => 
        options.productIds!.includes(item.designId)
      );
    });
  }
  
  return filtered;
}

/**
 * Get all normalized items from sales
 */
function getAllNormalizedItems(sales: MerchSale[]): NormalizedMerchItem[] {
  const allItems: NormalizedMerchItem[] = [];
  
  sales.forEach(sale => {
    const normalized = normalizeItems(sale.items);
    allItems.push(...normalized);
  });
  
  return allItems;
}

// ============================================================================
// SIZE ANALYTICS
// ============================================================================

/**
 * Build size breakdown analytics
 */
function buildSizeAnalytics(items: NormalizedMerchItem[]): SizeBreakdown[] {
  const sizeMap = new Map<string, { quantity: number; revenue: number }>();
  
  let totalQuantity = 0;
  let totalRevenue = 0;
  
  items.forEach(item => {
    const size = item.size || 'N/A';
    
    if (!sizeMap.has(size)) {
      sizeMap.set(size, { quantity: 0, revenue: 0 });
    }
    
    const sizeData = sizeMap.get(size)!;
    sizeData.quantity += item.quantity;
    sizeData.revenue += item.totalMoney;
    
    totalQuantity += item.quantity;
    totalRevenue += item.totalMoney;
  });
  
  // Convert to array with percentages
  const breakdown: SizeBreakdown[] = [];
  
  sizeMap.forEach((data, size) => {
    breakdown.push({
      size: size as any,
      quantity: data.quantity,
      revenue: data.revenue,
      percentage: (data.quantity / totalQuantity) * 100,
    });
  });
  
  // Sort by SIZE_ORDER
  breakdown.sort((a, b) => {
    const aIndex = SIZE_ORDER.indexOf(a.size);
    const bIndex = SIZE_ORDER.indexOf(b.size);
    
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  
  return breakdown;
}

// ============================================================================
// PRODUCT ANALYTICS
// ============================================================================

/**
 * Build product/design analytics
 */
function buildProductAnalytics(items: NormalizedMerchItem[]): MerchDesign[] {
  const productMap = new Map<string, {
    designId: string;
    designName: string;
    garmentType: string;
    category: string;
    items: NormalizedMerchItem[];
    totalRevenue: number;
    totalSold: number;
    firstSeen: string;
    lastSeen: string;
  }>();
  
  items.forEach(item => {
    const key = item.designId;
    
    if (!productMap.has(key)) {
      productMap.set(key, {
        designId: item.designId,
        designName: item.designName,
        garmentType: item.garmentType,
        category: item.category,
        items: [],
        totalRevenue: 0,
        totalSold: 0,
        firstSeen: '',
        lastSeen: '',
      });
    }
    
    const product = productMap.get(key)!;
    product.items.push(item);
    product.totalRevenue += item.totalMoney;
    product.totalSold += item.quantity;
  });
  
  // Convert to MerchDesign objects
  const designs: MerchDesign[] = [];
  
  productMap.forEach(product => {
    // Build size breakdown for this product
    const sizeMap = new Map<string, { quantity: number; revenue: number }>();
    let productTotalQty = 0;
    
    product.items.forEach(item => {
      const size = item.size || 'N/A';
      if (!sizeMap.has(size)) {
        sizeMap.set(size, { quantity: 0, revenue: 0 });
      }
      const sizeData = sizeMap.get(size)!;
      sizeData.quantity += item.quantity;
      sizeData.revenue += item.totalMoney;
      productTotalQty += item.quantity;
    });
    
    const sizes: SizeBreakdown[] = [];
    sizeMap.forEach((data, size) => {
      sizes.push({
        size: size as any,
        quantity: data.quantity,
        revenue: data.revenue,
        percentage: (data.quantity / productTotalQty) * 100,
      });
    });
    
    // Build color breakdown
    const colorMap = new Map<string, { quantity: number; revenue: number }>();
    product.items.forEach(item => {
      const color = item.color || 'N/A';
      if (!colorMap.has(color)) {
        colorMap.set(color, { quantity: 0, revenue: 0 });
      }
      const colorData = colorMap.get(color)!;
      colorData.quantity += item.quantity;
      colorData.revenue += item.totalMoney;
    });
    
    const colors = Array.from(colorMap.entries()).map(([color, data]) => ({
      color,
      quantity: data.quantity,
      revenue: data.revenue,
      percentage: (data.quantity / productTotalQty) * 100,
    }));
    
    designs.push({
      id: product.designId,
      name: product.designName,
      garmentType: product.garmentType as any,
      category: product.category as any,
      totalSold: product.totalSold,
      totalRevenue: product.totalRevenue,
      averagePrice: product.totalRevenue / product.totalSold,
      sizes,
      colors,
      firstSeen: '', // TODO: Track dates
      lastSeen: '',  // TODO: Track dates
    });
  });
  
  // Sort by revenue
  designs.sort((a, b) => b.totalRevenue - a.totalRevenue);
  
  return designs;
}

// ============================================================================
// GARMENT TYPE ANALYTICS
// ============================================================================

/**
 * Build garment type breakdown
 */
function buildGarmentTypeAnalytics(items: NormalizedMerchItem[]): GarmentTypeBreakdown[] {
  const typeMap = new Map<string, { quantity: number; revenue: number }>();
  
  let totalQuantity = 0;
  let totalRevenue = 0;
  
  items.forEach(item => {
    const type = item.garmentType;
    
    if (!typeMap.has(type)) {
      typeMap.set(type, { quantity: 0, revenue: 0 });
    }
    
    const typeData = typeMap.get(type)!;
    typeData.quantity += item.quantity;
    typeData.revenue += item.totalMoney;
    
    totalQuantity += item.quantity;
    totalRevenue += item.totalMoney;
  });
  
  const breakdown: GarmentTypeBreakdown[] = [];
  
  typeMap.forEach((data, type) => {
    breakdown.push({
      garmentType: type as any,
      quantity: data.quantity,
      revenue: data.revenue,
      percentage: (data.revenue / totalRevenue) * 100,
    });
  });
  
  // Sort by revenue
  breakdown.sort((a, b) => b.revenue - a.revenue);
  
  return breakdown;
}

// ============================================================================
// SHOW ANALYTICS
// ============================================================================

/**
 * Build per-show analytics
 */
function buildShowAnalytics(sales: MerchSale[]): ShowAnalytics[] {
  const showMap = new Map<number, ShowAnalytics>();
  
  sales.forEach(sale => {
    if (!sale.showId) return;
    
    if (!showMap.has(sale.showId)) {
      showMap.set(sale.showId, {
        showId: sale.showId,
        showName: sale.showName || 'Unknown Show',
        showDate: sale.showDate || '',
        showCity: sale.showCity || 'Unknown',
        showState: sale.showState || '',
        totalSales: 0,
        totalRevenue: 0,
        totalItems: 0,
        averageOrderValue: 0,
        topProducts: [],
        sizeBreakdown: [],
        garmentTypeBreakdown: [],
      });
    }
    
    const show = showMap.get(sale.showId)!;
    show.totalSales += 1;
    show.totalRevenue += sale.totalMoney;
    show.totalItems += sale.itemCount;
  });
  
  // Calculate averages and build sub-analytics for each show
  const shows: ShowAnalytics[] = [];
  
  showMap.forEach(show => {
    show.averageOrderValue = show.totalRevenue / show.totalSales;
    
    // Get items for this show
    const showSales = sales.filter(s => s.showId === show.showId);
    const showItems = getAllNormalizedItems(showSales);
    
    // Build size breakdown for this show
    show.sizeBreakdown = buildSizeAnalytics(showItems);
    
    // Build garment type breakdown for this show
    show.garmentTypeBreakdown = buildGarmentTypeAnalytics(showItems);
    
    // Build top products for this show
    const products = buildProductAnalytics(showItems);
    show.topProducts = products.slice(0, 5).map(p => ({
      designId: p.id,
      designName: p.name,
      garmentType: p.garmentType,
      quantity: p.totalSold,
      revenue: p.totalRevenue,
      percentage: (p.totalRevenue / show.totalRevenue) * 100,
    }));
    
    shows.push(show);
  });
  
  // Sort by date (newest first)
  shows.sort((a, b) => b.showDate.localeCompare(a.showDate));
  
  return shows;
}

// ============================================================================
// CITY ANALYTICS
// ============================================================================

/**
 * Build per-city analytics
 */
function buildCityAnalytics(sales: MerchSale[]): CityAnalytics[] {
  const cityMap = new Map<string, {
    city: string;
    state: string;
    shows: Set<number>;
    sales: MerchSale[];
  }>();
  
  sales.forEach(sale => {
    if (!sale.showCity) return;
    
    const key = `${sale.showCity}, ${sale.showState || ''}`;
    
    if (!cityMap.has(key)) {
      cityMap.set(key, {
        city: sale.showCity,
        state: sale.showState || '',
        shows: new Set(),
        sales: [],
      });
    }
    
    const city = cityMap.get(key)!;
    if (sale.showId) city.shows.add(sale.showId);
    city.sales.push(sale);
  });
  
  const cities: CityAnalytics[] = [];
  
  cityMap.forEach(cityData => {
    const totalSales = cityData.sales.length;
    const totalRevenue = cityData.sales.reduce((sum, s) => sum + s.totalMoney, 0);
    const totalItems = cityData.sales.reduce((sum, s) => sum + s.itemCount, 0);
    const totalShows = cityData.shows.size;
    
    const items = getAllNormalizedItems(cityData.sales);
    const products = buildProductAnalytics(items);
    
    cities.push({
      city: cityData.city,
      state: cityData.state,
      totalShows,
      totalSales,
      totalRevenue,
      totalItems,
      averagePerShow: totalShows > 0 ? totalRevenue / totalShows : 0,
      topProducts: products.slice(0, 5).map(p => ({
        designId: p.id,
        designName: p.name,
        garmentType: p.garmentType,
        quantity: p.totalSold,
        revenue: p.totalRevenue,
        percentage: (p.totalRevenue / totalRevenue) * 100,
      })),
    });
  });
  
  // Sort by revenue
  cities.sort((a, b) => b.totalRevenue - a.totalRevenue);
  
  return cities;
}

// ============================================================================
// TEMPORAL ANALYTICS
// ============================================================================

/**
 * Build monthly analytics
 */
function buildMonthlyAnalytics(sales: MerchSale[]): MonthlyAnalytics[] {
  const monthMap = new Map<string, MerchSale[]>();
  
  sales.forEach(sale => {
    const date = new Date(sale.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, []);
    }
    
    monthMap.get(monthKey)!.push(sale);
  });
  
  const monthly: MonthlyAnalytics[] = [];
  
  monthMap.forEach((monthlySales, monthKey) => {
    const totalSales = monthlySales.length;
    const totalRevenue = monthlySales.reduce((sum, s) => sum + s.totalMoney, 0);
    const totalItems = monthlySales.reduce((sum, s) => sum + s.itemCount, 0);
    
    const items = getAllNormalizedItems(monthlySales);
    const products = buildProductAnalytics(items);
    
    const [year, month] = monthKey.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = `${monthNames[parseInt(month) - 1]} ${year}`;
    
    monthly.push({
      month: monthKey,
      monthName,
      totalSales,
      totalRevenue,
      totalItems,
      averageOrderValue: totalRevenue / totalSales,
      topProducts: products.slice(0, 3).map(p => ({
        designId: p.id,
        designName: p.name,
        garmentType: p.garmentType,
        quantity: p.totalSold,
        revenue: p.totalRevenue,
        percentage: (p.totalRevenue / totalRevenue) * 100,
      })),
    });
  });
  
  // Sort chronologically
  monthly.sort((a, b) => a.month.localeCompare(b.month));
  
  return monthly;
}

/**
 * Build seasonal analytics
 */
function buildSeasonalAnalytics(sales: MerchSale[]): SeasonalAnalytics[] {
  const seasonMap = new Map<string, MerchSale[]>();
  
  sales.forEach(sale => {
    const date = new Date(sale.createdAt);
    const year = date.getFullYear();
    const season = getSeasonFromDate(date);
    const key = `${season}-${year}`;
    
    if (!seasonMap.has(key)) {
      seasonMap.set(key, []);
    }
    
    seasonMap.get(key)!.push(sale);
  });
  
  const seasonal: SeasonalAnalytics[] = [];
  
  seasonMap.forEach((seasonSales, key) => {
    const [season, yearStr] = key.split('-');
    const year = parseInt(yearStr);
    
    const totalSales = seasonSales.length;
    const totalRevenue = seasonSales.reduce((sum, s) => sum + s.totalMoney, 0);
    const totalItems = seasonSales.reduce((sum, s) => sum + s.itemCount, 0);
    
    const items = getAllNormalizedItems(seasonSales);
    const products = buildProductAnalytics(items);
    
    seasonal.push({
      season: season as any,
      year,
      totalSales,
      totalRevenue,
      totalItems,
      topProducts: products.slice(0, 3).map(p => ({
        designId: p.id,
        designName: p.name,
        garmentType: p.garmentType,
        quantity: p.totalSold,
        revenue: p.totalRevenue,
        percentage: (p.totalRevenue / totalRevenue) * 100,
      })),
    });
  });
  
  return seasonal;
}

// ============================================================================
// MAIN ANALYTICS BUILDER
// ============================================================================

/**
 * Build comprehensive merch analytics
 */
export function buildMerchAnalytics(
  sales: MerchSale[],
  options?: AnalyticsOptions
): MerchAnalytics {
  // Apply filters
  const filteredSales = applyFilters(sales, options);
  
  // Get all normalized items
  const allItems = getAllNormalizedItems(filteredSales);
  
  // Calculate overview metrics
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalMoney, 0);
  const totalItems = filteredSales.reduce((sum, s) => sum + s.itemCount, 0);
  const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
  
  // Get unique products
  const uniqueProductIds = new Set(allItems.map(item => item.designId));
  
  // Determine date range
  const dates = filteredSales.map(s => new Date(s.createdAt)).sort((a, b) => a.getTime() - b.getTime());
  const dateRange = {
    start: dates[0]?.toISOString() || '',
    end: dates[dates.length - 1]?.toISOString() || '',
  };
  
  // Build dimensional analytics
  const byShow = buildShowAnalytics(filteredSales);
  const byCity = buildCityAnalytics(filteredSales);
  const byProduct = buildProductAnalytics(allItems);
  const bySize = buildSizeAnalytics(allItems);
  const byGarmentType = buildGarmentTypeAnalytics(allItems);
  
  // Build temporal analytics
  const monthly = buildMonthlyAnalytics(filteredSales);
  const seasonal = buildSeasonalAnalytics(filteredSales);
  
  // Build full analytics object
  const analytics: MerchAnalytics = {
    overview: {
      totalSales,
      totalRevenue,
      totalItems,
      averageOrderValue,
      uniqueProducts: uniqueProductIds.size,
      dateRange,
    },
    byShow,
    byCity,
    byProduct,
    bySize,
    byGarmentType,
    temporal: {
      monthly,
      seasonal,
    },
    baskets: {
      averageItemsPerOrder: totalItems / totalSales || 0,
      mostCommonBasketSize: 1, // TODO: Calculate actual mode
      commonPairings: [], // TODO: Implement basket analysis
      upsellOpportunities: [], // TODO: Implement upsell analysis
    },
    trends: {
      growingProducts: [], // TODO: Implement trend analysis
      decliningProducts: [], // TODO: Implement trend analysis
      seasonalPatterns: [], // TODO: Implement seasonal pattern detection
    },
    normalized: {
      sales: filteredSales,
      items: allItems,
    },
  };
  
  return analytics;
}
