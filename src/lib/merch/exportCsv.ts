/**
 * SceneGen Merch Analytics - CSV Export
 * Export analytics data to CSV format
 */

import { MerchAnalytics } from './types';
import { TourLoadoutResult } from './tourLoadout';
import { Recommendation } from './buildRecommendations';

// ============================================================================
// CSV HELPERS
// ============================================================================

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(headers: string[], rows: (string | number)[][]): string {
  const csvRows = [headers.join(',')];
  
  rows.forEach(row => {
    const escapedRow = row.map(cell => {
      const cellStr = String(cell);
      // Escape quotes and wrap in quotes if contains comma or quote
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    });
    csvRows.push(escapedRow.join(','));
  });
  
  return csvRows.join('\n');
}

/**
 * Trigger browser download of CSV file
 */
function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export size distribution to CSV
 */
export function exportSizeDistribution(analytics: MerchAnalytics): void {
  const headers = ['Size', 'Quantity', 'Revenue', 'Percentage'];
  const rows: (string | number)[][] = [];
  
  analytics.bySize.forEach(size => {
    rows.push([
      size.size?.toString() || 'N/A',
      size.quantity,
      size.revenue.toFixed(2),
      size.percentage.toFixed(1) + '%',
    ]);
  });
  
  const csv = arrayToCSV(headers, rows);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(`size-distribution-${timestamp}.csv`, csv);
}

/**
 * Export city performance to CSV
 */
export function exportCityPerformance(analytics: MerchAnalytics): void {
  const headers = [
    'City',
    'State',
    'Shows',
    'Total Sales',
    'Total Revenue',
    'Total Items',
    'Avg per Show',
    'Top Product',
  ];
  const rows: (string | number)[][] = [];
  
  analytics.byCity.forEach(city => {
    rows.push([
      city.city,
      city.state,
      city.totalShows,
      city.totalSales,
      city.totalRevenue.toFixed(2),
      city.totalItems,
      city.averagePerShow.toFixed(2),
      city.topProducts[0]?.designName || 'N/A',
    ]);
  });
  
  const csv = arrayToCSV(headers, rows);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(`city-performance-${timestamp}.csv`, csv);
}

/**
 * Export product rankings to CSV
 */
export function exportProductRankings(analytics: MerchAnalytics): void {
  const headers = [
    'Rank',
    'Product',
    'Garment Type',
    'Category',
    'Total Sold',
    'Total Revenue',
    'Avg Price',
    'Most Common Size',
    'Top Cities',
  ];
  const rows: (string | number)[][] = [];
  
  analytics.byProduct.forEach((product, index) => {
    const topCities = product.sizes
      .slice(0, 3)
      .map(s => s.size)
      .filter(Boolean)
      .join('; ');
    
    rows.push([
      index + 1,
      product.name,
      product.garmentType,
      product.category,
      product.totalSold,
      product.totalRevenue.toFixed(2),
      product.averagePrice.toFixed(2),
      product.sizes[0]?.size?.toString() || 'N/A',
      topCities || 'N/A',
    ]);
  });
  
  const csv = arrayToCSV(headers, rows);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(`product-rankings-${timestamp}.csv`, csv);
}

/**
 * Export monthly summary to CSV
 */
export function exportMonthlySummary(analytics: MerchAnalytics): void {
  const headers = [
    'Month',
    'Total Sales',
    'Total Revenue',
    'Total Items',
    'Avg Order Value',
    'Top Product',
  ];
  const rows: (string | number)[][] = [];
  
  analytics.temporal.monthly.forEach(month => {
    rows.push([
      month.monthName,
      month.totalSales,
      month.totalRevenue.toFixed(2),
      month.totalItems,
      month.averageOrderValue.toFixed(2),
      month.topProducts[0]?.designName || 'N/A',
    ]);
  });
  
  const csv = arrayToCSV(headers, rows);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(`monthly-summary-${timestamp}.csv`, csv);
}

/**
 * Export seasonal summary to CSV
 */
