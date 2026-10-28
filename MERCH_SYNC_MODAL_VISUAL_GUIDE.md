# Merch Sync Modal - Quick Visual Guide

## 🎯 User Journey

### Step 1: Click "Sync Square"
```
┌─────────────────────────────────────────────────────────┐
│  Merch Sales                                            │
│                                        [Auto-Match]     │
│                                        [Sync Square] ← CLICK HERE
└─────────────────────────────────────────────────────────┘
```

### Step 2: Modal Opens & Loads Counts
```
┌──────────────────────────────────────────┐
│  Sync Square Orders                      │
│  Choose how you want to sync...          │
├──────────────────────────────────────────┤
│                                           │
│         🔄 Loading...                    │
│                                           │
└──────────────────────────────────────────┘
```

### Step 3: View Sync Options
```
┌─────────────────────────────────────────────────────┐
│  Sync Square Orders                                 │
│  Choose how you want to sync your Square sales data │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │ Last Sync: Jan 15, 2024 10:30 AM             │  │
│  │ Orders in Database: 1,225                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Select Sync Mode:                                 │
│                                                     │
│  ┌─────────────────────────────────────────┐      │
│  │ 💾 Sync New Orders Only      │    25    │      │
│  │ [Recommended]                │  orders  │      │
│  │ Fetch only orders created    │          │      │
│  │ since last sync              │          │      │
│  │                              │          │      │
│  │ [Sync 25 New Orders] ←─── FAST OPTION   │      │
│  └─────────────────────────────────────────┘      │
│                                                     │
│  ┌─────────────────────────────────────────┐      │
│  │ 🔄 Full Re-Import            │  1,250   │      │
│  │ [Slow]                       │  orders  │      │
│  │ Re-process all orders from   │          │      │
│  │ Square (may take several     │          │      │
│  │ minutes)                     │          │      │
│  │                              │          │      │
│  │ [Re-Import All 1,250 Orders] ← SLOW BUT THOROUGH │
│  └─────────────────────────────────────────┘      │
│                                                     │
│                                      [Cancel]      │
└─────────────────────────────────────────────────────┘
```

### Step 4: User Selects Option & Sync Starts
```
┌─────────────────────────────────────────────────────┐
│  Merch Sales                                        │
├─────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────┐ │
│  │ Processing 25 orders...            ████░░ 60% │ │
│  │ 15 of 25 orders processed    ~4 seconds remaining │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Step 5: Success!
```
┌─────────────────────────────────────────────────────┐
│  ✅ Success! Synced 25 new transactions             │
│     (18 auto-matched to shows)                      │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Design Elements

### Color Coding
- **Cyan/Blue** 🔵: Incremental sync (recommended)
- **Purple** 🟣: Full re-import
- **Yellow** 🟡: Warning badge (slow operation)
- **Green** 🟢: Recommended badge

### Icons
- 💾 **Database**: Incremental/new orders
- 🔄 **Refresh**: Full re-import
- 📊 **Chart**: Statistics
- ⬇️ **Download**: Sync action
- ✅ **Checkmark**: Success

### Badges
- `[Recommended]` - Green outline, shows best option
- `[Slow]` - Yellow background, warns about time

---

## 🔍 Key Information Displayed

### At a Glance
1. **Last Sync Time**: When you last synced
2. **DB Count**: How many orders are stored locally
3. **New Orders**: How many new orders to sync
4. **Total Orders**: How many total orders exist in Square

### Decision Factors

**Choose Incremental Sync When:**
- ✅ You sync regularly
- ✅ You just want the latest orders
- ✅ You need it done quickly
- ✅ Everything seems correct

**Choose Full Re-Import When:**
- ✅ First time setting up
- ✅ Suspect missing data
- ✅ Want to rebuild from scratch
- ✅ Changed Square accounts

---

## 📱 Responsive Design

### Desktop (> 500px)
- Full-width cards with side-by-side info
- Large order count numbers
- Detailed descriptions

### Mobile/Tablet
- Stacked layout
- Compact but readable
- Touch-friendly buttons

---

## ⚡ Performance Indicators

### Visual Cues for Speed

**Incremental Sync**
```
💾 Sync New Orders Only        25
[Recommended]               orders
Fetch only orders created...
  
[Sync 25 New Orders]  ← Fast! ⚡
```

**Full Sync**
```
🔄 Full Re-Import           1,250
[Slow]                     orders
Re-process all orders...

[Re-Import All 1,250 Orders] ← Slow 🐢
```

---

## 💬 User Feedback Examples

### Incremental Sync Success
```
✅ Success! Synced 25 new transactions
   (18 auto-matched to shows).
   0 were already in the database.
```

### Full Sync Success
```
✅ Success! Synced 1,250 transactions
   (982 auto-matched to shows).
   1,225 were already in the database.
```

### No New Orders
```
✅ Sync complete! All 1,225 transactions
   are up to date. No new transactions found.
```

---

## 🎯 Call to Action Hierarchy

1. **Primary**: "Sync X New Orders" (prominent, cyan, recommended)
2. **Secondary**: "Re-Import All X Orders" (outlined, purple, alternative)
3. **Tertiary**: "Cancel" (ghost, minimal)

---

## 🏗️ Component Structure

```
Dialog
├── DialogHeader
│   ├── DialogTitle: "Sync Square Orders"
│   └── DialogDescription: "Choose how you want to sync..."
│
├── Loading State OR Content
│   ├── Stats Card
│   │   ├── Last Sync
│   │   └── DB Order Count
│   │
│   ├── Incremental Sync Card
│   │   ├── Icon + Title + Badge
│   │   ├── Description
│   │   ├── Order Count (large)
│   │   └── Action Button
│   │
│   └── Full Sync Card
│       ├── Icon + Title + Badge
│       ├── Description
│       ├── Order Count (large)
│       └── Action Button
│
└── DialogFooter
    └── Cancel Button
```

---

## ✨ Delightful Details

1. **Loading Animation**: Spinning refresh icon while fetching counts
2. **Hover Effects**: Cards highlight when hovered
3. **Smart Labels**: "Recommended" and "Slow" badges guide users
4. **Large Numbers**: Order counts are prominent and easy to read
5. **Contextual Help**: Descriptions explain what each option does
6. **Quick Access**: Single click from button to action
7. **No Surprises**: Users know what will happen before it starts

---

## 🎓 User Education

### First-Time Users
When opening modal for the first time:
- See "Never" for last sync
- See high new order count
- Understand they need full sync initially

### Regular Users
After initial setup:
- See recent last sync date
- See low new order count
- Quickly click incremental sync

### Troubleshooting Users
When something seems wrong:
- Can choose full re-import
- System re-processes everything
- Data integrity restored

---

This visual guide should help users understand the sync modal at a glance! 🎨✨
