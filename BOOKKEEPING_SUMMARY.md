# Bookkeeping Feature - Implementation Summary

## ✅ Completed

### 1. Planning & Documentation
- ✅ **BOOKKEEPING_IMPLEMENTATION_PLAN.md** - Comprehensive implementation plan with:
  - CSV template analysis (30 columns mapped)
  - Complete data model design
  - UI/UX wireframes and mockups
  - Database schema (SQL DDL)
  - API endpoint specifications
  - 5-phase implementation roadmap
  - Technical considerations and validation rules

### 2. Data Model
- ✅ **src/types/budget.ts** - Extended with:
  - Enhanced `Budget` interface with 40+ fields
  - `BandMemberPayout` interface for tracking payments
  - `CreateBudgetInput` and `UpdateBudgetInput` interfaces
  - `BudgetSummary` interface for analytics
  - `BudgetFilters` interface for search/filtering
  - 8 utility functions for auto-calculations:
    - `calculateTotalRevenue()`
    - `calculateTotalExpenses()`
    - `calculateBandMemberPayoutsTotal()`
    - `calculateNetProfit()`
    - `calculateProfitMargin()`
    - `calculateMerchProfit()`
    - `calculateAvgCardOrderValue()`
    - `calculateAgentCommission()`
    - `generateBudgetSummary()`

### 3. Navigation
- ✅ Bookkeeping tab already exists in sidebar (`src/app/config.tsx`)
- ✅ Placeholder page exists at `src/app/bookkeeping/page.tsx`

## 📋 Next Steps (Ready to Implement)

### Phase 1: Backend & Database (Estimated: 2-3 hours)

1. **Create Database Migration**
   ```sql
   -- File: backend/migrations/XXX_create_budgets_tables.sql
   -- Creates: budgets, band_member_payouts tables
   -- Adds indexes for performance
   ```

2. **Backend API Routes**
   ```javascript
   // Files to create:
   - backend/routes/budgets.js
   - backend/controllers/budgetsController.js
   ```

   Endpoints to implement:
   - `GET /api/budgets` - List all budgets (with filters)
   - `POST /api/budgets` - Create new budget
   - `GET /api/budgets/:id` - Get single budget
   - `PUT /api/budgets/:id` - Update budget
   - `DELETE /api/budgets/:id` - Delete budget
   - `GET /api/budgets/:id/summary` - Get calculated summary
   - `POST /api/budgets/:id/payouts` - Add band member payout
   - `DELETE /api/budgets/:budgetId/payouts/:payoutId` - Remove payout

3. **Frontend API Proxy**
   ```typescript
   // File: src/app/api/budgets/route.ts
   // Proxies requests to backend with authentication
   ```

### Phase 2: Basic UI (Estimated: 3-4 hours)

1. **Budget List Page**
   ```typescript
   // File: src/app/bookkeeping/page.tsx
   // Features:
   - Budget table with sorting/filtering
   - Search by show name, venue, city
   - Filter by tour
   - Quick stats cards (total revenue, expenses, profit)
   - "Create Budget" button
   ```

2. **Create Budget Modal**
   ```typescript
   // File: src/components/bookkeeping/CreateBudgetModal.tsx
   // Features:
   - Budget name input
   - Show search (by venue, city, date)
   - Tour selection (optional)
   - Currency selection
   - Notes field
   ```

3. **Show Search Component**
   ```typescript
   // File: src/components/bookkeeping/ShowSearchModal.tsx
   // Features:
   - Search input with debouncing
   - Results list with show details
   - Selection state
   ```

4. **Data Hooks**
   ```typescript
   // Files:
   - src/hooks/useBudgets.ts - List budgets with filters
   - src/hooks/useBudget.ts - Single budget with auto-refresh
   ```

### Phase 3: Budget Detail Page (Estimated: 4-5 hours)

1. **Multi-Tab Interface**
   ```typescript
   // File: src/app/bookkeeping/[id]/page.tsx
   // Tabs:
   - Overview (summary cards + charts)
   - Revenue (ticket sales, merch, etc.)
   - Expenses (travel, accommodation, fees, etc.)
   - Payouts (band members, contractors)
   - Merchandise (detailed merch tracking)
   - Logistics (distance, travel info)
   ```

2. **Budget Form Components**
   ```typescript
   // Files:
   - src/components/bookkeeping/OverviewTab.tsx
   - src/components/bookkeeping/RevenueTab.tsx
   - src/components/bookkeeping/ExpensesTab.tsx
   - src/components/bookkeeping/PayoutsTab.tsx
   - src/components/bookkeeping/MerchandiseTab.tsx
   - src/components/bookkeeping/LogisticsTab.tsx
   ```

3. **Auto-Calculate Fields**
   - Implement real-time calculation as user enters data
   - Show/hide calculated fields with visual indicators
   - Format currency based on selected currency code

### Phase 4: Advanced Features (Estimated: 3-4 hours)

1. **CSV Export**
   - Export budget to CSV matching original template format
   - Include all columns from original spreadsheet
   - Support batch export for tour-level budgets

2. **Budget Templates**
   - Save budget as template
   - Apply template to new shows
   - Pre-fill common expense categories

3. **Tour Aggregation**
   - Roll up budgets by tour
   - Show tour-level P&L
   - Compare show-by-show performance

4. **Analytics Dashboard**
   - Revenue/expense trends over time
   - Profit margin charts
   - Top expense categories
   - Merch performance metrics

## 🎨 UI Components Needed

