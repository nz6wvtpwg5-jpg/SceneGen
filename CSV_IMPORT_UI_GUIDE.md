# CSV Import - Column Classification Visual Guide

## 🎨 New UI Overview

### Step 2: Mapping & Classification

```
┌─────────────────────────────────────────────────────────────────────┐
│ Column Mapping & Classification                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📊 Summary Cards (Auto-updating)                                   │
│  ┌──────────┬──────────────┬──────────────┬──────────────┐         │
│  │ ✓ 24     │ 📈 3 income  │ 📉 18 out   │ 👁 0 ignored │         │
│  │ columns  │ Revenue      │ Expenses     │ Not imported │         │
│  └──────────┴──────────────┴──────────────┴──────────────┘         │
│                                                                      │
│  ℹ️ Info Banner                                                     │
│  For budget line items, choose whether each column represents       │
│  Income (revenue), Outgoing (expenses), or should be Ignored.       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Required Fields (4)                                                │
│  ┌──────────────────────────────────────────────────────┐          │
│  │ Date ────→ date (show) ──────────────────────── ✓    │          │
│  │ City ────→ city (show) ──────────────────────── ✓    │          │
│  │ City ────→ state (show) ─────────────────────── ✓    │          │
│  │ Ticket sales → fee (show) ───────────────────── ✓    │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Budget Line Items (18) - Classify as Income or Outgoing           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Fees Cash → feesCash                                          │  │
│  │ [🟢 Income] [Outgoing] [Ignore]           Badge: Income       │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ Merch PPL/Card → merchCard                                    │  │
│  │ [🟢 Income] [Outgoing] [Ignore]           Badge: Income       │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ Van → van                                                     │  │
│  │ [Income] [🔴 Outgoing] [Ignore]           Badge: Outgoing     │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ Gas → gas                                                     │  │
│  │ [Income] [🔴 Outgoing] [Ignore]           Badge: Outgoing     │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ ... (scrollable)                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Optional Fields (3)                                                │
│  ┌──────────────────────────────────────────────────────┐          │
│  │ Distance → distance (budget) ───────────────── ✓     │          │
│  │ Cash flow → cashFlow (budget) ──────────────── ✓     │          │
│  │ Previous sales → previousSales (budget) ────── ✓     │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Sample Row Preview                                                 │
│  Date: 01/02/2025 → Feb 1, 2025                                    │
│  City: Nashville, TN                                                │
│  Ticket sales: $2,500                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

[← Back]                                    [Continue to Validation →]
```

## 🎯 Interactive Elements

### Classification Buttons

Each line item has three buttons:

**Income Button (Green)**
```
┌──────────────────┐
│ 📈 Income        │  ← Green when active (bg-green-600)
└──────────────────┘    Outline when inactive
```

**Outgoing Button (Red)**
```
┌──────────────────┐
│ 📉 Outgoing      │  ← Red when active (bg-red-600)
└──────────────────┘    Outline when inactive
```

**Ignore Button (Gray)**
```
┌──────────────────┐
│ 👁 Ignore        │  ← Dark when active
└──────────────────┘    Outline when inactive
```

### Classification Badges

Shows current state on the right side of each row:

```
┌─────────┐  ← Green background, shows on income items
│ Income  │
└─────────┘

┌──────────┐  ← Red background, shows on outgoing items
│ Outgoing │
└──────────┘

┌─────────┐  ← Gray background, shows on ignored items
│ Ignore  │
└─────────┘

┌──────┐  ← Blue background, default auto-mapped (shouldn't see this)
│ Auto │
└──────┘
```

## 🔄 User Interaction Flow

### Example: Changing a Classification

**Initial State:**
```
Merch costs → merchCosts
[Income] [🔴 Outgoing] [Ignore]     Badge: Outgoing
```

**User clicks "Ignore":**
```
Merch costs → merchCosts
[Income] [Outgoing] [⚪ Ignore]     Badge: Ignore
```

**Summary Updates Immediately:**
```
Before: 📈 3 income | 📉 18 outgoing | 👁 0 ignored
After:  📈 3 income | 📉 17 outgoing | 👁 1 ignored
```

## 📋 Real-World Usage Examples

### Example 1: Tour with Unusual Revenue

Your CSV has a "Settlement" column that's actually a refund (expense):

```
Settlement → settlement
Default: [🟢 Income] [Outgoing] [Ignore]     Badge: Income

Click "Outgoing":
Settlement → settlement
Result:  [Income] [🔴 Outgoing] [Ignore]     Badge: Outgoing
```

### Example 2: Ignore Internal Columns

CSV has "Notes" and "ID" columns you don't need:

```
Notes → notes
Click "Ignore":
[Income] [Outgoing] [⚪ Ignore]     Badge: Ignore

ID → id
Click "Ignore":
[Income] [Outgoing] [⚪ Ignore]     Badge: Ignore

Result: Summary shows "👁 2 ignored"
```

### Example 3: Quick Review of Auto-Mapping

All revenue items start green, all expenses start red:

```
✅ Ticket sales → fee              [🟢 Income] ...
✅ Merch Cash → merchCash          [🟢 Income] ...
✅ Van → van                       [🔴 Outgoing] ...
✅ Gas → gas                       [🔴 Outgoing] ...
✅ Agent Fee → agentCommission     [🔴 Outgoing] ...
```

Review and adjust as needed!

## 🎨 Color Coding System

### Green = Income/Revenue
- Button: `bg-green-600 hover:bg-green-700`
- Badge: `bg-green-100 text-green-700`
- Icon: `TrendingUp` in green

### Red = Outgoing/Expense
- Button: `bg-red-600 hover:bg-red-700`
- Badge: `bg-red-100 text-red-700`
- Icon: `TrendingDown` in red

### Gray = Ignored
- Button: Default styling
- Badge: `bg-gray-100 text-gray-700`
- Icon: `EyeOff` in muted

### Blue = Info/Auto
- Used for info banners and default state
- Badge: `bg-blue-100 text-blue-700`

## 🚀 What Happens Next

### Step 3: Validation
- Ignored columns are **not validated**
- Only income and outgoing columns checked
- Validation faster with fewer columns

### Step 4: Import
- Ignored columns are **not imported**
- Income columns → Create revenue line items
- Outgoing columns → Create expense line items
- Database only has the data you selected

## 💡 Tips

1. **Quick Scan**: Look at the summary cards first to see overall classification
2. **Scroll Through**: Budget line items section is scrollable
3. **Ignore First**: Mark all ignore columns first, then review income/outgoing
4. **Sample Preview**: Check the sample row to understand your data
5. **No Undo Needed**: Just click a different button to change classification

## ✨ Benefits Recap

✅ **Visual Feedback**: See exactly what will be imported
✅ **Fast Changes**: One click to reclassify any column
✅ **Smart Defaults**: Most columns pre-classified correctly
✅ **Clean Imports**: Skip irrelevant columns easily
✅ **Flexible**: Handle any CSV format or interpretation
