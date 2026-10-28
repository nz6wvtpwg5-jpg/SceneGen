# CSV Import Tool - Complete Implementation Plan

## Overview
Build a comprehensive CSV import tool that allows users to import tour shows and budgets from a CSV file, with intelligent field mapping and validation.

## CSV File Structure Analysis

### Source File: `FOR SCENEGEN.csv`
- **Total Rows**: ~50 (includes header + ~48 show rows)
- **Currency**: USD (with $ formatting)
- **Date Format**: DD/MM/YYYY (e.g., 30/03/2026)

### Column Mapping to SceneGen Database

#### Show Fields (goes to `shows` table)
| CSV Column | Database Field | Notes |
|------------|---------------|-------|
| Date | `date` | Parse DD/MM/YYYY to YYYY-MM-DD |
| City | `city` | Extract city name (may include state) |
| - | `venue_name` | Not in CSV - leave blank or prompt |
| - | `state` | Extract from City if present (e.g., "KY" from "Lexington KY") |
| - | `country` | Default to "USA" |
| Ticket sales | `fee` (as agreed fee) | Parse currency string to decimal |

#### Budget Fields (goes to `budgets` table)
| CSV Column | Database Field | Type | Notes |
|------------|---------------|------|-------|
| Date + City | `budget_name` | - | Combine as "City - Date" |
| - | `currency` | - | Default to "USD" |
| Ticket sales | `total_sales` | Revenue | Parse currency |
| Distance | `distance` | Info | Numeric value |
| Cash flow | `cash_flow` | Info | Cumulative cash tracking |
| Previous sales | `previous_sales` | Info | Comparative data |

#### Budget Line Items (goes to `budget_line_items` table)
| CSV Column | Item Name | Type | Category | Notes |
|------------|-----------|------|----------|-------|
| Fees Cash | Fees Cash | revenue | ticket_sales | Actual fees received |
| To Nate 10% | Agent Commission | expense | agent_commission | Parse percentage |
| Van | Van Costs | expense | van_costs | Daily van expense |
| Driver | Driver Fee | expense | general_payouts | Driver payment |
| Van Rental | Van Rental | expense | van_rental | Vehicle rental |
| Gas | Gas | expense | gas_costs | Fuel costs |
| Accom | Accommodation | expense | accommodation_costs | Hotel/lodging |
| To Dave | Payment to Dave | expense | general_payouts | Band member payout |
| To Johnny | Payment to Johnny | expense | general_payouts | Band member payout |
| Flight | Flight Costs | expense | flight_costs | Airfare |
| Payouts | General Payouts | expense | general_payouts | Other payments |
| Merch person | Merch Person Fee | expense | general_payouts | Merch handler |
| Merch costs | Merch Cost of Goods | expense | merch_cost_of_goods | COGS |
| Merch PPL/Card | Merch Card Sales | revenue | merch_card_sales | Card merch revenue |
| Merch Cash | Merch Cash Sales | revenue | merch_cash_sales | Cash merch revenue |
| XTRA | Extra Expenses | expense | extra_expenses | Misc expenses |

#### Calculated/Derived Fields
- **Total Expenses**: Sum all expense line items
- **Total Revenue**: Sum all revenue line items (Fees + Merch)
- **Profit**: Total Revenue - Total Expenses

---

## UI/UX Design

### Import Flow (Multi-Step Process)

#### Step 1: Upload & Tour Selection
```
┌─────────────────────────────────────────────────┐
│  Import Shows & Budgets from CSV               │
├─────────────────────────────────────────────────┤
│                                                 │
│  📂 Drop CSV file here or click to browse      │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Select Tour (Optional)                    │ │
│  │ ○ Create New Tour                         │ │
│  │ ○ Add to Existing Tour: [Dropdown ▼]      │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Cancel]                    [Next: Preview →] │
└─────────────────────────────────────────────────┘
```

