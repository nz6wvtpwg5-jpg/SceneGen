/**
 * SceneGen Merch Analytics - Recommendations Engine
 * Generate actionable insights from analytics data
 */

import { MerchAnalytics, MerchSale } from './types';
import {
  MIN_SALES_FOR_RECOMMENDATIONS,
  SIZE_DEVIATION_THRESHOLD,
  TOP_PRODUCT_THRESHOLD,
  UNDERPERFORMING_PRODUCT_THRESHOLD,
} from './constants';

export interface Recommendation {
  id: string;
  type: 'size' | 'product' | 'regional' | 'seasonal' | 'inventory';
  severity: 'info' | 'suggestion' | 'warning' | 'critical';
  icon: string;
  title: string;
  description: string;
  confidence: number; // 0-100
  supportingData: any;
  action: string;
}

// ============================================================================
// SIZE RECOMMENDATIONS
// ============================================================================

/**
 * Generate size-based recommendations
 */
function generateSizeRecommendations(analytics: MerchAnalytics): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  if (analytics.bySize.length === 0) return recommendations;
  
  // Calculate average percentage
  const avgPercentage = 100 / analytics.bySize.length;
  
  analytics.bySize.forEach(size => {
    const deviation = size.percentage - avgPercentage;
    
    // Overperforming size
    if (deviation > SIZE_DEVIATION_THRESHOLD) {
      recommendations.push({
        id: `size-over-${size.size}`,
        type: 'size',
        severity: 'suggestion',
        icon: 'trend-up',
        title: `Size ${size.size} is selling strongly`,
        description: `${size.size} accounts for ${size.percentage.toFixed(1)}% of sales, which is ${deviation.toFixed(1)}% above average. This size is in high demand.`,
        confidence: Math.min(70 + deviation, 95),
        supportingData: {
          size: size.size,
          percentage: size.percentage,
          deviation,
          quantity: size.quantity,
          revenue: size.revenue,
        },
        action: `Stock ${Math.ceil(deviation / 5) * 5}% more ${size.size} items for future tours`,
      });
    }
    
    // Underperforming size
    if (deviation < -SIZE_DEVIATION_THRESHOLD) {
      recommendations.push({
        id: `size-under-${size.size}`,
        type: 'size',
        severity: 'warning',
        icon: 'trend-down',
        title: `Size ${size.size} is underperforming`,
        description: `${size.size} accounts for only ${size.percentage.toFixed(1)}% of sales, which is ${Math.abs(deviation).toFixed(1)}% below average. Consider reducing stock to minimize waste.`,
        confidence: Math.min(70 + Math.abs(deviation), 95),
        supportingData: {
          size: size.size,
          percentage: size.percentage,
          deviation,
          quantity: size.quantity,
          revenue: size.revenue,
        },
        action: `Reduce ${size.size} stock by ${Math.ceil(Math.abs(deviation) / 5) * 5}% to minimize dead inventory`,
      });
    }
  });
  
  return recommendations;
}

// ============================================================================
// PRODUCT RECOMMENDATIONS
// ============================================================================

/**
 * Generate product-based recommendations
 */
function generateProductRecommendations(analytics: MerchAnalytics): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  if (analytics.byProduct.length === 0) return recommendations;
  
  const totalRevenue = analytics.overview.totalRevenue;
  
  // Top performer
  const topProduct = analytics.byProduct[0];
  const topProductPercent = (topProduct.totalRevenue / totalRevenue) * 100;
  
  if (topProductPercent > TOP_PRODUCT_THRESHOLD) {
    recommendations.push({
      id: `product-top-${topProduct.id}`,
      type: 'product',
      severity: 'suggestion',
      icon: 'top-product',
      title: `"${topProduct.name}" is a bestseller`,
      description: `This design accounts for ${topProductPercent.toFixed(1)}% of total merch revenue ($${topProduct.totalRevenue.toFixed(0)}). It's significantly outperforming other products.`,
      confidence: 92,
      supportingData: {
        product: topProduct,
        percentage: topProductPercent,
        revenue: topProduct.totalRevenue,
        units: topProduct.totalSold,
      },
      action: `Prioritize "${topProduct.name}" for all future tours and consider creating variations`,
    });
  }
  
  // Underperformers (bottom of list with very low revenue %)
  if (analytics.byProduct.length > 5) {
    const worstProducts = analytics.byProduct.slice(-3); // Last 3
    
    worstProducts.forEach(product => {
      const productPercent = (product.totalRevenue / totalRevenue) * 100;
      
      if (productPercent < UNDERPERFORMING_PRODUCT_THRESHOLD) {
        recommendations.push({
          id: `product-under-${product.id}`,
          type: 'product',
          severity: 'warning',
          icon: 'warning',
          title: `"${product.name}" is underperforming`,
          description: `This design accounts for only ${productPercent.toFixed(1)}% of total revenue ($${product.totalRevenue.toFixed(0)}). Consider discontinuing or reducing stock.`,
          confidence: 75,
          supportingData: {
            product,
            percentage: productPercent,
            revenue: product.totalRevenue,
            units: product.totalSold,
          },
          action: `Reduce or discontinue "${product.name}" and focus on better performers`,
        });
      }
    });
  }
  
  return recommendations;
}