export function exportSeasonalSummary(analytics: MerchAnalytics): void {
  const headers = [
    'Season',
    'Year',
    'Total Sales',
    'Total Revenue',
    'Total Items',
    'Top Product',
  ];
  const rows: (string | number)[][] = [];
  
  analytics.temporal.seasonal.forEach(season => {
    rows.push([
      season.season,
      season.year,
      season.totalSales,
      season.totalRevenue.toFixed(2),
      season.totalItems,
      season.topProducts[0]?.designName || 'N/A',
    ]);
  });
  
  const csv = arrayToCSV(headers, rows);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(`seasonal-summary-${timestamp}.csv`, csv);
}

/**
 * Export tour loadout to CSV
 */
export function exportTourLoadout(loadout: TourLoadoutResult): void {
  const headers = [
    'Product',
    'Garment Type',
    'Category',
    'Total Quantity',
    'Size Breakdown',
    'Notes',
  ];
  const rows: (string | number)[][] = [];
  
  loadout.items.forEach(item => {
    const sizeBreakdown = item.sizeBreakdown
      ? Object.entries(item.sizeBreakdown)
          .map(([size, qty]) => `${size}:${qty}`)
          .join('; ')
      : 'N/A';
    
    rows.push([
      item.designName,
      item.garmentType,
      item.category,
      item.totalQuantity,
      sizeBreakdown,
      item.notes.join('; '),
    ]);
  });
  
  // Add summary rows
  rows.push([]); // Empty row
  rows.push(['SUMMARY', '', '', '', '', '']);
  rows.push(['Total Items', loadout.summary.totalItems, '', '', '', '']);
  
  if (loadout.projectedRevenue) {
    rows.push([
      'Projected Revenue',
      `$${loadout.projectedRevenue.min} - $${loadout.projectedRevenue.max}`,
      '',
      '',
      '',
      '',
    ]);
  }
  
  rows.push(['Confidence', loadout.confidence, '', '', '', '']);
  
  // Add notes
  if (loadout.notes.length > 0) {
    rows.push([]); // Empty row
    rows.push(['NOTES', '', '', '', '', '']);
    loadout.notes.forEach(note => {
      rows.push([note, '', '', '', '', '']);
    });
  }
  
  const csv = arrayToCSV(headers, rows);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(`tour-loadout-${timestamp}.csv`, csv);
}

/**
 * Export recommendations to CSV
 */
export function exportRecommendations(recommendations: Recommendation[]): void {
  const headers = [
    'Type',
    'Severity',
    'Title',
    'Description',
    'Confidence',
    'Action',
  ];
  const rows: (string | number)[][] = [];
  
  recommendations.forEach(rec => {
    rows.push([
      rec.type,
      rec.severity,
      rec.title,
      rec.description,
      `${rec.confidence}%`,
      rec.action,
    ]);
  });
  
  const csv = arrayToCSV(headers, rows);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(`recommendations-${timestamp}.csv`, csv);
}

/**
 * Export complete analytics overview to CSV
 */
export function exportCompleteOverview(analytics: MerchAnalytics): void {
  const headers = ['Metric', 'Value'];
  const rows: (string | number)[][] = [];
  
  // Overview metrics
  rows.push(['Total Sales', analytics.overview.totalSales]);
  rows.push(['Total Revenue', `$${analytics.overview.totalRevenue.toFixed(2)}`]);
  rows.push(['Total Items Sold', analytics.overview.totalItems]);
  rows.push(['Average Order Value', `$${analytics.overview.averageOrderValue.toFixed(2)}`]);
  rows.push(['Unique Products', analytics.overview.uniqueProducts]);
  rows.push(['Date Range', `${analytics.overview.dateRange.start} to ${analytics.overview.dateRange.end}`]);
  
  rows.push([]); // Empty row
  
  // Top 5 products
  rows.push(['TOP 5 PRODUCTS', '']);
  analytics.byProduct.slice(0, 5).forEach((product, index) => {
    rows.push([
      `${index + 1}. ${product.name}`,
      `$${product.totalRevenue.toFixed(2)} (${product.totalSold} units)`,
    ]);
  });
  
  rows.push([]); // Empty row
  
  // Top 5 cities
  rows.push(['TOP 5 CITIES', '']);
  analytics.byCity.slice(0, 5).forEach((city, index) => {
    rows.push([
      `${index + 1}. ${city.city}, ${city.state}`,
      `$${city.totalRevenue.toFixed(2)} (${city.totalShows} shows)`,
    ]);
  });
  
  const csv = arrayToCSV(headers, rows);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(`complete-overview-${timestamp}.csv`, csv);
}
