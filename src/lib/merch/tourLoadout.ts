/**
 * SceneGen Merch Analytics - Tour Loadout Generator
 * Smart packing list generator for upcoming tours
 */

import { MerchAnalytics, MerchDesign, SizeBreakdown } from './types';
import {
  DEFAULT_CONVERSION_RATE,
  DEFAULT_ITEMS_PER_BUYER,
  DEFAULT_SAFETY_STOCK,
} from './constants';

export interface TourLoadoutInput {
  cities: string[];
  expectedAttendancePerShow: number;
  season: 'Winter' | 'Spring' | 'Summer' | 'Fall';
  numberOfShows: number;
  safetyStockPercent?: number;
}

export interface LoadoutItem {
  designId: string;
  designName: string;
  garmentType: string;
  category: string;
  totalQuantity: number;
  sizeBreakdown?: Record<string, number>;
  notes: string[];
}

export interface TourLoadoutResult {
  items: LoadoutItem[];
  projectedRevenue: { min: number; max: number } | null;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
  summary: {
    totalItems: number;
    totalEstimatedCost: number;
    totalProjectedRevenue: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if we have data for specific cities
 */
function hasCityData(cities: string[], analytics: MerchAnalytics): boolean {
  return cities.some(city => 
    analytics.byCity.some(c => 
      c.city.toLowerCase() === city.toLowerCase()
    )
  );
}

/**
 * Get city-specific product preferences
 */
function getCityProductPreferences(
  cities: string[],
  analytics: MerchAnalytics
): Map<string, number> {
  const productScores = new Map<string, number>();
  
  cities.forEach(city => {
    const cityData = analytics.byCity.find(c => 
      c.city.toLowerCase() === city.toLowerCase()
    );
    
    if (cityData && cityData.topProducts.length > 0) {
      cityData.topProducts.forEach((product, index) => {
        const score = (5 - index) * product.percentage; // Weight by ranking and percentage
        productScores.set(
          product.designId,
          (productScores.get(product.designId) || 0) + score
        );
      });
    }
  });
  
  return productScores;
}

/**
 * Apply seasonal adjustments to product selection
 */
function applySeasonalAdjustments(
  products: MerchDesign[],
  season: string
): Map<string, number> {
  const adjustments = new Map<string, number>();
  
  products.forEach(product => {
    let multiplier = 1.0;
    
    // Hoodies
    if (product.garmentType === 'hoodie') {
      if (season === 'Winter' || season === 'Fall') {
        multiplier = 1.3; // 30% more hoodies in cold seasons
      } else if (season === 'Summer') {
        multiplier = 0.7; // 30% fewer hoodies in summer
      }
    }
    
    // T-shirts
    if (product.garmentType === 'tshirt') {
      if (season === 'Summer' || season === 'Spring') {
        multiplier = 1.2; // 20% more t-shirts in warm seasons
      } else if (season === 'Winter') {
        multiplier = 0.8; // 20% fewer t-shirts in winter
      }
    }
    
    // Vinyl/CD - no seasonal variation
    
    adjustments.set(product.id, multiplier);
  });
  
  return adjustments;
}

/**
 * Calculate size breakdown for a product
 */
function calculateSizeBreakdown(
  product: MerchDesign,
  totalQuantity: number
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  
  if (product.sizes.length === 0 || product.category !== 'apparel') {
    return breakdown; // No sizes for non-apparel
  }
  
  // Use historical size distribution
  const totalSold = product.sizes.reduce((sum, s) => sum + s.quantity, 0);
  
  product.sizes.forEach(size => {
    const percentage = size.quantity / totalSold;
    const quantity = Math.round(totalQuantity * percentage);
    if (quantity > 0) {
      breakdown[size.size?.toString() || 'N/A'] = quantity;
    }
  });
  
  return breakdown;
}

// ============================================================================
// MAIN LOADOUT GENERATOR
// ============================================================================

/**
 * Generate tour loadout recommendations
 */
export function generateTourLoadout(
  input: TourLoadoutInput,
  analytics: MerchAnalytics
): TourLoadoutResult {
  const {
    cities,
    expectedAttendancePerShow,
    season,
    numberOfShows,
    safetyStockPercent = DEFAULT_SAFETY_STOCK,
  } = input;
  
  const notes: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  // Calculate total expected attendees
  const totalAttendance = expectedAttendancePerShow * numberOfShows;
  
  // Estimate number of buyers (conversion rate)
  const estimatedBuyers = Math.round(totalAttendance * DEFAULT_CONVERSION_RATE);
  
  // Estimate total items needed
  const estimatedItems = Math.round(estimatedBuyers * DEFAULT_ITEMS_PER_BUYER);
  
  // Apply safety stock
  const targetItems = Math.round(estimatedItems * (1 + safetyStockPercent));
  
  notes.push(`Expected attendance: ${totalAttendance.toLocaleString()} (${numberOfShows} shows × ${expectedAttendancePerShow.toLocaleString()})`);
  notes.push(`Estimated buyers: ${estimatedBuyers.toLocaleString()} (${(DEFAULT_CONVERSION_RATE * 100).toFixed(0)}% conversion rate)`);
  notes.push(`Target items: ${targetItems.toLocaleString()} (includes ${(safetyStockPercent * 100).toFixed(0)}% safety stock)`);
  
  // Check data availability
  const hasCities = hasCityData(cities, analytics);
  
  if (!hasCities) {
    confidence = 'low';
    notes.push('Limited historical data for the selected cities; global averages were used.');
  } else {
    confidence = 'high';
    notes.push('✓ Using historical data from selected cities');
  }
  
  if (analytics.byProduct.length === 0) {
    return {
      items: [],
      projectedRevenue: null,
      confidence: 'low',
      notes: ['There is not enough sales data to generate a reliable recommendation yet.'],
      summary: {
        totalItems: 0,
        totalEstimatedCost: 0,
        totalProjectedRevenue: 0,
      },
    };
  }
  
  // Get top products (limit to top 10 to keep loadout manageable)
  const topProducts = analytics.byProduct.slice(0, 10);
  
  // Get city preferences if available
  const cityPreferences = hasCities 
    ? getCityProductPreferences(cities, analytics)
    : new Map<string, number>();
  
  // Get seasonal adjustments
  const seasonalAdjustments = applySeasonalAdjustments(topProducts, season);
  
  // Calculate quantities for each product
  const items: LoadoutItem[] = [];
  let totalQuantity = 0;
  
  // Calculate weights for each product
  const weights = new Map<string, number>();
  const totalRevenue = analytics.overview.totalRevenue;
  
  topProducts.forEach(product => {
    let weight = product.totalRevenue / totalRevenue; // Base weight on revenue share
    
    // Apply city preference boost
    if (cityPreferences.has(product.id)) {
      weight *= (1 + cityPreferences.get(product.id)! / 100);
    }
    
    // Apply seasonal adjustment
    weight *= seasonalAdjustments.get(product.id) || 1.0;
    
    weights.set(product.id, weight);
  });
  
  // Normalize weights
  const totalWeight = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
  
  topProducts.forEach(product => {
    const weight = weights.get(product.id) || 0;
    const normalizedWeight = weight / totalWeight;
    const quantity = Math.round(targetItems * normalizedWeight);
    
    if (quantity < 1) return; // Skip if quantity too low
    
    const itemNotes: string[] = [];
    
    // Add percentage of loadout
    itemNotes.push(`${(normalizedWeight * 100).toFixed(1)}% of loadout`);
    
    // Add seasonal note
    const seasonalMult = seasonalAdjustments.get(product.id) || 1.0;
    if (seasonalMult > 1.0) {
      itemNotes.push(`+${((seasonalMult - 1) * 100).toFixed(0)}% for ${season} season`);
    } else if (seasonalMult < 1.0) {
      itemNotes.push(`${((seasonalMult - 1) * 100).toFixed(0)}% for ${season} season`);
    }
    
    // Add city preference note
    if (cityPreferences.has(product.id)) {
      itemNotes.push('Popular in selected cities');
    }
    
    // Calculate size breakdown for apparel
    const sizeBreakdown = calculateSizeBreakdown(product, quantity);
    
    items.push({
      designId: product.id,
      designName: product.name,
      garmentType: product.garmentType,
      category: product.category,
      totalQuantity: quantity,
      sizeBreakdown: Object.keys(sizeBreakdown).length > 0 ? sizeBreakdown : undefined,
      notes: itemNotes,
    });
    
    totalQuantity += quantity;
  });
  
  // Sort by quantity (highest first)
  items.sort((a, b) => b.totalQuantity - a.totalQuantity);
  
  // Calculate projected revenue
  let projectedRevenue: { min: number; max: number } | null = null;
  
  if (analytics.overview.averageOrderValue > 0) {
    const avgItemPrice = analytics.overview.totalRevenue / analytics.overview.totalItems;
    const estimated = totalQuantity * avgItemPrice;
    
    // Assume 70-100% sellthrough
    projectedRevenue = {
      min: Math.round(estimated * 0.7),
      max: Math.round(estimated * 1.0),
    };
  }
  
  // Add final notes
  if (season === 'Winter' || season === 'Fall') {
    notes.push('Cold season adjustment: hoodie quantities increased and T-shirt quantities reduced.');
  } else if (season === 'Summer') {
    notes.push('Warm season adjustment: T-shirt quantities increased and hoodie quantities reduced.');
  }
  
  if (confidence === 'high') {
    notes.push('High confidence based on strong historical data from these markets.');
  } else if (confidence === 'low') {
    notes.push('Low confidence because only limited data is available.');
  } else {
    notes.push('Medium confidence; the estimate is based on global averages.');
  }
  
  // Calculate summary
  const totalEstimatedCost = items.reduce((sum, item) => {
    const product = topProducts.find(p => p.id === item.designId);
    const avgCost = product ? product.averagePrice * 0.3 : 0; // Assume 30% COGS
    return sum + (item.totalQuantity * avgCost);
  }, 0);
  
  const totalProjectedRevenue = projectedRevenue 
    ? (projectedRevenue.min + projectedRevenue.max) / 2
    : 0;
  
  return {
    items,
    projectedRevenue,
    confidence,
    notes,
    summary: {
      totalItems: totalQuantity,
      totalEstimatedCost: Math.round(totalEstimatedCost),
      totalProjectedRevenue: Math.round(totalProjectedRevenue),
    },
  };
}