// ============================================================================
// REGIONAL RECOMMENDATIONS
// ============================================================================

/**
 * Generate city/regional recommendations
 */
function generateRegionalRecommendations(analytics: MerchAnalytics): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  if (analytics.byCity.length === 0) return recommendations;
  
  // Top city
  const topCity = analytics.byCity[0];
  
  recommendations.push({
    id: `city-top-${topCity.city}`,
    type: 'regional',
    severity: 'info',
    icon: 'regional',
    title: `${topCity.city} is your strongest merch market`,
    description: `${topCity.city} has generated $${topCity.totalRevenue.toFixed(0)} in merch revenue across ${topCity.totalShows} show${topCity.totalShows > 1 ? 's' : ''}. Average revenue per show: $${topCity.averagePerShow.toFixed(0)}.`,
    confidence: 85,
    supportingData: {
      city: topCity,
      revenue: topCity.totalRevenue,
      shows: topCity.totalShows,
      avgPerShow: topCity.averagePerShow,
    },
    action: `Bring extra merch inventory to ${topCity.city} shows - historically strong market`,
  });
  
  // Top product per city
  if (topCity.topProducts.length > 0) {
    const topCityProduct = topCity.topProducts[0];
    
    recommendations.push({
      id: `city-product-${topCity.city}-${topCityProduct.designId}`,
      type: 'regional',
      severity: 'info',
      icon: 'location',
      title: `${topCity.city} loves "${topCityProduct.designName}"`,
      description: `In ${topCity.city}, "${topCityProduct.designName}" accounts for ${topCityProduct.percentage.toFixed(1)}% of merch sales. Stock extra for this market.`,
      confidence: 80,
      supportingData: {
        city: topCity.city,
        product: topCityProduct,
        percentage: topCityProduct.percentage,
      },
      action: `Bring 20-30% more "${topCityProduct.designName}" when playing ${topCity.city}`,
    });
  }
  
  return recommendations;
}

// ============================================================================
// SEASONAL RECOMMENDATIONS
// ============================================================================

/**
 * Generate seasonal recommendations
 */
function generateSeasonalRecommendations(analytics: MerchAnalytics): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  if (analytics.temporal.monthly.length < 3) return recommendations;
  
  // Analyze hoodie vs t-shirt sales by season
  const garmentTypes = analytics.byGarmentType;
  const hoodieData = garmentTypes.find(g => g.garmentType === 'hoodie');
  const tshirtData = garmentTypes.find(g => g.garmentType === 'tshirt');
  
  if (hoodieData && tshirtData) {
    const hoodiePercent = hoodieData.percentage;
    const tshirtPercent = tshirtData.percentage;
    
    if (hoodiePercent > tshirtPercent * 1.2) {
      // Hoodies are significantly outperforming
      recommendations.push({
        id: 'seasonal-hoodie-high',
        type: 'seasonal',
        severity: 'suggestion',
        icon: 'cold-season',
        title: 'Hoodies are in high demand',
        description: `Hoodies account for ${hoodiePercent.toFixed(1)}% of revenue vs ${tshirtPercent.toFixed(1)}% for t-shirts. This suggests cooler season or climate preferences.`,
        confidence: 82,
        supportingData: {
          hoodiePercent,
          tshirtPercent,
          hoodieRevenue: hoodieData.revenue,
          tshirtRevenue: tshirtData.revenue,
        },
        action: 'Stock more hoodies for fall/winter tours and cooler climates',
      });
    } else if (tshirtPercent > hoodiePercent * 1.5) {
      // T-shirts significantly outperforming
      recommendations.push({
        id: 'seasonal-tshirt-high',
        type: 'seasonal',
        severity: 'suggestion',
        icon: 'warm-season',
        title: 'T-shirts are dominating sales',
        description: `T-shirts account for ${tshirtPercent.toFixed(1)}% of revenue vs ${hoodiePercent.toFixed(1)}% for hoodies. This suggests warmer season or climate.`,
        confidence: 82,
        supportingData: {
          hoodiePercent,
          tshirtPercent,
          hoodieRevenue: hoodieData.revenue,
          tshirtRevenue: tshirtData.revenue,
        },
        action: 'Focus on t-shirts for summer tours and warmer climates',
      });
    }
  }
  
  // Vinyl/CD analysis
  const vinylData = garmentTypes.find(g => g.garmentType === 'vinyl');
  if (vinylData && vinylData.percentage > 15) {
    recommendations.push({
      id: 'product-vinyl-strong',
      type: 'product',
      severity: 'info',
      icon: 'inventory',
      title: 'Strong vinyl sales',
      description: `Vinyl accounts for ${vinylData.percentage.toFixed(1)}% of merch revenue ($${vinylData.revenue.toFixed(0)}). Your fans love physical music.`,
      confidence: 88,
      supportingData: {
        vinylPercent: vinylData.percentage,
        vinylRevenue: vinylData.revenue,
        vinylQuantity: vinylData.quantity,
      },
      action: 'Ensure adequate vinyl stock for all shows - strong consistent demand',
    });
  }
  
  return recommendations;
}

