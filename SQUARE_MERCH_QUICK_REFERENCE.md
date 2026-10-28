# 🎯 Square Merch - Quick Reference

## 🚀 Start Here

1. Navigate to `/merch` in your dashboard
2. Click **"Sync Square"** - pulls ALL historical orders
3. Click **"Auto-Match to Shows"** - auto-links orders to shows by date
4. Done! View your orders, items, and analytics

## 📊 What You'll See

### Dashboard (6 Cards)
- **Total Orders** - Count of all orders
- **Total Items** - Count of all items sold
- **Total Revenue** - $ from all orders
- **Average Order** - Average $ per order
- **Matched Orders** - Orders linked to shows
- **Unmatched Orders** - Orders needing show link

### All Sales Tab
| Column | What It Shows |
|--------|---------------|
| Status | Completed, Open, Canceled |
| Order Total | Total $ for order |
| Items | Count of items (3 items) |
| Date/Time | When order was placed |
| Location | City, State (from matched show) |
| Show | Which show (if matched) |
| Matched | ✓ or ✗ |

**Click any row** to expand and see:
- Item name (T-Shirt)
- Variation (Large, Black)
- Quantity (x2)
- Price ($40.00)

### Unmatched Tab
Shows orders without a show link.
- Use dropdown to select show
- Click to match

### Analytics Tab
- **Bar Chart** - Revenue by show
- **Best Show** - Top performer
- **Average Order** - Stats
- **Top Shows List** - Ranked

## 🔍 Search

Type in search box to find:
- Order by ID
- Item by name ("T-Shirt")
- Item by variant ("Large")
- Show by name
- City/state

## 🎨 Data You See

Each order shows:
```
$45.00 | Completed | 3 items
📅 Dec 15, 2024 2:30 PM
📍 Austin, TX
✓ Matched to "Austin Show"

[Expand ▼]
Items:
- T-Shirt (Large) x2 → $40.00
- Sticker x1 → $5.00
```

## 🔑 Key Features

✅ **No Payment Processing** - Read-only order viewing
✅ **All Historical Data** - Every order ever
✅ **Item Details** - Name, size, variant, qty
✅ **Show Matching** - Auto or manual
✅ **Analytics** - Charts & insights
✅ **Search/Filter** - By anything

## 🛠️ Buttons

| Button | What It Does |
|--------|--------------|
| Sync Square | Pull latest orders from Square |
| Auto-Match to Shows | Match orders to shows by date |
| Refresh | Reload current view |

## 📱 Where Data Comes From

```
Your Square Account
    ↓ (Orders API)
SceneGen Backend
    ↓ (Stores in DB)
Merch Dashboard
    ↓ (Shows in UI)
You!
```

## 🎯 Common Tasks

**View all merch sales:**
→ Go to All Sales tab

**See what items sold:**
→ Click any order row to expand

**Match order to show:**
→ Unmatched tab → Select show → Done

**See top shows:**
→ Analytics tab → Top Shows list

**Search for specific item:**
→ Type item name in search box

## 📊 Stats Explained

- **Total Orders** = Number of Square orders
- **Total Items** = Sum of all item quantities
- **Total Revenue** = Sum of all order totals
- **Average Order** = Revenue ÷ Orders
- **Matched/Unmatched** = Orders with/without show link

## 🎉 You're All Set!

Your Square merch tracking is live and ready to use!

Questions? Check `SQUARE_MERCH_INTEGRATION_COMPLETE.md` for full docs.
