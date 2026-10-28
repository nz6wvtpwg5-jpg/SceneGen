/**
 * CSV Data Validator
 * Validates parsed CSV data before import
 */

import type {
  ParsedCSVRow,
  FieldMapping,
  ValidationIssue,
  ValidationResult,
  ImportShow,
  ImportBudget,
  ImportLineItem,
} from '@/types/import';
import { isEmpty } from './parser';
import { parseDDMMYYYY } from './parser';
import { getMappingsByType, getLineItemName } from './mapper';

/**
 * Validate all rows of CSV data
 */
export function validateCSVData(
  rows: ParsedCSVRow[],
  mappings: FieldMapping[]
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let validRowCount = 0;
  let skippedRowCount = 0;
  const dateMapping = mappings.find(mapping => mapping.type === 'show' && mapping.scenegenField === 'date');
  const cityMapping = mappings.find(mapping => mapping.type === 'show' && mapping.scenegenField === 'city');

  if (!dateMapping || !cityMapping) {
    return {
      valid: false,
      errors: [{ row: 1, field: !dateMapping ? 'Date' : 'City', level: 'error', message: 'Map one column to Show date and one to City / town' }],
      warnings,
      validRowCount: 0,
      skippedRowCount: rows.length,
    };
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 for header row and 0-index

    // Check if this row has multiple missing required fields (likely an empty/separator row)
    const dateValue = row[dateMapping.csvColumn];
    const cityValue = row[cityMapping.csvColumn];
    const missingRequiredFields = [
      isEmpty(dateValue),
      isEmpty(cityValue),
    ].filter(Boolean).length;

    // Skip rows with 2+ missing required fields (likely empty rows)
    if (missingRequiredFields >= 2) {
      skippedRowCount++;
      return;
    }

    // Check if this is an "off" day
    const city = String(cityValue || '').toLowerCase();
    if (city === 'off') {
      skippedRowCount++;
      warnings.push({
        row: rowNumber,
        field: 'City',
        level: 'warning',
        message: 'Off day - will create a schedule entry with zero revenue',
        value: row['City'],
      });
      validRowCount++; // Still valid, just handled specially
      return;
    }

    // Validate required fields
    if (isEmpty(dateValue)) {
      errors.push({
        row: rowNumber,
        field: 'Date',
        level: 'error',
        message: 'Date is required',
        value: dateValue,
      });
    } else {
      // Validate date format
      const dateStr = String(dateValue);
      if (!parseDDMMYYYY(dateStr)) {
        errors.push({
          row: rowNumber,
          field: 'Date',
          level: 'error',
        message: 'Date was not recognised',
          value: dateValue,
        });
      }
    }

    if (isEmpty(cityValue)) {
      errors.push({
        row: rowNumber,
        field: 'City',
        level: 'error',
        message: 'City is required',
        value: cityValue,
      });
    }

    // Validate numeric fields
    const ticketSalesMapping = mappings.find(mapping => mapping.csvColumn.toLowerCase() === 'ticket sales');
    const ticketSales = ticketSalesMapping ? row[ticketSalesMapping.csvColumn] : null;
    if (!isEmpty(ticketSales)) {
      const parsed = parseFloat(String(ticketSales).replace(/[$,]/g, ''));
      if (isNaN(parsed)) {
        errors.push({
          row: rowNumber,
          field: 'Ticket sales',
          level: 'error',
          message: 'Invalid number format',
          value: ticketSales,
        });
      } else if (parsed === 0 && city !== 'off') {
        warnings.push({
          row: rowNumber,
          field: 'Ticket sales',
          level: 'warning',
          message: 'Ticket sales is $0',
          value: ticketSales,
        });
      }
    }

    // If no errors for this row, count as valid
    const rowErrors = errors.filter(e => e.row === rowNumber);
    if (rowErrors.length === 0) {
      validRowCount++;
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validRowCount,
    skippedRowCount,
  };
}

/**
 * Transform validated CSV data into import format
 */
export function transformToImportData(
  rows: ParsedCSVRow[],
  mappings: FieldMapping[],
  currency: string
): { shows: ImportShow[]; budgets: ImportBudget[] } {
  const shows: ImportShow[] = [];
  const budgets: ImportBudget[] = [];

  const showMappings = getMappingsByType(mappings, 'show');
  const budgetMappings = getMappingsByType(mappings, 'budget');
  const lineItemMappings = getMappingsByType(mappings, 'line_item');
  const dateMapping = showMappings.find(mapping => mapping.scenegenField === 'date');
  const cityMapping = showMappings.find(mapping => mapping.scenegenField === 'city');

  rows.forEach((row) => {
    // Skip empty rows
    if (Object.values(row).every(isEmpty)) return;

    // Skip rows with multiple missing required fields (same logic as validator)
    const dateValue = dateMapping ? row[dateMapping.csvColumn] : null;
    const cityValue = cityMapping ? row[cityMapping.csvColumn] : null;
    const missingRequiredFields = [
      isEmpty(dateValue),
      isEmpty(cityValue),
    ].filter(Boolean).length;

    if (missingRequiredFields >= 2) {
      return; // Skip this row
    }

    // Transform show data
    const show: ImportShow = {
      date: '',
      city: '',
      // Keep this aligned with ImportBudget.showIndex after blank rows are skipped.
      rowIndex: shows.length,
    };

    showMappings.forEach(mapping => {
      const value = row[mapping.csvColumn];
      if (isEmpty(value)) return;

      const transformed = mapping.transform
        ? mapping.transform(value)
        : value;

      (show as any)[mapping.scenegenField] = transformed;
    });

    shows.push(show);

    // Transform budget data
    const city = String(cityValue || '').trim();
    const date = String(dateValue || '').trim();
    const budgetName = city === 'off'
      ? `Travel Day - ${date}`
      : `${city} - ${date}`;

    const budget: ImportBudget = {
      budgetName,
      showIndex: shows.length - 1,
      currency,
      lineItems: [],
    };

    // Add budget info fields
    budgetMappings.forEach(mapping => {
      const value = row[mapping.csvColumn];
      if (isEmpty(value)) return;

      const transformed = mapping.transform
        ? mapping.transform(value)
        : value;

      (budget as any)[mapping.scenegenField] = transformed;
    });

    // Transform line items
    lineItemMappings.forEach(mapping => {
      // Skip ignored columns
      if (mapping.classification === 'ignore') return;

      const value = row[mapping.csvColumn];
      if (isEmpty(value)) return;

      const amount = mapping.transform
        ? mapping.transform(value)
        : parseFloat(String(value));

      if (amount === 0) return; // Skip $0 line items

      // Determine type based on classification (with fallback to category)
      let itemType: 'revenue' | 'expense';
      if (mapping.classification === 'income') {
        itemType = 'revenue';
      } else if (mapping.classification === 'outgoing') {
        itemType = 'expense';
      } else {
        // Fallback to old category-based logic
        itemType = mapping.category === 'revenue' ? 'revenue' : 'expense';
      }

      const lineItem: ImportLineItem = {
        type: itemType,
        category: mapping.category || 'extra_expenses',
        name: getLineItemName(mapping.csvColumn),
        amount,
      };

      budget.lineItems.push(lineItem);
    });

    budgets.push(budget);
  });

  return { shows, budgets };
}

export interface CurrencyDetectionResult {
  currency: string | null;
  matches: number;
  totalCurrencyCells: number;
  confidence: number;
  counts: Record<string, number>;
}

/**
 * Infer the dominant currency from mapped financial columns only. The result
 * is a suggestion; the import UI still requires explicit user confirmation.
 */
export function detectImportCurrency(
  rows: ParsedCSVRow[],
  mappings: FieldMapping[]
): CurrencyDetectionResult {
  const financialColumns = new Set(
    mappings
      .filter((mapping) =>
        mapping.dataType === 'currency' &&
        (mapping.type === 'budget' || mapping.type === 'line_item') &&
        mapping.classification !== 'ignore'
      )
      .map((mapping) => mapping.csvColumn)
  );

  const counts: Record<string, number> = {};
  let totalCurrencyCells = 0;

  rows.forEach((row) => {
    financialColumns.forEach((column) => {
      const raw = row[column];
      if (raw === null || raw === undefined) return;
      const value = String(raw).trim().toUpperCase();
      if (!value) return;

      let detected: string | null = null;
      if (/C\$|CA\$|\bCAD\b/.test(value)) detected = 'CAD';
      else if (/A\$|\bAUD\b/.test(value)) detected = 'AUD';
      else if (/NZ\$|\bNZD\b/.test(value)) detected = 'NZD';
      else if (/€|\bEUR\b/.test(value)) detected = 'EUR';
      else if (/£|\bGBP\b/.test(value)) detected = 'GBP';
      else if (/\bCHF\b/.test(value)) detected = 'CHF';
      else if (/\bSEK\b/.test(value)) detected = 'SEK';
      else if (/\bNOK\b/.test(value)) detected = 'NOK';
      else if (/\bDKK\b/.test(value)) detected = 'DKK';
      else if (/ZŁ|\bPLN\b/.test(value)) detected = 'PLN';
      else if (/KČ|\bCZK\b/.test(value)) detected = 'CZK';
      else if (/¥|\bJPY\b/.test(value)) detected = 'JPY';
      else if (/\$|\bUSD\b/.test(value)) detected = 'USD';

      if (detected) {
        counts[detected] = (counts[detected] || 0) + 1;
        totalCurrencyCells += 1;
      }
    });
  });

  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const currency = dominant?.[0] || null;
  const matches = dominant?.[1] || 0;

  return {
    currency,
    matches,
    totalCurrencyCells,
    confidence: totalCurrencyCells > 0 ? matches / totalCurrencyCells : 0,
    counts,
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distances between consecutive shows and update budgets
 */
export function calculateDistancesForImport(
  shows: ImportShow[],
  budgets: ImportBudget[],
  showAddresses: Record<number, { lat: number; lng: number }>
): ImportBudget[] {
  const updatedBudgets = [...budgets];

  // Sort shows by date to get proper sequence
  const sortedShowsWithIndex = shows
    .map((show, index) => ({ show, index }))
    .filter(({ index }) => showAddresses[index]?.lat && showAddresses[index]?.lng)
    .sort((a, b) => new Date(a.show.date).getTime() - new Date(b.show.date).getTime());

  // Calculate distances between consecutive shows
  for (let i = 1; i < sortedShowsWithIndex.length; i++) {
    const prevShowData = sortedShowsWithIndex[i - 1];
    const currShowData = sortedShowsWithIndex[i];

    const prevAddr = showAddresses[prevShowData.index];
    const currAddr = showAddresses[currShowData.index];

    if (prevAddr && currAddr) {
      const distance = calculateDistance(
        prevAddr.lat,
        prevAddr.lng,
        currAddr.lat,
        currAddr.lng
      );

      // Round to 1 decimal place
      const roundedDistance = Math.round(distance * 10) / 10;

      // Update the budget for the current show
      const budgetIndex = updatedBudgets.findIndex(b => b.showIndex === currShowData.index);
      if (budgetIndex >= 0) {
        updatedBudgets[budgetIndex] = {
          ...updatedBudgets[budgetIndex],
          distance: roundedDistance
        };
      }
    }
  }

  return updatedBudgets;
}

/**
 * Calculate statistics from import data
 */
export function calculateImportStats(budgets: ImportBudget[], shows: ImportShow[]) {
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalLineItems = 0;
  let totalFees = 0;
  let totalMiles = 0;

  // Safety check for undefined/null
  if (!budgets || !Array.isArray(budgets)) {
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      profit: 0,
      totalLineItems: 0,
      averageFeesPerShow: 0,
      averageExpensesPerShow: 0,
      totalMiles: 0,
    };
  }

  budgets.forEach(budget => {
    if (!budget.lineItems || !Array.isArray(budget.lineItems)) return;

    budget.lineItems.forEach(item => {
      totalLineItems++;
      if (item.type === 'revenue') {
        totalRevenue += item.amount;
        // Count show-fee aliases while excluding unrelated revenue such as merch.
        if (item.name && item.name.toLowerCase().includes('fee')) {
          totalFees += item.amount;
        }
      } else {
        totalExpenses += item.amount;
      }
    });

    // Add distance from budget if available
    if (budget.distance) {
      totalMiles += budget.distance;
    }
  });

  return {
    totalRevenue,
    totalExpenses,
    profit: totalRevenue - totalExpenses,
    totalLineItems,
    averageFeesPerShow: shows.length > 0 ? totalFees / shows.length : 0,
    averageExpensesPerShow: budgets.length > 0 ? totalExpenses / budgets.length : 0,
    totalMiles,
  };
}

/**
 * Get date range from shows
 */
export function getDateRange(shows: ImportShow[]): { startDate: string; endDate: string } | null {
  if (shows.length === 0) return null;

  const dates = shows
    .map(s => s.date)
    .filter(d => d)
    .sort();

  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
  };
}
