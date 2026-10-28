/**
 * Budget Type Definitions
 * For show bookkeeping and financial tracking
 */

export interface BudgetLineItem {
  id: string;
  category: 'income' | 'expense';
  subcategory: string;
  description: string;
  budgetedAmount: number;
  actualAmount?: number;
  notes?: string;
}

export interface Budget {
  id: string;
  showId: string;
  tourId?: string; // Link to tour (optional)
  entityId: string; // Owner entity
  createdBy: string;
  showName?: string; // Denormalized for easy display
  venueCity?: string; // Denormalized for easy display
  showDate?: string; // Denormalized for easy display
  createdAt: string;
  updatedAt: string;

  // Metadata
  budgetName: string;
  currency: string;
  notes?: string;

  // Line items (existing structure)
  lineItems: BudgetLineItem[];

  // Calculated totals
  totalBudgetedIncome: number;
  totalBudgetedExpenses: number;
  totalActualIncome?: number;
  totalActualExpenses?: number;
  netBudgeted: number;
  netActual?: number;

  // Extended fields from CSV template (for detailed tracking)
  // Revenue
  ticketSales?: number;
  merchSalesPerPerson?: number;
  merchCardSales?: number;
  merchCashSales?: number;
  totalSales?: number;
  previousSales?: number;

  // Logistics
  city?: string;
  distance?: number; // in miles or km

  // Expenses
  cashFlow?: number;
  feesCash?: number;
  extraExpenses?: number;
  agentCommissionPercent?: number; // Default 10%
  agentCommission?: number;
  vanCosts?: number;
  driverFees?: number;
  vanRental?: number;
  gasCosts?: number;
  accommodationCosts?: number;
  flightCosts?: number;
  generalPayouts?: number;
  merchPersonFees?: number;
  merchCostOfGoods?: number;

  // Additional calculated fields
  feeBalance?: number;
  feeSurplus?: number;
  totalExpenses?: number;
  merchDailySurplus?: number;
  orderCount?: number;
  avgCardOrderValue?: number;
  netProfit?: number;
  variation?: number;

  // Related data
  bandMemberPayouts?: BandMemberPayout[];
}

export interface BandMemberPayout {
  id?: string;
  budgetId?: string;
  memberId?: string; // Optional link to contact
  memberName: string;
  amount: number;
  percentage?: number; // If percentage-based
  notes?: string;
  createdAt?: string;
}

export interface CreateBudgetInput {
  showId: string;
  tourId?: string;
  budgetName: string;
  currency?: string;
  notes?: string;
  lineItems?: BudgetLineItem[];
}

export interface UpdateBudgetInput {
  budgetName?: string;
  currency?: string;
  notes?: string;
  lineItems?: BudgetLineItem[];

  // Extended fields
  ticketSales?: number;
  merchSalesPerPerson?: number;
  merchCardSales?: number;
  merchCashSales?: number;
  city?: string;
  distance?: number;
  cashFlow?: number;
  feesCash?: number;
  extraExpenses?: number;
  agentCommissionPercent?: number;
  vanCosts?: number;
  driverFees?: number;
  vanRental?: number;
  gasCosts?: number;
  accommodationCosts?: number;
  flightCosts?: number;
  merchPersonFees?: number;
  merchCostOfGoods?: number;
  orderCount?: number;
}

export interface BudgetSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number; // Percentage
  bandMemberPayouts: number;
  merchProfit: number;
  ticketProfit: number;
}

export interface BudgetFilters {
  showId?: string;
  tourId?: string;
  entityId?: string;
  search?: string;
}

// Predefined budget categories
export const INCOME_CATEGORIES = [
  'Ticket Sales',
  'Guarantee',
  'Merchandise',
  'Bar Split',
  'Sponsorship',
  'Other Income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Artist Fee',
  'Travel',
  'Accommodation',
  'Food & Per Diem',
  'Equipment Rental',
  'Venue Rental',
  'Marketing',
  'Staff',
  'Insurance',
  'Merchandise Costs',
  'Other Expenses',
] as const;

/**
 * Calculate total revenue from budget fields
 */
export function calculateTotalRevenue(budget: Partial<Budget>): number {
  const {
    ticketSales = 0,
    merchCardSales = 0,
    merchCashSales = 0,
  } = budget;

  return ticketSales + merchCardSales + merchCashSales;
}

/**
 * Calculate total expenses from budget fields
 */
export function calculateTotalExpenses(budget: Partial<Budget>): number {
  const {
    feesCash = 0,
    extraExpenses = 0,
    agentCommission = 0,
    vanCosts = 0,
    driverFees = 0,
    vanRental = 0,
    gasCosts = 0,
    accommodationCosts = 0,
    flightCosts = 0,
    generalPayouts = 0,
    merchPersonFees = 0,
    merchCostOfGoods = 0,
  } = budget;

  return (
    feesCash +
    extraExpenses +
    agentCommission +
    vanCosts +
    driverFees +
    vanRental +
    gasCosts +
    accommodationCosts +
    flightCosts +
    generalPayouts +
    merchPersonFees +
    merchCostOfGoods
  );
}

/**
 * Calculate band member payouts total
 */
export function calculateBandMemberPayoutsTotal(
  payouts: BandMemberPayout[] = []
): number {
  return payouts.reduce((sum, payout) => sum + payout.amount, 0);
}

/**
 * Calculate net profit
 */
export function calculateNetProfit(budget: Partial<Budget>): number {
  const revenue = calculateTotalRevenue(budget);
  const expenses = calculateTotalExpenses(budget);
  const payouts = calculateBandMemberPayoutsTotal(budget.bandMemberPayouts);

  return revenue - expenses - payouts;
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(budget: Partial<Budget>): number {
  const revenue = calculateTotalRevenue(budget);
  const profit = calculateNetProfit(budget);

  if (revenue === 0) return 0;

  return (profit / revenue) * 100;
}

/**
 * Calculate merchandise profit
 */
export function calculateMerchProfit(budget: Partial<Budget>): number {
  const {
    merchCardSales = 0,
    merchCashSales = 0,
    merchCostOfGoods = 0,
    merchPersonFees = 0,
  } = budget;

  return merchCardSales + merchCashSales - merchCostOfGoods - merchPersonFees;
}

/**
 * Calculate average card order value
 */
export function calculateAvgCardOrderValue(budget: Partial<Budget>): number {
  const { merchCardSales = 0, orderCount = 0 } = budget;

  if (orderCount === 0) return 0;

  return merchCardSales / orderCount;
}

/**
 * Calculate agent commission from percentage
 */
export function calculateAgentCommission(
  totalRevenue: number,
  commissionPercent: number = 10
): number {
  return totalRevenue * (commissionPercent / 100);
}

/**
 * Generate a budget summary from a budget object
 */
export function generateBudgetSummary(budget: Budget): BudgetSummary {
  const totalRevenue = calculateTotalRevenue(budget);
  const totalExpenses = calculateTotalExpenses(budget);
  const bandMemberPayouts = calculateBandMemberPayoutsTotal(
    budget.bandMemberPayouts
  );
  const netProfit = calculateNetProfit(budget);
  const profitMargin = calculateProfitMargin(budget);
  const merchProfit = calculateMerchProfit(budget);
  const ticketProfit = (budget.ticketSales || 0) - totalExpenses;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    bandMemberPayouts,
    merchProfit,
    ticketProfit,
  };
}
