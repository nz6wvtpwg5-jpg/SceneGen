/**
 * Tests for merch item normalization
 */

import {
  extractSize,
  extractGarmentType,
  extractColor,
  extractDesignName,
  generateDesignId,
  normalizeItem,
  addManualOverride,
  clearManualOverrides,
} from '../normalizeMerchItem';
import { MerchItem } from '../types';

describe('normalizeMerchItem', () => {
  // ============================================================================
  // SIZE EXTRACTION
  // ============================================================================
  
  describe('extractSize', () => {
    it('should extract standard sizes from names', () => {
      expect(extractSize('Band Logo Tee XL')).toBe('XL');
      expect(extractSize('Tour Hoodie Large')).toBe('L');
      expect(extractSize('Basic Shirt Medium')).toBe('M');
      expect(extractSize('Tank Top Small')).toBe('S');
      expect(extractSize('Vintage Tee XS')).toBe('XS');
    });
    
    it('should extract sizes from variations', () => {
      expect(extractSize('Tour Hoodie', 'Large')).toBe('L');
      expect(extractSize('Band Tee', 'XL')).toBe('XL');
      expect(extractSize('Shirt', '2XL')).toBe('2XL');
    });
    
    it('should handle size abbreviations', () => {
      expect(extractSize('Tee SM')).toBe('S');
      expect(extractSize('Shirt MD')).toBe('M');
      expect(extractSize('Hoodie LG')).toBe('L');
    });
    
    it('should handle extended sizes', () => {
      expect(extractSize('Hoodie XXL')).toBe('2XL');
      expect(extractSize('Shirt 2XL')).toBe('2XL');
      expect(extractSize('Tee XXXL')).toBe('3XL');
      expect(extractSize('Shirt 3XL')).toBe('3XL');
      expect(extractSize('Hoodie 4XL')).toBe('4XL');
      expect(extractSize('Shirt 5XL')).toBe('5XL');
    });
    
    it('should return null when no size found', () => {
      expect(extractSize('Vinyl LP')).toBeNull();
      expect(extractSize('Poster')).toBeNull();
      expect(extractSize('CD Album')).toBeNull();
    });
    
    it('should handle case insensitivity', () => {
      expect(extractSize('TOUR HOODIE LARGE')).toBe('L');
      expect(extractSize('band tee medium')).toBe('M');
      expect(extractSize('ShIrT sMaLl')).toBe('S');
    });
  });
  
  // ============================================================================
  // GARMENT TYPE EXTRACTION
  // ============================================================================
  
  describe('extractGarmentType', () => {
    it('should extract t-shirt types', () => {
      expect(extractGarmentType('Band Logo Tee')).toBe('tshirt');
      expect(extractGarmentType('Tour T-Shirt')).toBe('tshirt');
      expect(extractGarmentType('Vintage Shirt Large')).toBe('tshirt');
    });
    
    it('should extract hoodie types', () => {
      expect(extractGarmentType('Tour Hoodie Black')).toBe('hoodie');
      expect(extractGarmentType('Logo Hoody XL')).toBe('hoodie');
      expect(extractGarmentType('Pullover Hood')).toBe('hoodie');
    });
    
    it('should extract longsleeve types', () => {
      expect(extractGarmentType('Tour Longsleeve')).toBe('longsleeve');
      expect(extractGarmentType('Band Long Sleeve')).toBe('longsleeve');
      expect(extractGarmentType('Logo L/S Shirt')).toBe('longsleeve');
    });
    
    it('should extract music types', () => {
      expect(extractGarmentType('Album Vinyl LP')).toBe('vinyl');
      expect(extractGarmentType('Latest Record')).toBe('vinyl');
      expect(extractGarmentType('Album CD')).toBe('cd');
      expect(extractGarmentType('Cassette Tape')).toBe('cassette');
    });
    
    it('should extract accessory types', () => {
      expect(extractGarmentType('Band Hat')).toBe('hat');
      expect(extractGarmentType('Logo Beanie')).toBe('beanie');
      expect(extractGarmentType('Tour Poster')).toBe('poster');
      expect(extractGarmentType('Vinyl Sticker')).toBe('sticker');
      expect(extractGarmentType('Tote Bag')).toBe('tote');
    });
    
    it('should return "other" for unknown types', () => {
      expect(extractGarmentType('Unknown Item')).toBe('other');
      expect(extractGarmentType('Mystery Product')).toBe('other');
    });
    
    it('should handle case insensitivity', () => {
      expect(extractGarmentType('TOUR HOODIE')).toBe('hoodie');
      expect(extractGarmentType('band tee')).toBe('tshirt');
      expect(extractGarmentType('ViNyL Lp')).toBe('vinyl');
    });
  });
  
  // ============================================================================
  // COLOR EXTRACTION
  // ============================================================================
  
  describe('extractColor', () => {
    it('should extract common colors', () => {
      expect(extractColor('Black Tour Hoodie')).toBe('black');
      expect(extractColor('White Logo Tee')).toBe('white');
      expect(extractColor('Navy Blue Shirt')).toBe('navy');
      expect(extractColor('Red Vintage Tee')).toBe('red');
    });
    
    it('should return null when no color found', () => {
      expect(extractColor('Tour Hoodie XL')).toBeNull();
      expect(extractColor('Band Tee Large')).toBeNull();
      expect(extractColor('Vinyl LP')).toBeNull();
    });
    
    it('should handle case insensitivity', () => {
      expect(extractColor('BLACK HOODIE')).toBe('black');
      expect(extractColor('white tee')).toBe('white');
    });
  });
  
  // ============================================================================
  // DESIGN NAME EXTRACTION
  // ============================================================================
  
  describe('extractDesignName', () => {
    it('should remove size keywords', () => {
      expect(extractDesignName('Band Logo Tee XL')).toBe('Band Logo Tee');
      expect(extractDesignName('Tour Hoodie Large')).toBe('Tour Hoodie');
      expect(extractDesignName('Vintage Shirt Medium')).toBe('Vintage Shirt');
    });
    
    it('should preserve the core design name', () => {
      expect(extractDesignName('Conan Logo Tee')).toBe('Conan Logo Tee');
      expect(extractDesignName('2026 Tour Hoodie')).toBe('2026 Tour Hoodie');
      expect(extractDesignName('Greatest Hits Vinyl')).toBe('Greatest Hits Vinyl');
    });
    
    it('should handle names with multiple size keywords', () => {
      expect(extractDesignName('XL Band Tee Large')).toBe('Band Tee');
    });
    
    it('should return original if nothing to clean', () => {
      const original = 'Vinyl LP';
      expect(extractDesignName(original)).toBe(original);
    });
  });
  
  // ============================================================================
  // DESIGN ID GENERATION
  // ============================================================================
  
  describe('generateDesignId', () => {
    it('should convert to kebab-case', () => {
      expect(generateDesignId('Band Logo Tee')).toBe('band-logo-tee');
      expect(generateDesignId('Tour Hoodie')).toBe('tour-hoodie');
      expect(generateDesignId('Vintage Vinyl LP')).toBe('vintage-vinyl-lp');
    });
    
    it('should remove special characters', () => {
      expect(generateDesignId('Band\'s Logo Tee!')).toBe('bands-logo-tee');
      expect(generateDesignId('Tour (2026) Hoodie')).toBe('tour-2026-hoodie');
    });
    
    it('should handle multiple spaces and hyphens', () => {
      expect(generateDesignId('Band   Logo   Tee')).toBe('band-logo-tee');
      expect(generateDesignId('Band--Logo--Tee')).toBe('band-logo-tee');
    });
    
    it('should be case insensitive', () => {
      expect(generateDesignId('BAND LOGO TEE')).toBe('band-logo-tee');
      expect(generateDesignId('BaNd LoGo TeE')).toBe('band-logo-tee');
    });
  });
  
  // ============================================================================
  // FULL NORMALIZATION
  // ============================================================================
  
  describe('normalizeItem', () => {
    const createMockItem = (name: string, variation: string | null = null): MerchItem => ({
      id: '123',
      name,
      variation,
      quantity: 1,
      basePriceMoney: 2000,
      totalMoney: 2000,
      catalogObjectId: null,
    });
    
    it('should normalize a t-shirt with size', () => {
      const item = createMockItem('Conan Logo Tee XL');
      const normalized = normalizeItem(item);
      
      expect(normalized.designName).toBe('Conan Logo Tee');
      expect(normalized.designId).toBe('conan-logo-tee');
      expect(normalized.garmentType).toBe('tshirt');
      expect(normalized.size).toBe('XL');
      expect(normalized.category).toBe('apparel');
      expect(normalized.normalized).toBe(true);
      expect(normalized.confidence).toBeGreaterThan(0.8);
    });
    
    it('should normalize a hoodie with color', () => {
      const item = createMockItem('Black Tour Hoodie Large');
      const normalized = normalizeItem(item);
      
      expect(normalized.designName).toBe('Black Tour Hoodie');
      expect(normalized.garmentType).toBe('hoodie');
      expect(normalized.size).toBe('L');
      expect(normalized.color).toBe('black');
      expect(normalized.category).toBe('apparel');
    });
    
    it('should normalize vinyl with no size', () => {
      const item = createMockItem('Greatest Hits Vinyl LP');
      const normalized = normalizeItem(item);
      
      expect(normalized.designName).toBe('Greatest Hits Vinyl LP');
      expect(normalized.garmentType).toBe('vinyl');
      expect(normalized.size).toBeNull();
      expect(normalized.category).toBe('music');
    });
    
    it('should use variation for size if not in name', () => {
      const item = createMockItem('Tour Hoodie', 'Large');
      const normalized = normalizeItem(item);
      
      expect(normalized.size).toBe('L');
    });
    
    it('should preserve original data', () => {
      const item = createMockItem('Band Tee XL', 'Black');
      const normalized = normalizeItem(item);
      
      expect(normalized.originalName).toBe('Band Tee XL');
      expect(normalized.originalVariation).toBe('Black');
      expect(normalized.quantity).toBe(1);
      expect(normalized.basePriceMoney).toBe(2000);
      expect(normalized.totalMoney).toBe(2000);
    });
  });
  
  // ============================================================================
  // MANUAL OVERRIDES
  // ============================================================================
  
  describe('manual overrides', () => {
    beforeEach(() => {
      clearManualOverrides();
    });
    
    it('should use manual override when available', () => {
      const itemName = 'Weird Product Name XL';
      
      addManualOverride(itemName, {
        designName: 'Clean Product Name',
        designId: 'clean-product-name',
        garmentType: 'tshirt',
        size: 'XL',
        color: 'black',
      });
      
      const item: MerchItem = {
        id: '123',
        name: itemName,
        variation: null,
        quantity: 1,
        basePriceMoney: 2000,
        totalMoney: 2000,
        catalogObjectId: null,
      };
      
      const normalized = normalizeItem(item);
      
      expect(normalized.designName).toBe('Clean Product Name');
      expect(normalized.designId).toBe('clean-product-name');
      expect(normalized.garmentType).toBe('tshirt');
      expect(normalized.size).toBe('XL');
      expect(normalized.color).toBe('black');
      expect(normalized.confidence).toBe(1.0); // Manual override = 100% confidence
    });
    
    it('should support runtime overrides', () => {
      const item: MerchItem = {
        id: '123',
        name: 'Special Item',
        variation: null,
        quantity: 1,
        basePriceMoney: 2000,
        totalMoney: 2000,
        catalogObjectId: null,
      };
      
      const runtimeOverrides = {
        'Special Item': {
          designName: 'Special Design',
          garmentType: 'hoodie' as const,
          size: 'L' as const,
        },
      };
      
      const normalized = normalizeItem(item, runtimeOverrides);
      
      expect(normalized.designName).toBe('Special Design');
      expect(normalized.garmentType).toBe('hoodie');
      expect(normalized.size).toBe('L');
      expect(normalized.confidence).toBe(1.0);
    });
  });
});
