# CSV Import - Column Classification Update

## Summary
Successfully enhanced the CSV import tool with user-driven column classification. Users can now classify each budget line item as **Income**, **Outgoing**, or **Ignore**.

## What Changed

### 1. **Enhanced Type System**
- Added `ColumnClassification` type: `'income' | 'outgoing' | 'ignore'`
- Extended `FieldMapping` with optional `classification` field
- Allows storing user's classification choice per column

### 2. **Smart Default Classifications**
- Revenue columns auto-classified as `'income'` (Ticket sales, Merch, etc.)
- Expense columns auto-classified as `'outgoing'` (Van, Gas, Agent commission, etc.)
- Users can override defaults in the UI

### 3. **Interactive Mapping UI**
Completely redesigned Step 2 (Mapping) with:
- **Summary Cards**: Shows counts of income/outgoing/ignored columns at a glance
- **Color-Coded System**:
  - 🟢 Green: Income items
  - 🔴 Red: Outgoing items
  - ⚪ Gray: Ignored items
- **Three-Button Interface**: Each line item has Income/Outgoing/Ignore buttons
- **Real-time Updates**: Summary cards update as you click
- **Info Banner**: Explains the classification feature

### 4. **Organized Sections**
- **Required Fields**: System fields (date, city) - auto-mapped
- **Budget Line Items**: Interactive classification section
- **Optional Fields**: Other mappings (distance, cash flow)

### 5. **Import Logic**
- Ignored columns are skipped during validation
- Ignored columns are skipped during import
- Line item type determined by classification:
  - `'income'` → creates revenue line items
  - `'outgoing'` → creates expense line items
  - `'ignore'` → not imported

## User Benefits

✅ **Flexibility**: Handle different CSV formats and interpretations
✅ **Control**: Decide what gets imported and how
✅ **Efficiency**: Skip irrelevant columns without editing CSV
✅ **Accuracy**: Prevent misclassification of income vs. expenses
✅ **Transparency**: Visual feedback shows exactly what will import

## Example Usage

### Scenario 1: Ignore Unused Columns
Your CSV has "Notes" and "Internal ID" columns you don't need:
1. Click "Ignore" for these columns
2. They won't be validated or imported
3. Summary shows them in the "ignored" count

### Scenario 2: Reclassify a Column
"Refunds" was auto-classified as income but should be outgoing:
1. Find "Refunds" in the Budget Line Items section
2. Click "Outgoing" button
3. Import will create expense line items instead

### Scenario 3: Different Tours, Different Treatment
Same column, different meaning:
- Tour A: "Per Diem" → Outgoing (paying band members)
- Tour B: "Per Diem" → Income (reimbursement from venue)
- Classify appropriately per tour/import

## Technical Implementation

### Files Modified
- `/src/types/import.ts` - Added ColumnClassification type
- `/src/lib/csv/mapper.ts` - Added default classifications to mappings
- `/src/app/import/components/Step2Mapping.tsx` - Redesigned UI with classification buttons
- `/src/lib/csv/validator.ts` - Filter ignored columns, use classification for type

### Key Code Changes

**Type Definition:**
```typescript
export type ColumnClassification = 'income' | 'outgoing' | 'ignore';

export interface FieldMapping {
  // ... existing fields
  classification?: ColumnClassification;
}
```

**Classification Handler:**
```typescript
const handleClassificationChange = (index: number, classification: ColumnClassification) => {
  setMappings(prev => {
    const updated = [...prev];
    updated[index] = { ...updated[index], classification };
    return updated;
  });
};
```

**Import Logic:**
```typescript
lineItemMappings.forEach(mapping => {
  if (mapping.classification === 'ignore') return; // Skip ignored

  // Determine type from classification
  let itemType: 'revenue' | 'expense';
  if (mapping.classification === 'income') {
    itemType = 'revenue';
  } else if (mapping.classification === 'outgoing') {
    itemType = 'expense';
  }
  // ... create line item
});
```

## Testing Checklist

- [ ] Upload CSV file
- [ ] Verify auto-mapped classifications (income items green, outgoing red)
- [ ] Click Income/Outgoing/Ignore buttons on different columns
- [ ] Verify active state highlights correctly
- [ ] Check summary cards update in real-time
- [ ] Mark a column as "Ignore"
- [ ] Proceed to validation
- [ ] Verify ignored columns aren't validated
- [ ] Complete import
- [ ] Verify ignored columns weren't imported
- [ ] Verify income/outgoing classifications created correct line item types

## Next Steps

Potential enhancements:
- Save classification presets for reuse across imports
- Bulk actions (e.g., "Mark all as income")
- Pattern matching for smart auto-classification
- Export/import classification templates
- Undo/redo for classification changes

## Documentation

See `CSV_IMPORT_CLASSIFICATION.md` for detailed technical documentation.
