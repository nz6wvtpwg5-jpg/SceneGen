/**
 * CSV Field Mapper
 * Maps CSV columns to SceneGen database fields
 */

import type { FieldMapping } from '@/types/import';
import { parseDDMMYYYY, parseCurrency, extractCityState } from './parser';

/**
 * Default field mappings for tour budget CSV
 */
export const defaultMappings: FieldMapping[] = [
  // Show fields
  {
    csvColumn: 'Date',
    scenegenField: 'date',
    type: 'show',
    dataType: 'date',
    transform: parseDDMMYYYY,
    required: true,
  },
  {
    csvColumn: 'City',
    scenegenField: 'city',
    type: 'show',
    dataType: 'string',
    transform: (val) => extractCityState(val).city,
    required: true,
  },
  {
    csvColumn: 'City',
    scenegenField: 'state',
    type: 'show',
    dataType: 'string',
    transform: (val) => extractCityState(val).state,
  },

  // Budget info fields
  {
    csvColumn: 'Distance',
    scenegenField: 'distance',
    type: 'budget',
    dataType: 'number',
    transform: parseCurrency, // Reuse currency parser for numbers
  },
  {
    csvColumn: 'Cash flow',
    scenegenField: 'cashFlow',
    type: 'budget',
    dataType: 'currency',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Previous sales',
    scenegenField: 'previousSales',
    type: 'budget',
    dataType: 'currency',
    transform: parseCurrency,
  },

  // Revenue line items
  {
    csvColumn: 'Fees Cash',
    scenegenField: 'feesCash',
    type: 'line_item',
    dataType: 'currency',
    category: 'revenue',
    classification: 'income',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Fees',
    scenegenField: 'fees',
    type: 'line_item',
    dataType: 'currency',
    category: 'revenue',
    classification: 'income',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Merch PPL/Card',
    scenegenField: 'merchCard',
    type: 'line_item',
    dataType: 'currency',
    category: 'revenue',
    classification: 'income',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Merch Cash',
    scenegenField: 'merchCash',
    type: 'line_item',
    dataType: 'currency',
    category: 'revenue',
    classification: 'income',
    transform: parseCurrency,
  },

  // Expense line items
  {
    csvColumn: 'To Nate 10%',
    scenegenField: 'agentCommission',
    type: 'line_item',
    dataType: 'currency',
    category: 'agent_commission',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'To NMC',
    scenegenField: 'agentCommission',
    type: 'line_item',
    dataType: 'currency',
    category: 'agent_commission',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Van',
    scenegenField: 'van',
    type: 'line_item',
    dataType: 'currency',
    category: 'van_costs',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Driver',
    scenegenField: 'driver',
    type: 'line_item',
    dataType: 'currency',
    category: 'general_payouts',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Van Rental',
    scenegenField: 'vanRental',
    type: 'line_item',
    dataType: 'currency',
    category: 'van_rental',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Gas',
    scenegenField: 'gas',
    type: 'line_item',
    dataType: 'currency',
    category: 'gas_costs',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Accom',
    scenegenField: 'accommodation',
    type: 'line_item',
    dataType: 'currency',
    category: 'accommodation_costs',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'To Dave',
    scenegenField: 'toDave',
    type: 'line_item',
    dataType: 'currency',
    category: 'general_payouts',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'To Johnny',
    scenegenField: 'toJohnny',
    type: 'line_item',
    dataType: 'currency',
    category: 'general_payouts',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Flight',
    scenegenField: 'flight',
    type: 'line_item',
    dataType: 'currency',
    category: 'flight_costs',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Payouts',
    scenegenField: 'payouts',
    type: 'line_item',
    dataType: 'currency',
    category: 'general_payouts',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Merch person',
    scenegenField: 'merchPerson',
    type: 'line_item',
    dataType: 'currency',
    category: 'general_payouts',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'Merch costs',
    scenegenField: 'merchCosts',
    type: 'line_item',
    dataType: 'currency',
    category: 'merch_cost_of_goods',
    classification: 'outgoing',
    transform: parseCurrency,
  },
  {
    csvColumn: 'XTRA',
    scenegenField: 'extra',
    type: 'line_item',
    dataType: 'currency',
    category: 'extra_expenses',
    classification: 'outgoing',
    transform: parseCurrency,
  },
];

export const importFieldOptions = [
  { value: 'ignore', label: 'Do not import' },
  { value: 'date', label: 'Show date' },
  { value: 'city', label: 'City / town' },
  { value: 'state', label: 'State / region' },
  { value: 'country', label: 'Country' },
  { value: 'venueName', label: 'Venue name' },
  { value: 'fee', label: 'Artist fee / guarantee' },
  { value: 'startTime', label: 'Show / set time' },
  { value: 'endTime', label: 'Curfew / end time' },
  { value: 'notes', label: 'Notes' },
  { value: 'distance', label: 'Distance' },
  { value: 'cashFlow', label: 'Cash flow' },
  { value: 'previousSales', label: 'Previous sales' },
  { value: 'income', label: 'Budget income' },
  { value: 'outgoing', label: 'Budget outgoing' },
] as const;