### Existing Components to Use
- `Button` - Primary actions
- `Input` - Form fields
- `Select` - Dropdowns
- `Table` - Data tables
- `Modal` - Dialogs
- `Card` - Summary cards
- `Badge` - Status indicators
- `Tabs` - Tab navigation

### New Components to Create
1. **BudgetTable** - Budget list with sorting/filtering
2. **CreateBudgetModal** - Budget creation dialog
3. **BudgetForm** - Main budget editing form
4. **ShowSearchModal** - Show search and selection
5. **PayoutsList** - Dynamic payout entries
6. **BudgetSummaryCards** - Overview metrics
7. **CurrencyInput** - Currency-aware number input
8. **BudgetChart** - Revenue/expense visualizations

## 🗄️ Database Schema

### budgets Table
```sql
- id (UUID, PK)
- show_id (UUID, FK → shows.id)
- tour_id (UUID, FK → tours.id, nullable)
- entity_id (UUID, FK → entities.id)
- created_by (UUID, FK → users.id)
- budget_name (VARCHAR)
- currency (VARCHAR(3))
- notes (TEXT)
- [40+ financial fields...]
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### band_member_payouts Table
```sql
- id (UUID, PK)
- budget_id (UUID, FK → budgets.id)
- member_id (UUID, FK → contacts.id, nullable)
- member_name (VARCHAR)
- amount (DECIMAL)
- percentage (DECIMAL)
- notes (TEXT)
- created_at (TIMESTAMP)
```

## 🔐 Authorization Rules

- Users can only view/edit budgets for their own entity
- Budget creation requires active entity
- Show must belong to user's entity
- Deletion cascades (deleting show deletes budgets)

## 📊 CSV Template Field Mapping

| CSV Column | Database Field | Type | Auto-Calculated |
|------------|---------------|------|-----------------|
| Date | (from show.show_date) | Date | ✅ |
| City | city / show.venue_city | String | Partial |
| Distance | distance | Number | ❌ |
| Cash flow | cash_flow | Decimal | ❌ |
| Fees Cash | fees_cash | Decimal | ❌ |
| XTRA | extra_expenses | Decimal | ❌ |
| To Nate 10% | agent_commission | Decimal | ✅ |
| Van | van_costs | Decimal | ❌ |
| Driver | driver_fees | Decimal | ❌ |
| Van Rental | van_rental | Decimal | ❌ |
| Fee Balance | fee_balance | Decimal | ✅ |
| Gas | gas_costs | Decimal | ❌ |
| Accom | accommodation_costs | Decimal | ❌ |
| To Dave | (band_member_payouts) | Decimal | ❌ |
| To Johnny | (band_member_payouts) | Decimal | ❌ |
| Flight | flight_costs | Decimal | ❌ |
| Payouts | general_payouts | Decimal | ❌ |
| Fee surplus | fee_surplus | Decimal | ✅ |
| Merch person | merch_person_fees | Decimal | ❌ |
| Merch costs | merch_cost_of_goods | Decimal | ❌ |
| Merch PPL/Card | merch_card_sales | Decimal | ❌ |
| Merch Cash | merch_cash_sales | Decimal | ❌ |
| Total | total_expenses | Decimal | ✅ |
| Merch Daily Surplus | merch_daily_surplus | Decimal | ✅ |
| Ticket sales | ticket_sales | Decimal | ❌ |
| Merch sales per person | merch_sales_per_person | Decimal | ❌ |
| orders | order_count | Integer | ❌ |
| avg card order value | avg_card_order_value | Decimal | ✅ |
| Sales | total_sales | Decimal | ✅ |
| Previous sales | previous_sales | Decimal | ❌ |
| Variation | variation | Decimal | ✅ |

## 🚀 Quick Start Commands

### 1. Run Database Migration
```bash
cd backend
# Create migration file
npm run migrate:create create_budgets_tables
# Edit the migration file
# Run migration
npm run migrate:up
```

### 2. Test API Endpoints
```bash
# Create a budget
curl -X POST http://localhost:3001/api/budgets \
  -H "Content-Type: application/json" \
  -d '{
    "showId": "show-uuid-here",
    "budgetName": "Spring Tour - Brooklyn",
    "currency": "USD"
  }'

# List budgets
curl http://localhost:3001/api/budgets?entityId=entity-uuid-here
```

### 3. Start Building UI
```bash
# Create the budget detail page
touch src/app/bookkeeping/[id]/page.tsx

# Create components directory
mkdir -p src/components/bookkeeping

# Start development server
npm run dev
```

## 📝 Open Questions

1. **Multi-currency support**: Should a single budget support mixed currencies (for international tours)?
2. **Approval workflows**: Do budgets need approval states (draft → submitted → approved)?
3. **Version history**: Should we track budget revisions over time?
4. **Integrations**: Need QuickBooks/Xero integration for accounting?
5. **Permissions**: Should there be different roles (view-only, editor, admin)?
6. **Forecasting**: Should we support projected vs. actual budget tracking?

## 🎯 Success Criteria

✅ Phase 1 Complete When:
- Database tables created and tested
- All API endpoints working
- CRUD operations functional
- Authorization working

✅ Phase 2 Complete When:
- Can create budget from UI
- Can search and select show
- Budget list displays correctly
- Filtering works

✅ Phase 3 Complete When:
- Can edit all budget fields
- Auto-calculations work in real-time
- Can add/remove band member payouts
- Data persists correctly

✅ Phase 4 Complete When:
- Can export to CSV
- Tour-level aggregation working
- Charts and analytics display
- Templates functional

---

**Ready to start?** Let me know which phase you'd like to begin with, or I can start implementing Phase 1 (Backend & Database) right away!
