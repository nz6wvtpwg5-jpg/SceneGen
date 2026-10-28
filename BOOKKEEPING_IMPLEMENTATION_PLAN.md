# Bookkeeping Feature Implementation Plan

## Overview
Create a comprehensive tour bookkeeping system that allows users to track expenses, revenue, and profitability for shows and tours based on the provided budget template.

## Budget Template Analysis

The CSV template tracks the following categories:

### Revenue Columns
- **Ticket sales** - Revenue from ticket sales
- **Merch sales per person** - Merchandise revenue per capita
- **Merch PPL/Card** - Merchandise payment processing
- **Merch Cash** - Cash merchandise sales
- **Sales** - Total sales
- **Previous sales** - Historical comparison

### Expense Columns
- **Cash flow** - Overall cash position
- **Fees Cash** - Fee payments in cash
- **XTRA** - Extra/miscellaneous expenses
- **To Nate 10%** - Agent/manager commission (10%)
- **Van** - Van/transportation costs
- **Driver** - Driver fees
- **Van Rental** - Vehicle rental costs
- **Gas** - Fuel expenses
- **Accom** - Accommodation costs
- **To Dave** - Band member payment
- **To Johnny** - Band member payment
- **Flight** - Flight costs
- **Payouts** - General payouts
- **Merch person** - Merchandise handler fees
- **Merch costs** - Cost of goods sold

### Calculated Fields
- **Fee Balance** - Running balance of fees
- **Fee surplus** - Surplus from fees
- **Total** - Total expenses
- **Merch Daily Surplus** - Daily merchandise profit
- **orders** - Number of orders
- **avg card order value** - Average transaction value
- **Variation** - Period-over-period changes

### Logistics Columns
- **Date** - Show date
- **City** - Show location
- **Distance** - Travel distance between shows

## Data Model Design

### 1. Budget Type Definition (`src/types/budget.ts`)

```typescript
export interface Budget {
  id: string;
  showId: string; // Link to show
  tourId?: string; // Link to tour (optional)
  entityId: string; // Owner entity
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  // Metadata
  budgetName: string;
  currency: string; // ISO currency code
  notes?: string;

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
  bandMemberPayouts?: BandMemberPayout[];
  flightCosts?: number;
  generalPayouts?: number;
  merchPersonFees?: number;
  merchCostOfGoods?: number;

  // Calculated fields (auto-calculated)
  feeBalance?: number;
  feeSurplus?: number;
  totalExpenses?: number;
  merchDailySurplus?: number;
  orderCount?: number;
  avgCardOrderValue?: number;
  netProfit?: number;
  variation?: number;
}

export interface BandMemberPayout {
  memberId?: string; // Optional link to contact
  memberName: string;
  amount: number;
  percentage?: number; // If percentage-based
  notes?: string;
}

export interface CreateBudgetInput {
  showId: string;
  tourId?: string;
  budgetName: string;
  currency?: string; // Default to show currency
  notes?: string;
}

export interface UpdateBudgetInput {
  budgetName?: string;
  currency?: string;
  notes?: string;

  // All revenue and expense fields optional
  ticketSales?: number;
  merchSalesPerPerson?: number;
  merchCardSales?: number;
  merchCashSales?: number;
  // ... etc
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
```

## UI/UX Design

### Page Structure: `/bookkeeping`