const headerAliases: Record<string, string> = {
  date: 'date', showdate: 'date', eventdate: 'date', daydate: 'date', performance_date: 'date',
  city: 'city', town: 'city', market: 'city', venuecity: 'city', locationcity: 'city',
  state: 'state', province: 'state', region: 'state', stateprovince: 'state',
  country: 'country', nation: 'country',
  venue: 'venueName', venuename: 'venueName', room: 'venueName', club: 'venueName',
  fee: 'fee', guarantee: 'fee', artistfee: 'fee', performancefee: 'fee', dealvalue: 'fee',
  showtime: 'startTime', settime: 'startTime', stagetime: 'startTime', performance_time: 'startTime',
  curfew: 'endTime', endtime: 'endTime',
  notes: 'notes', note: 'notes', comments: 'notes', deal: 'notes',
  distance: 'distance', mileage: 'distance', miles: 'distance', km: 'distance',
  cashflow: 'cashFlow', previoussales: 'previousSales', historicalsales: 'previousSales',
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, '');
}

export function createMapping(csvColumn: string, target: string): FieldMapping {
  if (target === 'ignore') return { csvColumn, scenegenField: 'ignored', type: 'line_item', dataType: 'string', classification: 'ignore' };
  if (target === 'income' || target === 'outgoing') return {
    csvColumn, scenegenField: normalizeHeader(csvColumn) || 'lineItem', type: 'line_item', dataType: 'currency',
    category: target === 'income' ? 'revenue' : 'extra_expenses', classification: target, transform: parseCurrency,
  };
  if (['distance', 'cashFlow', 'previousSales'].includes(target)) return {
    csvColumn, scenegenField: target, type: 'budget', dataType: target === 'distance' ? 'number' : 'currency', transform: parseCurrency,
  };
  const mapping: FieldMapping = {
    csvColumn, scenegenField: target, type: 'show',
    dataType: target === 'date' ? 'date' : target === 'fee' ? 'currency' : 'string',
    required: target === 'date' || target === 'city',
  };
  if (target === 'date') mapping.transform = parseDDMMYYYY;
  if (target === 'fee') mapping.transform = parseCurrency;
  if (target === 'city') mapping.transform = (value) => extractCityState(value).city;
  return mapping;
}

/**
 * Auto-detect mappings based on CSV headers
 */
export function autoDetectMappings(headers: string[]): FieldMapping[] {
  return headers.map(header => {
    const exact = defaultMappings.find(mapping => normalizeHeader(mapping.csvColumn) === normalizeHeader(header));
    if (exact) return { ...exact, csvColumn: header };
    const normalized = normalizeHeader(header);
    const target = headerAliases[normalized];
    if (target) return createMapping(header, target);
    if (/revenue|income|gross|ticket.*sales|merch.*sales/.test(normalized)) return createMapping(header, 'income');
    if (/cost|expense|hotel|accom|fuel|gas|flight|ferry|wage|crew|rental|commission|payout/.test(normalized)) return createMapping(header, 'outgoing');
    return createMapping(header, 'ignore');
  });
}

/**
 * Get line item display name from CSV column
 */
export function getLineItemName(csvColumn: string): string {
  const nameMap: Record<string, string> = {
    'To Nate 10%': 'Agent Commission',
    'Van': 'Van Costs',
    'Driver': 'Driver Fee',
    'Van Rental': 'Van Rental',
    'Gas': 'Gas',
    'Accom': 'Accommodation',
    'To Dave': 'Payment to Dave',
    'To Johnny': 'Payment to Johnny',
    'Flight': 'Flight Costs',
    'Payouts': 'General Payouts',
    'Merch person': 'Merch Person Fee',
    'Merch costs': 'Merch Cost of Goods',
    'XTRA': 'Extra Expenses',
    'Fees Cash': 'Fees Cash',
    'Fees': 'Show Fee',
    'To NMC': 'Agent Commission',
    'Merch PPL/Card': 'Merch Card Sales',
    'Merch Cash': 'Merch Cash Sales',
  };

  return nameMap[csvColumn] || csvColumn;
}

/**
 * Get all mappings for a specific type
 */
export function getMappingsByType(
  mappings: FieldMapping[],
  type: 'show' | 'budget' | 'line_item'
): FieldMapping[] {
  return mappings.filter(m => m.type === type);
}

/**
 * Validate that required mappings are present
 */
export function validateMappings(mappings: FieldMapping[]): string[] {
  const errors: string[] = [];

  const requiredFields = ['date', 'city'];

  for (const required of requiredFields) {
    const hasMapping = mappings.some(m => m.scenegenField === required && m.classification !== 'ignore');
    if (!hasMapping) {
      errors.push(`Required field "${required}" is not mapped`);
    }
  }

  return errors;
}
