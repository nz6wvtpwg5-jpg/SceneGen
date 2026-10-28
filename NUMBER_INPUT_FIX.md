# Number Input Fields Fix - Summary

## Problem
Number input fields (Guarantee, Door Split %, Ticket Prices, Venue Capacity) were showing invalid values like "-0.1" or "NaN" when they should be blank/empty.

## Root Cause
The issue was in the `onChange` handlers for number inputs:
```tsx
// ❌ BEFORE: This caused issues
onChange={(e) => handleInputChange('guarantee', parseFloat(e.target.value))}
```

When the input field was empty:
- `e.target.value` = `""` (empty string)
- `parseFloat("")` = `NaN` (Not a Number)
- `NaN` gets stored in state and displayed as weird values like "-0.1"

## Solution
Updated all number input `onChange` handlers to properly handle empty values:

```tsx
// ✅ AFTER: Properly handles empty values
onChange={(e) => {
    const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
    handleInputChange('guarantee', value);
}}
```

Also changed from `||` to `??` (nullish coalescing) for the `value` prop:
```tsx
// ❌ BEFORE: Treats 0 as falsy
value={formData.guarantee || ''}

// ✅ AFTER: Only treats null/undefined as empty
value={formData.guarantee ?? ''}
```

## Fixed Fields

### 1. Guarantee ($)
- **Before**: Showed "-0.1" when empty
- **After**: Blank until user enters value
- **Placeholder**: "Enter guarantee amount"

### 2. Venue Capacity
- **Before**: Could show invalid values
- **After**: Blank until user enters value
- **Placeholder**: "Enter venue capacity"

### 3. Door Split %
- **Before**: Could show invalid values
- **After**: Blank until user enters value
- **Placeholder**: "Enter percentage (0-100)"

### 4. Advance Ticket Price ($)
- **Before**: Could show invalid values
- **After**: Blank until user enters value
- **Placeholder**: "Enter advance price"

### 5. Door Ticket Price ($)
- **Before**: Could show invalid values
- **After**: Blank until user enters value
- **Placeholder**: "Enter door price"

## Technical Details

### Nullish Coalescing (`??`) vs OR (`||`)

**OR operator (`||`)**:
- Treats `0`, `""`, `false`, `null`, `undefined` as falsy
- `0 || 'default'` returns `'default'` (wrong for number 0)

**Nullish coalescing (`??`)**:
- Only treats `null` and `undefined` as empty
- `0 ?? 'default'` returns `0` (correct!)

This is important for financial fields where `0` is a valid value.

### Empty Value Handling

```tsx
onChange={(e) => {
    // If input is empty, set to undefined (not NaN)
    const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
    handleInputChange('fieldName', value);
}}
```

**Why `undefined` instead of `NaN`?**
- `undefined` = "no value set"
- `NaN` = "invalid number" (causes display issues)
- Backend can handle `undefined` fields as optional
- Database stores `NULL` for `undefined` values

## Before vs After

### Before
```
┌─────────────────────────┐
│ Guarantee ($)           │
│ ┌─────────────────────┐ │
│ │ -0.1                │ │ ❌ Invalid value shown
│ └─────────────────────┘ │
└─────────────────────────┘
```

### After
```
┌─────────────────────────┐
│ Guarantee ($)           │
│ ┌─────────────────────┐ │
│ │ Enter guarantee... │ │ ✅ Blank with placeholder
│ └─────────────────────┘ │
└─────────────────────────┘
```

## Edge Cases Handled

### Case 1: Empty Input
```tsx
Input: ""
parseFloat(""): NaN ❌
Our fix: undefined ✅
Display: (blank)
```

### Case 2: Valid Number
```tsx
Input: "1500"
parseFloat("1500"): 1500 ✅
Our fix: 1500 ✅
Display: 1500
```

### Case 3: Zero
```tsx
Input: "0"
parseFloat("0"): 0 ✅
Our fix: 0 ✅
Display: 0
formData.guarantee ?? '': 0 (not '')
```

### Case 4: Decimal
```tsx
Input: "1500.50"
parseFloat("1500.50"): 1500.5 ✅
Our fix: 1500.5 ✅
Display: 1500.50
```

## Testing Steps

### Test 1: Empty Field
1. Open Create Show form
2. Don't enter anything in Guarantee field
3. **Expected**: Field is blank (no "-0.1")

### Test 2: Enter and Clear
1. Enter "1500" in Guarantee field
2. Clear the field (delete all text)
3. **Expected**: Field becomes blank (not NaN or -0.1)

### Test 3: Enter Zero
1. Enter "0" in Guarantee field
2. **Expected**: Shows "0" (not cleared to blank)

### Test 4: Enter Decimal
1. Enter "1500.50" in Guarantee field
2. **Expected**: Shows "1500.50" correctly

### Test 5: All Number Fields
1. Test same scenarios for:
   - Venue Capacity
   - Door Split %
   - Advance Ticket Price
   - Door Ticket Price
2. **Expected**: All behave consistently

## Benefits

✅ **Better UX**: Fields are blank until user enters data
✅ **No confusion**: No weird values like "-0.1" or "NaN"
✅ **Proper validation**: Zero is treated as valid value
✅ **Consistent behavior**: All number fields work the same way
✅ **Clear guidance**: Placeholder text shows what to enter
✅ **Clean data**: `undefined` instead of `NaN` in state/database

## Related Issues Prevented

### Issue: Zero can't be entered
- **Cause**: Using `||` treats `0` as falsy
- **Solution**: Using `??` preserves `0` as valid value

### Issue: Clearing field causes errors
- **Cause**: `parseFloat("")` returns `NaN`
- **Solution**: Explicitly check for empty string, return `undefined`

### Issue: Invalid display values
- **Cause**: `NaN` in state gets rendered as "-0.1" or weird values
- **Solution**: Never store `NaN`, use `undefined` for empty

## Code Pattern (for future number inputs)

Use this pattern for all number input fields:

```tsx
<input
  type="number"
  step="0.01"  // For decimals, omit for integers
  value={formData.fieldName ?? ''}  // Use ?? not ||
  onChange={(e) => {
    const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
    handleInputChange('fieldName', value);
  }}
  placeholder="Helpful placeholder text"
  className="w-full px-3 py-2 border border-border rounded-lg"
/>
```

## Git Commit
- `8c80c66` - fix: number input fields showing invalid values when empty

## Status
✅ **FIXED AND DEPLOYED**

All number input fields now properly handle empty values and will remain blank until the user enters data.
