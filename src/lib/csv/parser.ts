/**
 * CSV Parser Utilities
 * Handles parsing CSV files and converting to typed data
 */

import type { ParsedCSV, ParsedCSVRow } from '@/types/import';

/**
 * Parse a CSV file into structured data
 */
export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSVText(text);
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Parse CSV text into rows and columns
 */
export function parseCSVText(text: string): ParsedCSV {
  // Remove BOM if present
  const cleanText = text.replace(/^\uFEFF/, '');

  // Split into lines
  const lines = cleanText.split(/\r?\n/);

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Parse data rows
  const rows: ParsedCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: ParsedCSVRow = {};

    headers.forEach((header, index) => {
      const value = values[index];
      row[header] = value || null;
    });

    rows.push(row);
  }

  return {
    headers,
    rows,
    rowCount: rows.length
  };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Parse a date in DD/MM/YYYY format to YYYY-MM-DD
 */
export function parseDDMMYYYY(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const numeric = trimmed.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (!numeric) {
    const timestamp = Date.parse(trimmed);
    if (!Number.isFinite(timestamp)) return null;
    const parsed = new Date(timestamp);
    return validDate(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  }

  const [, day, month, year] = numeric;

  // Validate
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);

  if (dayNum < 1 || dayNum > 31) return null;
  if (monthNum < 1 || monthNum > 12) return null;
  if (yearNum < 1900 || yearNum > 2100) return null;

  return validDate(yearNum, monthNum, dayNum);
}

function validDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse a currency string to a number
 * Examples: "$1,234.56" → 1234.56, "1234" → 1234
 */
export function parseCurrency(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;

  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[$€£¥,\s]/g, '');

  // Handle empty or non-numeric
  if (!cleaned || cleaned === '-') return 0;

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a percentage string to a decimal
 * Examples: "10%" → 0.10, "15.5%" → 0.155
 */
export function parsePercentage(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;

  const cleaned = value.replace(/%/g, '').trim();
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed / 100;
}

/**
 * Extract city and state from a string
 * Examples: "Lexington KY" → { city: "Lexington", state: "KY" }
 */
export function extractCityState(cityStr: string): { city: string; state?: string } {
  if (!cityStr || typeof cityStr !== 'string') {
    return { city: '' };
  }

  const trimmed = cityStr.trim();
  const parts = trimmed.split(/\s+/);

  // Check if last part is a 2-letter state code
  if (parts.length > 1 && parts[parts.length - 1].length === 2) {
    const state = parts[parts.length - 1].toUpperCase();
    const city = parts.slice(0, -1).join(' ');
    return { city, state };
  }

  return { city: trimmed };
}

/**
 * Detect if a value is empty/null/undefined
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'number' && isNaN(value)) return true;
  return false;
}

/**
 * Format number as currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Parse a YYYY-MM-DD date string as a local date (not UTC)
 * This prevents timezone issues where dates shift by one day
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Format a YYYY-MM-DD date string for display (timezone-safe)
 */
export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', options);
}
