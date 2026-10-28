# Budget Indicators Feature - Quick Summary

## ✅ COMPLETE

Shows with budgets now display financial information in the "Upcoming shows" sidebar.

## 🎯 What You'll See

### Before (no budget):
```
┌─────────────────────────────┐
│ Burgerweeshuis    [confirmed]│
│ Deventer, OV                │
│ Fri, Feb 27                 │
└─────────────────────────────┘
```

### After (with budget):
```
┌─────────────────────────────┐
│ Burgerweeshuis    [confirmed]│
│ Deventer, OV                │
│ Fri, Feb 27                 │
├─────────────────────────────┤
│ 🪙 Budget Tracked           │
│ ┌──────────┬──────────┐     │
│ │ Fees     │ Costs    │     │
│ │ $1,500   │ $800     │     │
│ └──────────┴──────────┘     │
└─────────────────────────────┘
```

## 📝 How It Works

1. **Create a budget** in `/bookkeeping`
2. **Select the show** when creating the budget
3. **Go to `/shows`** page
4. **See the budget info** in the sidebar!

## 🎨 Features

- ✅ **Coins icon** (🪙) shows budget exists
- ✅ **"Budget Tracked"** badge for quick identification
- ✅ **Fees** displayed with currency symbol
- ✅ **Costs** displayed with currency symbol
- ✅ **Multi-currency** support (USD, EUR, GBP, etc.)
- ✅ **Number formatting** with commas for large amounts
- ✅ **Dark mode** compatible
- ✅ **Only shows** when budget exists (no clutter)

## 🔗 Integration

**Bookkeeping Page** → Creates budget with `showId`
**Shows Page** → Fetches budgets, finds by `showId`, displays info

## 🚀 Try It Now

1. Open `/bookkeeping`
2. Click "Create Budget"
3. Select a show (e.g., "Burgerweeshuis")
4. Enter fees and costs
5. Save
6. Navigate to `/shows`
7. See the budget info! 🎉