#### Step 2: Column Mapping Preview
```
┌─────────────────────────────────────────────────┐
│  Map CSV Columns                        [2/4]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Preview: Detected 48 shows from CSV           │
│                                                 │
│  ✓ Auto-mapped 15 columns                      │
│  ⚠ 3 columns need review                        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ CSV Column    → SceneGen Field          │   │
│  ├─────────────────────────────────────────┤   │
│  │ Date          → Show Date        ✓      │   │
│  │ City          → City             ✓      │   │
│  │ Ticket sales  → Agreed Fee       ✓      │   │
│  │ To Nate 10%   → Agent Comm.      ✓      │   │
│  │ Van           → Van Costs        ✓      │   │
│  │ ...                                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [← Back]              [Next: Validation →]    │
└─────────────────────────────────────────────────┘
```

#### Step 3: Data Validation
```
┌─────────────────────────────────────────────────┐
│  Validate Data                          [3/4]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ✓ 48 valid shows                              │
│  ⚠ 2 warnings                                   │
│  ✗ 1 error                                      │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Row 6: "off" - Missing city name        │   │
│  │ ○ Skip this row                         │   │
│  │ ○ Set city to: [________]               │   │
│  ├─────────────────────────────────────────┤   │
│  │ Row 10: San Fran CA - Missing Fee Bal.  │   │
│  │ ⚠ Warning: Will default to $0           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [← Back]                   [Next: Import →]   │
└─────────────────────────────────────────────────┘
```

#### Step 4: Import Summary
```
┌─────────────────────────────────────────────────┐
│  Import Complete!                       [4/4]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ✓ Successfully imported:                      │
│    • 47 Shows                                  │
│    • 47 Budgets                                │
│    • 658 Budget Line Items                     │
│                                                 │
│  Tour: "USA Spring 2026"                       │
│  Date Range: Mar 30 - May 20, 2026             │
│  Total Revenue: $124,567.00                    │
│  Total Expenses: $73,421.00                    │
│  Profit: $51,146.00                            │
│                                                 │
│  [View Tour Details]           [Import More]   │
└─────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Component Structure
```
src/app/import/
├── page.tsx                    # Main import page
└── components/
    ├── ImportUpload.tsx        # Step 1: File upload
    ├── ImportMapping.tsx       # Step 2: Column mapping
    ├── ImportValidation.tsx    # Step 3: Data validation
    ├── ImportSummary.tsx       # Step 4: Results
    └── ImportProgress.tsx      # Progress indicator

src/lib/
├── csv-parser.ts              # CSV parsing utilities
├── csv-mapper.ts              # Field mapping logic
└── csv-validator.ts           # Validation rules

src/types/
└── import.ts                  # Import types
```

### API Endpoints

#### POST /api/import/parse
- **Input**: CSV file (FormData)
- **Output**: Parsed CSV data + column headers
- **Purpose**: Parse CSV and detect structure

#### POST /api/import/validate
- **Input**: Parsed data + field mappings
- **Output**: Validation results (errors/warnings)
- **Purpose**: Validate data before import

#### POST /api/import/execute
- **Input**: Validated data + mappings + tour info
- **Output**: Import summary (created IDs, counts)
- **Purpose**: Create shows, budgets, and line items in database

---

## Data Processing Logic

### 1. CSV Parsing
```typescript
interface ParsedCSVRow {
  [columnName: string]: string | number | null;
}

interface ParsedCSV {
  headers: string[];
  rows: ParsedCSVRow[];
  rowCount: number;
}
```

### 2. Field Mapping
```typescript
interface FieldMapping {
  csvColumn: string;
  scenegenField: string;
  type: 'show' | 'budget' | 'line_item';
  dataType: 'string' | 'number' | 'date' | 'currency';
  transform?: (value: any) => any;
}

