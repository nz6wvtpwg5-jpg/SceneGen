/**
 * CSV Import Types
 * Handles importing shows and budgets from CSV files
 */

export interface ParsedCSVRow {
  [columnName: string]: string | number | null;
}

export interface ParsedCSV {
  headers: string[];
  rows: ParsedCSVRow[];
  rowCount: number;
  sourceKind?: ImportSourceKind;
  sourceName?: string;
  sourcePreset?: 'generic' | 'master_tour';
}

export type ImportSourceKind = 'csv' | 'spreadsheet' | 'document' | 'text' | 'image';

export type ColumnClassification = 'income' | 'outgoing' | 'ignore';

export interface FieldMapping {
  csvColumn: string;
  scenegenField: string;
  type: 'show' | 'budget' | 'line_item';
  dataType: 'string' | 'number' | 'date' | 'currency';
  category?: string; // For line_item type
  transform?: (value: any) => any;
  required?: boolean;
  classification?: ColumnClassification; // User-defined classification
}

export interface ValidationIssue {
  row: number;
  field: string;
  level: 'error' | 'warning';
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  validRowCount: number;
  skippedRowCount: number;
}

export interface ImportShow {
  date: string; // YYYY-MM-DD
  city: string;
  state?: string;
  country?: string;
  venueName?: string;
  fee?: number;
  startTime?: string;
  endTime?: string;
  notes?: string;
  rowIndex: number; // Original CSV row number
}

export interface ImportBudget {
  budgetName: string;
  showIndex: number; // Index in ImportShow array
  currency: string;
  distance?: number;
  cashFlow?: number;
  previousSales?: number;
  lineItems: ImportLineItem[];
}

export interface ImportLineItem {
  type: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  notes?: string;
}

export interface ImportData {
  tour?: {
    id?: string; // If adding to existing tour
    name?: string; // If creating new tour
    startDate?: string;
    endDate?: string;
    currency?: string;
    origin?: {
      city: string;
      state: string;
      lat?: number;
      lng?: number;
    };
    destination?: {
      city: string;
      state: string;
      lat?: number;
      lng?: number;
    };
  };
  shows: ImportShow[];
  budgets: ImportBudget[];
  duplicatePolicy?: 'skip' | 'import_anyway';
  source?: {
    kind: ImportSourceKind;
    name?: string;
    preset?: 'generic' | 'master_tour';
  };
}

export interface ImportResult {
  success: boolean;
  tourId: string;
  showsCreated: number;
  budgetsCreated: number;
  lineItemsCreated: number;
  duplicatesSkipped?: number;
  showIds: string[];
  budgetIds: string[];
  errors?: string[];
}

export type ImportStep = 'upload' | 'mapping' | 'validation' | 'importing' | 'complete';

export interface ImportState {
  step: ImportStep;
  file: File | null;
  parsedData: ParsedCSV | null;
  mappings: FieldMapping[];
  validation: ValidationResult | null;
  importData: ImportData | null;
  result: ImportResult | null;
  error: string | null;
}
