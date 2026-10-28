/**
 * SceneGen Merch Analytics - Core Type Definitions
 * World-class merch intelligence system
 */

// ============================================================================
// BASE DATA TYPES
// ============================================================================

export interface MerchItem {
  id: string;
  name: string;
  quantity: number;
  variation: string | null;
  basePriceMoney: number;
  totalMoney: number;
  catalogObjectId: string | null;
}

export interface MerchSale {
  id: string;
  squareOrderId: string;
  totalMoney: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  state: string;
  locationId?: string;
  showId?: number;
  showName?: string;
  showDate?: string;
  showCity?: string;
  showState?: string;
  matched: boolean;
  itemCount: number;
  items: MerchItem[];
}

// ============================================================================
// NORMALIZATION TYPES
// ============================================================================

export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL' | '5XL' | null;

export type GarmentType = 
  | 'tshirt'
  | 'longsleeve'
  | 'hoodie'
  | 'crewneck'
  | 'tank'
  | 'hat'
  | 'beanie'
  | 'vinyl'
  | 'cd'
  | 'cassette'
  | 'poster'
  | 'sticker'
  | 'tote'
  | 'other';

export interface NormalizedMerchItem {
  // Original data
  originalName: string;
  originalVariation: string | null;
  quantity: number;
  basePriceMoney: number;
  totalMoney: number;
  
  // Normalized attributes
  designId: string;
  designName: string;
  garmentType: GarmentType;
  size: Size;
  color: string | null;
  
  // Category
  category: ProductCategory;
  
  // Metadata
  normalized: boolean;
  confidence: number; // 0-1, how confident the normalization is
}

export type ProductCategory = 'apparel' | 'accessories' | 'music' | 'art' | 'other';

export interface MerchDesign {
  id: string;
  name: string;
  garmentType: GarmentType;
  category: ProductCategory;
  totalSold: number;
  totalRevenue: number;
  averagePrice: number;
  sizes: SizeBreakdown[];
  colors: ColorBreakdown[];
  firstSeen: string;
  lastSeen: string;
}

export interface SizeBreakdown {
  size: Size;
  quantity: number;
  revenue: number;
  percentage: number;
}

export interface ColorBreakdown {
  color: string;
  quantity: number;
  revenue: number;
  percentage: number;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface ShowAnalytics {
  showId: number;
  showName: string;
  showDate: string;
  showCity: string;
  showState: string;
  totalSales: number;
  totalRevenue: number;
  totalItems: number;
  averageOrderValue: number;
  topProducts: ProductPerformance[];
  sizeBreakdown: SizeBreakdown[];
  garmentTypeBreakdown: GarmentTypeBreakdown[];
}

export interface ProductPerformance {
  designId: string;
  designName: string;
  garmentType: GarmentType;
  quantity: number;
  revenue: number;
  percentage: number;
}

export interface GarmentTypeBreakdown {
  garmentType: GarmentType;
  quantity: number;
  revenue: number;
  percentage: number;
}

export interface CityAnalytics {
  city: string;
  state: string;
  totalShows: number;
  totalSales: number;
  totalRevenue: number;
  totalItems: number;
  averagePerShow: number;
  topProducts: ProductPerformance[];
}

export interface MonthlyAnalytics {
  month: string; // YYYY-MM
  monthName: string; // January 2026
  totalSales: number;
  totalRevenue: number;
  totalItems: number;
  averageOrderValue: number;
  topProducts: ProductPerformance[];
}

export interface SeasonalAnalytics {
  season: 'Spring' | 'Summer' | 'Fall' | 'Winter';
  year: number;
  totalSales: number;
  totalRevenue: number;
  totalItems: number;
  topProducts: ProductPerformance[];
}

export interface BasketAnalytics {
  averageItemsPerOrder: number;
  mostCommonBasketSize: number;
  commonPairings: ProductPairing[];
  upsellOpportunities: UpsellOpportunity[];
}

export interface ProductPairing {
  product1: string;
  product2: string;
  occurrences: number;
  confidence: number; // 0-1
}

export interface UpsellOpportunity {
  baseProduct: string;
  recommendedProduct: string;
  expectedLift: number; // percentage
  basedOnOrders: number;
}

export interface TrendAnalysis {
  growingProducts: ProductTrend[];
  decliningProducts: ProductTrend[];
  seasonalPatterns: SeasonalPattern[];
}

export interface ProductTrend {
  designId: string;
  designName: string;
  trend: 'up' | 'down';
  percentageChange: number;
  period: 'week' | 'month' | 'season';
}

export interface SeasonalPattern {
  productDesignId: string;
  peakSeason: 'Spring' | 'Summer' | 'Fall' | 'Winter';
  seasonalityScore: number; // 0-1
}

// ============================================================================
// COMPREHENSIVE ANALYTICS OUTPUT
// ============================================================================

export interface MerchAnalytics {
  // Overview
  overview: {
    totalSales: number;
    totalRevenue: number;
    totalItems: number;
    averageOrderValue: number;
    uniqueProducts: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  
  // Dimensional analysis
  byShow: ShowAnalytics[];
  byCity: CityAnalytics[];
  byProduct: MerchDesign[];
  bySize: SizeBreakdown[];
  byGarmentType: GarmentTypeBreakdown[];
  
  // Temporal analysis
  temporal: {
    monthly: MonthlyAnalytics[];
    seasonal: SeasonalAnalytics[];
  };
  
  // Advanced analytics
  baskets: BasketAnalytics;
  trends: TrendAnalysis;
  
  // AI-ready data
  normalized: {
    sales: MerchSale[];
    items: NormalizedMerchItem[];
  };
}

// ============================================================================
// ANALYTICS OPTIONS
// ============================================================================

export interface AnalyticsOptions {
  // Filtering
  dateRange?: {
    start: string;
    end: string;
  };
  showIds?: number[];
  cities?: string[];
  productIds?: string[];
  
  // Analysis depth
  includeBasketAnalysis?: boolean;
  includeTrendAnalysis?: boolean;
  includeSeasonalAnalysis?: boolean;
  
  // Performance
  maxResults?: number;
  cacheResults?: boolean;
}

// ============================================================================
// FILTER TYPES (for UI)
// ============================================================================

export interface MerchFilters {
  dateRange: {
    start: string | null;
    end: string | null;
  };
  shows: number[];
  cities: string[];
  garmentTypes: GarmentType[];
  sizes: Size[];
  searchTerm: string;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  sections: ExportSection[];
  includeCharts?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export type ExportSection = 
  | 'overview'
  | 'byShow'
  | 'byCity'
  | 'byProduct'
  | 'temporal'
  | 'baskets'
  | 'trends';