const defaultMappings: FieldMapping[] = [
  {
    csvColumn: 'Date',
    scenegenField: 'date',
    type: 'show',
    dataType: 'date',
    transform: (val) => parseDDMMYYYY(val)
  },
  {
    csvColumn: 'City',
    scenegenField: 'city',
    type: 'show',
    dataType: 'string',
    transform: (val) => extractCity(val)
  },
  {
    csvColumn: 'Ticket sales',
    scenegenField: 'fee',
    type: 'show',
    dataType: 'currency',
    transform: (val) => parseCurrency(val)
  },
  // ... more mappings
];
```

### 3. Data Transformation

#### Date Parsing
```typescript
function parseDDMMYYYY(dateStr: string): string {
  // "30/03/2026" → "2026-03-30"
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
```

#### Currency Parsing
```typescript
function parseCurrency(value: string): number {
  // "$1,234.56" → 1234.56
  // Remove $, commas, spaces
  return parseFloat(value.replace(/[$,\s]/g, '')) || 0;
}
```

#### City/State Extraction
```typescript
function extractCityState(cityStr: string): { city: string; state?: string } {
  // "Lexington KY" → { city: "Lexington", state: "KY" }
  const parts = cityStr.trim().split(/\s+/);
  if (parts.length > 1 && parts[parts.length - 1].length === 2) {
    return {
      city: parts.slice(0, -1).join(' '),
      state: parts[parts.length - 1]
    };
  }
  return { city: cityStr };
}
```

### 4. Validation Rules

```typescript
interface ValidationRule {
  field: string;
  level: 'error' | 'warning';
  message: string;
  validator: (value: any) => boolean;
}

const validationRules: ValidationRule[] = [
  {
    field: 'date',
    level: 'error',
    message: 'Date is required',
    validator: (val) => !!val
  },
  {
    field: 'city',
    level: 'error',
    message: 'City is required',
    validator: (val) => !!val && val !== 'off'
  },
  {
    field: 'fee',
    level: 'warning',
    message: 'Fee is $0 or missing',
    validator: (val) => val > 0
  }
];
```

### 5. Database Insert Strategy

**Transaction-based bulk insert:**
```sql
BEGIN;

-- 1. Create or get tour
INSERT INTO tours (...) VALUES (...) RETURNING id;

-- 2. Create shows (bulk insert)
INSERT INTO shows (entity_id, date, city, state, country, fee, ...)
VALUES
  ($1, $2, $3, $4, $5, $6, ...),
  ($7, $8, $9, $10, $11, $12, ...),
  ...
RETURNING id;

-- 3. Create budgets (bulk insert with show_id mapping)
INSERT INTO budgets (entity_id, show_id, tour_id, budget_name, currency, ...)
VALUES
  ($1, $show_id_1, $tour_id, $2, $3, ...),
  ($4, $show_id_2, $tour_id, $5, $6, ...),
  ...
RETURNING id;

-- 4. Create budget line items (bulk insert)
INSERT INTO budget_line_items (budget_id, item_type, category, name, amount, ...)
VALUES
  ($budget_id_1, 'expense', 'van_costs', 'Van', $1, ...),
  ($budget_id_1, 'expense', 'gas_costs', 'Gas', $2, ...),
  ($budget_id_2, 'expense', 'van_costs', 'Van', $3, ...),
  ...;

COMMIT;
```

---

## Features & Enhancements

### Core Features
- ✅ CSV file upload (drag & drop or click)
- ✅ Automatic column mapping with smart detection
- ✅ Manual column mapping override
- ✅ Data validation with error/warning system
- ✅ Tour creation or selection
- ✅ Bulk show creation
- ✅ Bulk budget creation with line items
- ✅ Import progress tracking
- ✅ Import summary with statistics

### Advanced Features
- 🔄 Duplicate detection (same date + city)
- 💾 Save mapping templates for reuse
- 📊 Preview before import (table view)
- 🔍 Search/filter during validation
- ↩️ Undo import (rollback transaction)
- 📝 Import history/audit log
- 🔔 Email notification on completion
- 📤 Export validation errors as CSV

### Smart Defaults
- Auto-detect currency from $ symbol → USD
- Auto-detect country from state codes → USA
- Auto-generate venue name from city if missing
- Skip rows where City = "off" (travel days)
- Default venue capacity, door time, etc. to null

---

## File Structure

```
/import
  ├── page.tsx                   # Main import wizard
  ├── components/
  │   ├── ImportWizard.tsx       # Wizard container
  │   ├── Step1Upload.tsx        # File upload
  │   ├── Step2Mapping.tsx       # Column mapping
  │   ├── Step3Validation.tsx    # Data validation
  │   ├── Step4Summary.tsx       # Import results
  │   ├── CSVPreviewTable.tsx    # Data preview table
  │   ├── MappingRow.tsx         # Single mapping row
  │   ├── ValidationIssue.tsx    # Validation error/warning
  │   └── ProgressBar.tsx        # Import progress
  └── hooks/
      ├── useCSVParser.ts        # CSV parsing hook
      ├── useImport.ts           # Import state management
      └── useValidation.ts       # Validation logic

/api/import/
  ├── parse/route.ts             # Parse CSV endpoint
  ├── validate/route.ts          # Validate data endpoint
  └── execute/route.ts           # Execute import endpoint

/lib/
  ├── csv/
  │   ├── parser.ts              # CSV parsing utilities
  │   ├── mapper.ts              # Field mapping logic
  │   ├── validator.ts           # Validation rules
  │   └── transformer.ts         # Data transformation
  └── import/
      ├── shows.ts               # Show creation logic
      ├── budgets.ts             # Budget creation logic
      └── transaction.ts         # DB transaction handler

/types/
  └── import.ts                  # Import-related types
```

---

## Implementation Timeline

### Phase 1: Core Infrastructure (2-3 hours)
- [ ] Create CSV parser utilities
- [ ] Create type definitions
- [ ] Build file upload component
- [ ] Set up wizard navigation

### Phase 2: Mapping & Validation (3-4 hours)
- [ ] Build mapping interface
- [ ] Implement validation rules
- [ ] Create preview table
- [ ] Add error handling

### Phase 3: Database Integration (2-3 hours)
- [ ] Create API endpoints
- [ ] Implement bulk insert logic
- [ ] Add transaction handling
- [ ] Test with sample data

### Phase 4: UI Polish (1-2 hours)
- [ ] Add progress indicators
- [ ] Improve error messages
- [ ] Add success animations
- [ ] Responsive design

### Total Estimated Time: 8-12 hours

---

## Testing Strategy

### Test Cases
1. **Valid CSV**: 48 rows, all fields populated → Success
2. **Missing Required Fields**: Date or City missing → Error
3. **Invalid Date Format**: Non-date in Date column → Error
4. **Invalid Currency**: Non-numeric in Ticket sales → Error
5. **Duplicate Shows**: Same date + city → Warning
6. **Off Days**: City = "off" → Skip row
7. **Empty Cells**: Missing optional fields → Default to null
8. **Large File**: 500+ rows → Performance test

### Sample Test Data
```csv
Date,City,Ticket sales,Van,Gas,Accom
30/03/2026,Lexington KY,1500,125,70,150
31/03/2026,Nashville TN,1500,125,75,150
```

---

## Success Metrics
- ✅ Import 48 shows in < 5 seconds
- ✅ < 1% error rate on valid CSVs
- ✅ 100% transaction rollback on errors
- ✅ Clear error messages for 95%+ of validation issues

---

## Next Steps

1. **Review & Approve**: Review this plan and approve
2. **Create Components**: Build the UI components
3. **Implement Parser**: Create CSV parsing logic
4. **Build API**: Create backend endpoints
5. **Test**: Test with FOR SCENEGEN.csv
6. **Deploy**: Push to production

---

## Example Usage

**User Flow:**
1. User goes to `/import`
2. Uploads `FOR SCENEGEN.csv`
3. System auto-maps columns
4. User reviews mapping
5. System validates data (finds 47 valid shows, 1 "off" day)
6. User clicks "Import"
7. System creates:
   - 1 Tour: "USA Spring 2026"
   - 47 Shows
   - 47 Budgets
   - ~658 Line Items (14 items × 47 shows)
8. User sees summary and navigates to tour details

**Result:**
- All tour data imported in one click
- Financial data properly categorized
- Ready to view budgets, edit shows, and track tour progress