// ============================================================================
// INVENTORY RECOMMENDATIONS
// ============================================================================

/**
 * Generate inventory-specific recommendations
 */
function generateInventoryRecommendations(analytics: MerchAnalytics): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  // Low variety warning
  if (analytics.overview.uniqueProducts < 5) {
    recommendations.push({
      id: 'inventory-low-variety',
      type: 'inventory',
      severity: 'suggestion',
      icon: 'product-mix',
      title: 'Limited product variety',
      description: `You're currently selling ${analytics.overview.uniqueProducts} unique product${analytics.overview.uniqueProducts > 1 ? 's' : ''}. Consider adding more designs to increase sales opportunities.`,
      confidence: 70,
      supportingData: {
        uniqueProducts: analytics.overview.uniqueProducts,
      },
      action: 'Add 2-3 new designs to give fans more options and increase average order value',
    });
  }
  
  // Average order value optimization
  if (analytics.overview.averageOrderValue < 30) {
    recommendations.push({
      id: 'inventory-low-aov',
      type: 'inventory',
      severity: 'suggestion',
      icon: 'revenue',
      title: 'Opportunity to increase average order value',
      description: `Current average order is $${analytics.overview.averageOrderValue.toFixed(2)}. Consider bundling or adding lower-priced items like stickers or patches.`,
      confidence: 75,
      supportingData: {
        currentAOV: analytics.overview.averageOrderValue,
      },
      action: 'Add affordable items ($5-10) like stickers, patches, or pins to encourage multi-item purchases',
    });
  }
  
  return recommendations;
}

// ============================================================================
// MAIN RECOMMENDATIONS BUILDER
// ============================================================================

/**
 * Build comprehensive recommendations from analytics
 */
export function buildRecommendations(
  analytics: MerchAnalytics,
  sales: MerchSale[]
): Recommendation[] {
  // Check if we have enough data
  if (sales.length < MIN_SALES_FOR_RECOMMENDATIONS) {
    return [{
      id: 'insufficient-data',
      type: 'inventory',
      severity: 'info',
      icon: 'forecast',
      title: 'Not enough data for recommendations yet',
      description: `You have ${sales.length} merch sale${sales.length > 1 ? 's' : ''}. Recommendations will appear after ${MIN_SALES_FOR_RECOMMENDATIONS}+ sales to ensure accuracy.`,
      confidence: 100,
      supportingData: {
        currentSales: sales.length,
        requiredSales: MIN_SALES_FOR_RECOMMENDATIONS,
      },
      action: 'Keep selling merch! Check back when you have more sales data.',
    }];
  }
  
  const recommendations: Recommendation[] = [];
  
  // Generate all recommendation types
  recommendations.push(...generateSizeRecommendations(analytics));
  recommendations.push(...generateProductRecommendations(analytics));
  recommendations.push(...generateRegionalRecommendations(analytics));
  recommendations.push(...generateSeasonalRecommendations(analytics));
  recommendations.push(...generateInventoryRecommendations(analytics));
  
  // Sort by confidence (highest first)
  recommendations.sort((a, b) => b.confidence - a.confidence);
  
  // Limit to top 10 most relevant
  return recommendations.slice(0, 10);
}
