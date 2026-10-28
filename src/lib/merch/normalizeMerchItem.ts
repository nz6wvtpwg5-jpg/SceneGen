/**
 * SceneGen Merch Analytics - Item Normalization
 * Parse product names and extract structured attributes
 * Supports manual overrides for accuracy
 */

import { 
  NormalizedMerchItem,
  MerchItem,
  Size,
  GarmentType,
  ProductCategory,
} from './types';
import { 
  SIZE_KEYWORDS,
  GARMENT_TYPE_KEYWORDS,
  COLOR_KEYWORDS,
  CATEGORY_MAP,
} from './constants';

// ============================================================================
// MANUAL OVERRIDES
// ============================================================================

/**
 * Manual overrides for specific product names
 * Key: exact product name from Square
 * Value: override attributes
 */
interface ItemOverride {
  designName?: string;
  designId?: string;
  garmentType?: GarmentType;
  size?: Size;
  color?: string;
  category?: ProductCategory;
}

/**
 * Manual overrides storage
 * This can be populated from a config file or database
 */
const MANUAL_OVERRIDES: Record<string, ItemOverride> = {
  // Example overrides:
  // "Conan Logo Tee XL": {
  //   designName: "Conan Logo Tee",
  //   designId: "conan-logo-tee",
  //   garmentType: "tshirt",
  //   size: "XL",
  //   color: "black",
  // }
};

/**
 * Add a manual override
 */
export function addManualOverride(itemName: string, override: ItemOverride): void {
  MANUAL_OVERRIDES[itemName] = override;
}

/**
 * Get all manual overrides
 */
export function getManualOverrides(): Record<string, ItemOverride> {
  return { ...MANUAL_OVERRIDES };
}

/**
 * Clear all manual overrides
 */
export function clearManualOverrides(): void {
  Object.keys(MANUAL_OVERRIDES).forEach(key => delete MANUAL_OVERRIDES[key]);
}

// ============================================================================
// SIZE EXTRACTION
// ============================================================================

/**
 * Extract size from item name or variation
 */
export function extractSize(name: string, variation?: string | null): Size | null {
  const searchText = `${name} ${variation || ''}`.toLowerCase();
  
  // Look for size keywords with word boundaries
  for (const [keyword, size] of Object.entries(SIZE_KEYWORDS)) {
    // Use word boundary regex to avoid false matches
    // e.g., "small" shouldn't match "smalltown"
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(searchText)) {
      return size;
    }
  }
  
  return null;
}

// ============================================================================
// GARMENT TYPE EXTRACTION
// ============================================================================

/**
 * Extract garment type from item name
 */
export function extractGarmentType(name: string): GarmentType {
  const lowerName = name.toLowerCase();
  
  // Check each garment type's keywords
  for (const [type, keywords] of Object.entries(GARMENT_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return type as GarmentType;
      }
    }
  }
  
  return 'other';
}

// ============================================================================
// COLOR EXTRACTION
// ============================================================================

/**
 * Extract color from item name
 */
export function extractColor(name: string): string | null {
  const lowerName = name.toLowerCase();
  
  // Look for color keywords
  for (const color of COLOR_KEYWORDS) {
    if (lowerName.includes(color)) {
      return color;
    }
  }
  
  return null;
}

// ============================================================================
// DESIGN NAME EXTRACTION
// ============================================================================

/**
 * Extract design name by removing size, color, and garment type keywords
 */
export function extractDesignName(name: string): string {
  let cleanName = name;
  
  // Remove size keywords
  for (const keyword of Object.keys(SIZE_KEYWORDS)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    cleanName = cleanName.replace(regex, '');
  }
  
  // Remove common separators when they're standalone
  cleanName = cleanName.replace(/\s*-\s*/g, ' ');
  
  // Clean up extra spaces
  cleanName = cleanName
    .replace(/\s+/g, ' ')
    .trim();
  
  // If nothing left, return original
  return cleanName || name;
}

/**
 * Generate a consistent design ID (kebab-case)
 */
export function generateDesignId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Collapse multiple hyphens
    .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

/**
 * Calculate confidence score for parsing (0-1)
 */
function calculateConfidence(
  name: string,
  size: Size | null,
  garmentType: GarmentType,
  color: string | null
): number {
  let confidence = 0.5; // Base confidence
  
  // Increase confidence based on what we found
  if (size !== null) confidence += 0.2;
  if (garmentType !== 'other') confidence += 0.2;
  if (color !== null) confidence += 0.1;
  
  // Longer names tend to have more information
  if (name.length > 10) confidence += 0.05;
  if (name.length > 20) confidence += 0.05;
  
  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

// ============================================================================
// MAIN NORMALIZATION FUNCTION
// ============================================================================

/**
 * Normalize a merch item
 * Supports manual overrides for accuracy
 * 
 * @param item - The merch item to normalize
 * @param additionalOverrides - Optional runtime overrides
 * @returns Normalized merch item with structured attributes
 */
export function normalizeItem(
  item: MerchItem,
  additionalOverrides?: Record<string, ItemOverride>
): NormalizedMerchItem {
  const itemName = item.name;
  const itemVariation = item.variation;
  
  // Combine manual overrides with additional overrides
  const allOverrides = {
    ...MANUAL_OVERRIDES,
    ...additionalOverrides,
  };
  
  // Check for manual override first
  const override = allOverrides[itemName];
  
  if (override) {
    // Use manual override
    const designName = override.designName || itemName;
    const designId = override.designId || generateDesignId(designName);
    const garmentType = override.garmentType || 'other';
    
    return {
      originalName: itemName,
      originalVariation: itemVariation,
      quantity: item.quantity,
      basePriceMoney: item.basePriceMoney,
      totalMoney: item.totalMoney,
      designId,
      designName,
      garmentType,
      size: override.size || null,
      color: override.color || null,
      category: override.category || CATEGORY_MAP[garmentType],
      normalized: true,
      confidence: 1.0, // Manual override = 100% confidence
    };
  }
  
  // Fall back to automatic parsing
  const size = extractSize(itemName, itemVariation);
  const garmentType = extractGarmentType(itemName);
  const color = extractColor(itemName);
  const designName = extractDesignName(itemName);
  const designId = generateDesignId(designName);
  const category = CATEGORY_MAP[garmentType];
  const confidence = calculateConfidence(itemName, size, garmentType, color);
  
  return {
    originalName: itemName,
    originalVariation: itemVariation,
    quantity: item.quantity,
    basePriceMoney: item.basePriceMoney,
    totalMoney: item.totalMoney,
    designId,
    designName,
    garmentType,
    size,
    color,
    category,
    normalized: true,
    confidence,
  };
}

/**
 * Normalize multiple items at once
 */
export function normalizeItems(
  items: MerchItem[],
  overrides?: Record<string, ItemOverride>
): NormalizedMerchItem[] {
  return items.map(item => normalizeItem(item, overrides));
}

/**
 * Get items with low confidence scores
 * These may need manual override
 */
export function getLowConfidenceItems(
  items: NormalizedMerchItem[],
  threshold: number = 0.7
): NormalizedMerchItem[] {
  return items.filter(item => item.confidence < threshold);
}