```
┌─────────────────────────────────────────────────────────┐
│  Bookkeeping                              [+ New Budget] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Filters:                                                │
│  [Tour: All Tours ▼] [Show: All Shows ▼] [Search...]   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Budget List / Table                                 │ │
│  ├────────┬──────────┬──────────┬──────────┬──────────┤ │
│  │ Budget │ Show     │ Date     │ Revenue  │ Expenses │ │
│  │        │ (City)   │          │          │          │ │
│  ├────────┼──────────┼──────────┼──────────┼──────────┤ │
│  │ Spring │ Brooklyn │ 03/15/24 │ $3,500   │ $2,100   │ │
│  │ Tour   │          │          │          │          │ │
│  ├────────┼──────────┼──────────┼──────────┼──────────┤ │
│  │ Fall   │ Austin   │ 10/20/24 │ $4,200   │ $2,800   │ │
│  │ Tour   │          │          │          │          │ │
│  └────────┴──────────┴──────────┴──────────┴──────────┘ │
│                                                          │
│  Net Profit  │  Profit ▼ │ [View] [Edit] [Delete]      │
│  $1,400      │  40%      │                              │
│  $1,400      │  33%      │                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Budget Creation Modal

```
┌─────────────────────────────────────────────────────────┐
│  Create New Budget                                   [X] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Budget Name*                                            │
│  [________________________________]                      │
│                                                          │
│  Link to Show*                                           │
│  [Search by venue, city, or date...         ] [Search]  │
│                                                          │
│  Search Results:                                         │
│  ○ Brooklyn Bowl - Brooklyn, NY (03/15/24)              │
│  ○ Emo's - Austin, TX (10/20/24)                        │
│  ○ The Roxy - Los Angeles, CA (11/05/24)                │
│                                                          │
│  Link to Tour (Optional)                                 │
│  [Select Tour ▼]                                         │
│                                                          │
│  Currency                                                │
│  [USD ▼]                                                 │
│                                                          │
│  Notes (Optional)                                        │
│  [________________________________]                      │
│  [________________________________]                      │
│                                                          │
│                            [Cancel]  [Create Budget]     │
└─────────────────────────────────────────────────────────┘
```

### Budget Edit/View Page: `/bookkeeping/[id]`

Multi-tab interface with categories:

**Tabs:**
1. **Overview** - Summary and key metrics
2. **Revenue** - All revenue streams
3. **Expenses** - All expense categories
4. **Payouts** - Band member & contractor payments
5. **Merchandise** - Merch-specific tracking
6. **Logistics** - Travel & accommodation

**Overview Tab:**
```
┌─────────────────────────────────────────────────────────┐
│  Spring Tour - Brooklyn                   [Edit] [Delete]│
│  Brooklyn Bowl, Brooklyn, NY - March 15, 2024            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Summary Cards:                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Revenue  │ │ Expenses │ │Net Profit│ │ Margin   │  │
│  │ $3,500   │ │ $2,100   │ │ $1,400   │ │   40%    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  Revenue Breakdown:                                      │
│  ├─ Ticket Sales: $2,500                                │
│  ├─ Merchandise: $1,000                                 │
│  └─ Other: $0                                           │
│                                                          │
│  Expense Breakdown:                                      │
│  ├─ Payouts: $900                                       │
│  ├─ Travel: $600                                        │
│  ├─ Accommodation: $400                                 │
│  └─ Other: $200                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Revenue Tab:**
Form with all revenue fields:
- Ticket Sales
- Merchandise (Card, Cash, Per Person)
- Total Sales (auto-calculated)
- Previous Sales (for comparison)
- Order Count
- Average Order Value (auto-calculated)

**Expenses Tab:**
Form with expense categories:
- Cash Flow
- Fees (Cash, Balance, Surplus)
- Extra Expenses
- Van/Transportation
- Gas
- Accommodation
- Flights
- General Payouts
- Merchandise Costs

**Payouts Tab:**
Dynamic list of band member/contractor payouts:
```
┌─────────────────────────────────────────────────────────┐
│  Band Member Payouts                    [+ Add Payout]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Dave                              $450   (10%)  [×] │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ Johnny                            $450   (10%)  [×] │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ Agent (Nate)                      $350   (10%)  [×] │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Total Payouts: $1,250                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Backend API Requirements

### Database Schema

```sql
-- budgets table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  budget_name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,

  -- Revenue
  ticket_sales DECIMAL(10,2),
  merch_sales_per_person DECIMAL(10,2),
  merch_card_sales DECIMAL(10,2),
  merch_cash_sales DECIMAL(10,2),
  total_sales DECIMAL(10,2),
  previous_sales DECIMAL(10,2),

  -- Logistics
  city VARCHAR(255),
  distance DECIMAL(10,2),

  -- Expenses
  cash_flow DECIMAL(10,2),
  fees_cash DECIMAL(10,2),
  extra_expenses DECIMAL(10,2),
  agent_commission_percent DECIMAL(5,2) DEFAULT 10.00,
  agent_commission DECIMAL(10,2),
  van_costs DECIMAL(10,2),
  driver_fees DECIMAL(10,2),
  van_rental DECIMAL(10,2),
  gas_costs DECIMAL(10,2),
  accommodation_costs DECIMAL(10,2),
  flight_costs DECIMAL(10,2),
  general_payouts DECIMAL(10,2),
  merch_person_fees DECIMAL(10,2),
  merch_cost_of_goods DECIMAL(10,2),

  -- Calculated fields
  fee_balance DECIMAL(10,2),
  fee_surplus DECIMAL(10,2),
  total_expenses DECIMAL(10,2),
  merch_daily_surplus DECIMAL(10,2),
  order_count INTEGER,
  avg_card_order_value DECIMAL(10,2),
  net_profit DECIMAL(10,2),
  variation DECIMAL(10,2)
);

