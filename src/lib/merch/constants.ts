/**
 * SceneGen Merch Analytics - Constants
 * Keywords, mappings, and configuration for merch intelligence
 */

import { Size, GarmentType, ProductCategory } from './types';

// ============================================================================
// SIZE CONSTANTS
// ============================================================================

/**
 * Ordered list of sizes for charts and sorting
 */
export const SIZE_ORDER: (Size | 'Unknown')[] = [
  'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'
];

/**
 * Size detection keywords
 * Maps various size formats to standardized sizes
 */
export const SIZE_KEYWORDS: Record<string, Size> = {
  'xs': 'XS',
  'x-small': 'XS',
  'extra small': 'XS',
  'xsmall': 'XS',
  
  's': 'S',
  'sm': 'S',
  'small': 'S',
  
  'm': 'M',
  'md': 'M',
  'med': 'M',
  'medium': 'M',
  
  'l': 'L',
  'lg': 'L',
  'large': 'L',
  
  'xl': 'XL',
  'x-large': 'XL',
  'extra large': 'XL',
  'xlarge': 'XL',
  
  'xxl': '2XL',
  '2xl': '2XL',
  '2x': '2XL',
  'xx-large': '2XL',
  'double xl': '2XL',
  
  'xxxl': '3XL',
  '3xl': '3XL',
  '3x': '3XL',
  'xxx-large': '3XL',
  'triple xl': '3XL',
  
  '4xl': '4XL',
  '4x': '4XL',
  'xxxxl': '4XL',
  
  '5xl': '5XL',
  '5x': '5XL',
  'xxxxxl': '5XL',
};

// ============================================================================
// GARMENT TYPE CONSTANTS
// ============================================================================

/**
 * Garment type detection keywords
 * Maps product name keywords to garment types
 */
export const GARMENT_TYPE_KEYWORDS: Record<GarmentType, string[]> = {
  tshirt: [
    'tee', 't-shirt', 'tshirt', 'shirt', 't shirt'
  ],
  
  longsleeve: [
    'longsleeve', 'long sleeve', 'long-sleeve', 'ls', 'l/s'
  ],
  
  hoodie: [
    'hoodie', 'hoody', 'hood', 'pullover hoodie'
  ],
  
  crewneck: [
    'crewneck', 'crew neck', 'crew-neck', 'sweatshirt', 'sweater'
  ],
  
  tank: [
    'tank', 'tank top', 'tanktop', 'muscle tee'
  ],
  
  hat: [
    'hat', 'cap', 'snapback', 'trucker', 'dad hat', 'baseball cap'
  ],
  
  beanie: [
    'beanie', 'knit cap', 'winter hat', 'skull cap'
  ],
  
  vinyl: [
    'vinyl', 'lp', 'record', 'album', '12"', '12 inch'
  ],
  
  cd: [
    'cd', 'compact disc', 'album cd'
  ],
  
  cassette: [
    'cassette', 'tape', 'cassette tape'
  ],
  
  poster: [
    'poster', 'print', 'art print', 'lithograph'
  ],
  
  sticker: [
    'sticker', 'decal', 'stickers'
  ],
  
  tote: [
    'tote', 'tote bag', 'bag', 'canvas bag'
  ],
  
  other: []
};

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

/**
 * Color detection keywords
 */
export const COLOR_KEYWORDS = [
  'black',
  'white',
  'gray',
  'grey',
  'charcoal',
  'navy',
  'blue',
  'light blue',
  'dark blue',
  'red',
  'maroon',
  'burgundy',
  'green',
  'forest green',
  'olive',
  'yellow',
  'gold',
  'orange',
  'purple',
  'pink',
  'brown',
  'tan',
  'cream',
  'beige',
  'heather',
  'natural',
];

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

/**
 * Map garment types to product categories
 */
export const CATEGORY_MAP: Record<GarmentType, ProductCategory> = {
  tshirt: 'apparel',
  longsleeve: 'apparel',
  hoodie: 'apparel',
  crewneck: 'apparel',
  tank: 'apparel',
  hat: 'accessories',
  beanie: 'accessories',
  vinyl: 'music',
  cd: 'music',
  cassette: 'music',
  poster: 'art',
  sticker: 'art',
  tote: 'accessories',
  other: 'other',
};

// ============================================================================
// SEASON CONSTANTS
// ============================================================================

/**
 * Season definitions by month (1-12)
 */
export const SEASON_MONTHS: Record<string, number[]> = {
  Winter: [12, 1, 2],
  Spring: [3, 4, 5],
  Summer: [6, 7, 8],
  Fall: [9, 10, 11],
};

/**
 * Get season name from month number (1-12)
 */
export function getSeasonFromMonth(month: number): 'Winter' | 'Spring' | 'Summer' | 'Fall' {
  if (SEASON_MONTHS.Winter.includes(month)) return 'Winter';
  if (SEASON_MONTHS.Spring.includes(month)) return 'Spring';
  if (SEASON_MONTHS.Summer.includes(month)) return 'Summer';
  return 'Fall';
}

/**
 * Get season name from date
 */
export function getSeasonFromDate(date: Date): 'Winter' | 'Spring' | 'Summer' | 'Fall' {
  return getSeasonFromMonth(date.getMonth() + 1);
}

// ============================================================================
// ANALYTICS CONFIGURATION
// ============================================================================

/**
 * Minimum sales required for recommendations
 */
export const MIN_SALES_FOR_RECOMMENDATIONS = 20;

/**
 * Minimum sales required for trend analysis
 */
export const MIN_SALES_FOR_TRENDS = 50;

/**
 * Default conversion rate (attendees to buyers)
 */
export const DEFAULT_CONVERSION_RATE = 0.4; // 40%

/**
 * Default items per buyer
 */
export const DEFAULT_ITEMS_PER_BUYER = 1.5;

/**
 * Default safety stock percentage for tour loadout
 */
export const DEFAULT_SAFETY_STOCK = 0.15; // 15%

/**
 * Deviation threshold for size recommendations (percentage points)
 */
export const SIZE_DEVIATION_THRESHOLD = 15;

/**
 * Product performance threshold (% of total revenue)
 */
export const TOP_PRODUCT_THRESHOLD = 25; // 25% of revenue = bestseller
export const UNDERPERFORMING_PRODUCT_THRESHOLD = 2; // <2% of revenue = underperforming
