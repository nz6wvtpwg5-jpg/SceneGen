# CSV Import - Column Classification Feature

## Overview
Enhanced the CSV import tool to allow users to classify each budget line item column as:
- **Income** (revenue)
- **Outgoing** (expense)
- **Ignore** (skip during import)

## Changes Made

### 1. Type System (`/src/types/import.ts`)
- Added `ColumnClassification` type: `'income' | 'outgoing' | 'ignore'`
- Extended `FieldMapping` interface with optional `classification` field
- This allows each column mapping to store the user's classification choice

### 2. Default Mappings (`/src/lib/csv/mapper.ts`)
- Added default classifications to all line item mappings:
  - Revenue items: `classification: 'income'`
  - Expense items: `classification: 'outgoing'`
- Users can override these defaults in the UI

### 3. Mapping UI (`/src/app/import/components/Step2Mapping.tsx`)
Complete redesign of the mapping step with:

#### Visual Enhancements
- Summary cards showing counts of income/outgoing/ignored columns
- Color-coded badges and icons:
  - 🟢 Green: Income items
  - 🔴 Red: Outgoing items
  - ⚪ Gray: Ignored items
- Info banner explaining the classification feature

#### Interactive Classification
- Separated line items into their own section
- Each line item has three buttons:
  - "Income" (green)
  - "Outgoing" (red)
  - "Ignore" (gray)
- Active classification is highlighted
- Real-time state updates when user clicks buttons

#### Better Organization
- **Required Fields**: Auto-mapped, non-editable system fields (date, city, etc.)
- **Budget Line Items**: User can classify each as income/outgoing/ignore
- **Optional Fields**: Other mapped fields (distance, cash flow, etc.)

### 4. Validation & Transform (`/src/lib/csv/validator.ts`)
Updated `transformToImportData()` function:
- Skip columns with `classification: 'ignore'`
- Determine line item type from classification:
  - `'income'` → `type: 'revenue'`
  - `'outgoing'` → `type: 'expense'`
  - Fallback to category-based logic if no classification
- Only non-ignored columns are processed

## User Flow

1. **Upload CSV**: User uploads their budget CSV file
2. **Auto-Mapping**: System auto-maps all columns with default classifications
3. **Review & Classify**:
   - User sees all line items in the "Budget Line Items" section
   - Default classifications are pre-selected based on column names
   - User can click buttons to change classification for any column
   - Summary cards update in real-time
4. **Validation**: Only non-ignored columns are validated
5. **Import**: Only non-ignored columns are imported to the database

## Example Use Cases

### Use Case 1: Ignore Unused Columns
CSV has columns like "Notes" or "Internal ID" that shouldn't be imported:
- User clicks "Ignore" for these columns
- They won't be validated or imported

### Use Case 2: Reclassify Columns
CSV has "Refunds" column auto-classified as income:
- User clicks "Outgoing" to reclassify it as an expense
- Import will create expense line items instead of revenue

### Use Case 3: Flexible Data
Different tours might treat the same column differently:
- Tour A: "Per Diem" is outgoing (expense)
- Tour B: "Per Diem" is income (reimbursement)
- Users can classify appropriately per import

## Technical Details

### State Management
- Mappings state is managed in `Step2Mapping` component
- `handleClassificationChange()` updates the classification for a specific mapping
- Updated mappings are passed to validation and import steps

### Filtering Logic
```typescript
// Skip ignored columns during transform
lineItemMappings.forEach(mapping => {
  if (mapping.classification === 'ignore') return;
  // ... process column
});
```

### Type Determination
```typescript
// Determine type from classification
let itemType: 'revenue' | 'expense';
if (mapping.classification === 'income') {
  itemType = 'revenue';
} else if (mapping.classification === 'outgoing') {
  itemType = 'expense';
}
```

## UI Components

### Summary Cards
```tsx
<div className="grid grid-cols-4 gap-4">
  <div>✓ {mappings.length} columns Auto-mapped</div>
  <div>📈 {incomeCount} income Revenue items</div>
  <div>📉 {outgoingCount} outgoing Expense items</div>
  <div>👁️‍🗨️ {ignoredCount} ignored Not imported</div>
</div>
```

### Classification Buttons
```tsx
<Button
  variant={mapping.classification === 'income' ? 'default' : 'outline'}
  className={mapping.classification === 'income' ? 'bg-green-600' : ''}
  onClick={() => handleClassificationChange(index, 'income')}
>
  <TrendingUp /> Income
</Button>
```

## Benefits

1. **Flexibility**: Handles different CSV formats and data interpretations
2. **Control**: Users decide what gets imported and how
3. **Efficiency**: Skip irrelevant columns without manual CSV editing
4. **Accuracy**: Prevent misclassification of income vs. expenses
5. **Transparency**: Visual feedback shows exactly what will be imported

## Future Enhancements

Potential improvements:
- Save classification presets for reuse
- Bulk classification actions (e.g., "Mark all as income")
- Column pattern matching for auto-classification
- Export classification templates
- Smart suggestions based on column names
- Undo/redo for classification changes

## Testing

To test the feature:
1. Go to `/import` page
2. Upload a CSV with budget data
3. In the mapping step:
   - Verify income/outgoing counts in summary cards
   - Click different classification buttons
   - See active state and badge updates
   - Try marking some columns as "Ignore"
4. Proceed to validation and verify ignored columns aren't validated
5. Complete import and verify only non-ignored columns are imported

## Files Modified

- `/src/types/import.ts` - Added `ColumnClassification` type
- `/src/lib/csv/mapper.ts` - Added default classifications
- `/src/app/import/components/Step2Mapping.tsx` - Complete UI redesign
- `/src/lib/csv/validator.ts` - Filter ignored columns, use classification for type