-- band_member_payouts table
CREATE TABLE band_member_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  member_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  member_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_budgets_show_id ON budgets(show_id);
CREATE INDEX idx_budgets_tour_id ON budgets(tour_id);
CREATE INDEX idx_budgets_entity_id ON budgets(entity_id);
CREATE INDEX idx_band_member_payouts_budget_id ON band_member_payouts(budget_id);
```

### API Endpoints

**GET /api/budgets**
- Query params: `?showId=xxx&tourId=xxx&entityId=xxx`
- Returns: Array of budgets with calculated summaries

**POST /api/budgets**
- Body: CreateBudgetInput
- Returns: Created budget

**GET /api/budgets/:id**
- Returns: Full budget with all fields and payouts

**PUT /api/budgets/:id**
- Body: UpdateBudgetInput
- Returns: Updated budget

**DELETE /api/budgets/:id**
- Returns: 204 No Content

**GET /api/budgets/:id/summary**
- Returns: BudgetSummary with calculated totals

**POST /api/budgets/:id/payouts**
- Body: BandMemberPayout
- Returns: Created payout

**DELETE /api/budgets/:budgetId/payouts/:payoutId**
- Returns: 204 No Content

## Implementation Phases

### Phase 1: Data Model & Backend (Week 1)
- [ ] Create TypeScript types (`src/types/budget.ts`)
- [ ] Create database migration for `budgets` and `band_member_payouts` tables
- [ ] Implement backend API endpoints
- [ ] Add budget calculation logic (auto-calculate totals, averages, etc.)
- [ ] Test API with Postman/curl

### Phase 2: Basic UI (Week 2)
- [ ] Create budget list page (`/bookkeeping`)
- [ ] Implement budget table with filtering
- [ ] Create "New Budget" modal with show search
- [ ] Implement budget creation flow
- [ ] Add basic budget detail page

### Phase 3: Full Budget Form (Week 3)
- [ ] Create tabbed budget detail interface
- [ ] Implement Overview tab with summary cards
- [ ] Build Revenue tab with form fields
- [ ] Build Expenses tab with form fields
- [ ] Add auto-calculation for derived fields

### Phase 4: Payouts & Advanced Features (Week 4)
- [ ] Implement Payouts tab with dynamic payout list
- [ ] Add Merchandise tracking tab
- [ ] Add Logistics tab
- [ ] Implement CSV export functionality
- [ ] Add budget duplication feature
- [ ] Implement budget templates

### Phase 5: Analytics & Reporting (Week 5)
- [ ] Add tour-level budget aggregation
- [ ] Create profit/loss charts
- [ ] Add expense breakdown visualizations
- [ ] Implement budget vs. actual comparisons
- [ ] Add financial reports (PDF export)

## Technical Considerations

### Auto-Calculations
The following fields should be auto-calculated:
- `totalSales = ticketSales + merchCardSales + merchCashSales`
- `totalExpenses = sum of all expense fields`
- `netProfit = totalSales - totalExpenses`
- `avgCardOrderValue = merchCardSales / orderCount`
- `merchDailySurplus = merchSales - merchCostOfGoods - merchPersonFees`
- `agentCommission = totalSales * (agentCommissionPercent / 100)`

### Currency Handling
- Store all amounts in base currency units (cents/pennies)
- Use ISO currency codes (USD, EUR, GBP, etc.)
- Inherit currency from show if not specified
- Format display based on user locale

### Validation Rules
- Budget must be linked to a show
- Show can have multiple budgets (e.g., projected vs. actual)
- All financial fields are optional (progressive data entry)
- Percentages must be between 0-100
- Amounts cannot be negative (use separate fields for debits/credits)

### Search Implementation
Show search should support:
- Venue name (fuzzy match)
- City (fuzzy match)
- Date range
- Tour name
- Recent shows (default view)

## Next Steps

1. **Immediate**: Create data model types and interfaces
2. **Short-term**: Set up database tables and API endpoints
3. **Medium-term**: Build core UI for budget creation and editing
4. **Long-term**: Add advanced analytics and reporting features

## Questions to Resolve

1. Should budgets support multiple currencies per budget (for international tours)?
2. Do we need budget approval workflows (draft → submitted → approved)?
3. Should we support budget templates for recurring tour structures?
4. Do we need role-based permissions (e.g., only tour manager can create budgets)?
5. Should budgets be versioned (to track changes over time)?
6. Do we need integration with accounting software (QuickBooks, Xero)?

## Files to Create/Modify

### New Files
- `src/types/budget.ts` - Type definitions
- `src/app/bookkeeping/page.tsx` - List page (update existing)
- `src/app/bookkeeping/[id]/page.tsx` - Detail page
- `src/components/bookkeeping/BudgetTable.tsx` - Table component
- `src/components/bookkeeping/BudgetModal.tsx` - Create modal
- `src/components/bookkeeping/BudgetForm.tsx` - Edit form
- `src/components/bookkeeping/ShowSearchModal.tsx` - Show search
- `src/components/bookkeeping/PayoutsList.tsx` - Payouts component
- `src/hooks/useBudgets.ts` - Data fetching hook
- `src/hooks/useBudget.ts` - Single budget hook

### Modified Files
- `src/app/api/budgets/route.ts` - API routes
- `backend/migrations/XXX_create_budgets.sql` - Database migration
- `backend/routes/budgets.js` - Backend routes

This plan provides a complete roadmap for implementing a professional tour bookkeeping system!
