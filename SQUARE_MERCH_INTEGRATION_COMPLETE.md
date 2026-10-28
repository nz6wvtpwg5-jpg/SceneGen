# 🎉 Square Merch Integration - COMPLETE!

## ✅ What's Done

Your Square merch sales integration is now **fully operational** and displays **order-level data** with line item details!

## 📦 What You Can See

When you visit the **/merch** tab, you can now view:

### 1. **Order Overview** (Not Payments!)
- ✅ **Order Total** - Total amount for each order
- ✅ **Order Date/Time** - When the order was placed
- ✅ **Order Status** - Completed, Open, Canceled
- ✅ **Item Count** - Number of items in each order

### 2. **Line Item Details** (Click to Expand!)
- ✅ **Item Name** - What was sold
- ✅ **Size/Variant** - T-shirt size, color, etc.
- ✅ **Quantity** - How many of each item
- ✅ **Item Price** - Price per item and total

### 3. **Location Information**
- ✅ **City** - From matched show
- ✅ **State** - From matched show
- ⚠️ **Square Location** - Currently just Location ID (could be enhanced)

### 4. **Show Matching**
- ✅ **Auto-Match** - Automatically match orders to shows by date
- ✅ **Manual Match** - Select which show an order belongs to
- ✅ **Unmatched Tab** - See orders that need matching

### 5. **Analytics**
- ✅ **Sales by Show** - Bar chart of revenue per show
- ✅ **Top Performing Shows** - Ranked list
- ✅ **Best Show** - Highest revenue show
- ✅ **Average Order Value** - Stats across all orders
- ✅ **Total Items Sold** - Count of all merch items

## 🚀 How to Use

### First Time Setup

1. **Navigate to /merch** in the dashboard
2. Click **"Sync Square"** button
3. This will fetch **ALL historical orders** from your Square account
4. Orders are stored in the database with full line item details

### View Your Orders

1. **All Sales Tab** - See all synced orders
2. **Click any row** to expand and see line items:
   - Item name
   - Size/variant (if applicable)
   - Quantity
   - Price per item
3. **Filter/Search** - Search by item name, variant, city, or show name

### Match Orders to Shows

**Auto-Match:**
1. Click **"Auto-Match to Shows"** button
2. System automatically matches orders to shows on the same date

**Manual Match:**
1. Go to **"Unmatched"** tab
2. Use dropdown to select the correct show for each order
3. Click to match

### View Analytics

1. Go to **"Analytics"** tab
2. See:
   - Best performing show
   - Average order value
   - Total shows with sales
   - Bar chart of sales by show
   - Top performing shows ranked list

## 🗄️ Database Schema

### `merch_sales` Table
Stores order-level information:
- `id` - Internal UUID
- `entity_id` - Your profile/entity
- `square_order_id` - Square's order ID
- `total_money` - Order total in cents
- `currency` - USD, etc.
- `state` - COMPLETED, OPEN, CANCELED
- `created_at` - Order date/time
- `location_id` - Square location ID
- `show_id` - Matched show (nullable)
- `matched` - Boolean flag
- `item_count` - Number of items
- `customer_id` - Square customer ID (if available)

### `merch_sale_items` Table
Stores line item details:
- `id` - Internal UUID
- `merch_sale_id` - Links to parent order
- `name` - Item name (e.g., "T-Shirt")
- `quantity` - How many
- `variation` - Size, color, etc. (e.g., "Large", "Black")
- `base_price_money` - Base price per item (cents)
- `total_money` - Total for this line item (cents)
- `catalog_object_id` - Square catalog reference

## 🔧 Backend Changes

### Updated Endpoints

**GET `/api/merch/sales`**
- Returns orders with full line item details
- Includes show city/state from matched shows
- Groups items by order

**POST `/api/merch/sync`**
- Fetches ALL historical orders from Square (not just last 30 days)
- Stores order + line items in separate tables
- Prevents duplicate syncs

**POST `/api/merch/match`**
- Match order to show by ID

**POST `/api/merch/auto-match`**
- Auto-match orders to shows by date

## 🎨 Frontend Changes

### Components Updated

**`MerchSalesTable.tsx`**
- ✅ Expandable rows to show line items
- ✅ Display item name, variation, quantity
- ✅ Show city/state from matched shows
- ✅ Click chevron to expand/collapse details

**`MerchAnalytics.tsx`**
- ✅ Updated to use new data structure
- ✅ Shows order count and item count
- ✅ Displays city/state instead of venue name

**`UnmatchedTransactions.tsx`**
- ✅ Shows line items summary
- ✅ Displays "X items: Item1 (Size) x2, Item2 x1"

**`/app/merch/page.tsx`**
- ✅ Updated stats: totalOrders, totalItems, averageOrderValue
- ✅ 6-card dashboard with item count

## 📊 Data Flow

```
Square API (Orders)
     ↓
Backend: squareService.js
     ↓ (fetchAllOrders)
Backend: server.js (/api/merch/sync)
     ↓ (store in DB)
Database: merch_sales + merch_sale_items
     ↓
Backend: server.js (/api/merch/sales)
     ↓ (GET with joins)
Frontend: /merch page
     ↓
Components: Tables, Analytics, Charts
```

## 🎯 What You Get

### Order View
```
Order #ABC123
$45.00 | Completed | 3 items
📅 Dec 15, 2024 2:30 PM
📍 Austin, TX

[Click to expand] ↓

Items:
- T-Shirt (Large) x2 → $40.00
- Sticker x1 → $5.00
```

### Analytics View
```
Best Performing Show
$1,250.00
Austin Show
15 orders • 45 items
Austin, TX
```

## 🔍 Search & Filter

Search works across:
- ✅ Order ID
- ✅ Show name
- ✅ City/state
- ✅ Order state
- ✅ **Item name** (NEW!)
- ✅ **Item variation** (NEW!)

Example: Search "Large" to find all orders with Large t-shirts!

## 🚦 Next Steps (Optional Enhancements)

### 1. **Location Mapping**
Currently, you see `location_id` from Square. To show actual city:
- Option A: Make API call to Square Locations API
- Option B: Manual mapping table (location_id → city name)
- For now: City/state comes from matched show

### 2. **Item Analytics**
Want to see top-selling items?
- Add "Items" analytics tab
- Group by item name/variation
- Show "T-Shirt (Large): 45 sold, $900 revenue"

### 3. **Date Range Filters**
Add date picker to filter by:
- Last 30 days
- Last 90 days
- Custom range
- Specific tour dates

### 4. **Export to CSV**
Download merch sales data:
- All orders with line items
- For accounting/tax purposes

### 5. **Inventory Tracking**
If you track inventory:
- Link catalog_object_id to inventory
- Show "10 left in stock" warnings

## 📱 Mobile-Friendly

All tables and charts are responsive:
- ✅ Works on desktop
- ✅ Works on tablet
- ✅ Works on mobile (scrollable tables)

## 🔐 Security

- ✅ Square credentials stored in `.env` (not in code)
- ✅ Production environment active
- ✅ Auth middleware on API endpoints
- ✅ Entity-scoped queries (can only see your own data)

## 📝 Testing Guide

1. **Sync Test**
   ```
   1. Click "Sync Square"
   2. Should see: "Synced X new orders..."
   3. Check All Sales tab - orders appear
   ```

2. **Expand Test**
   ```
   1. Click any order row
   2. Should expand to show line items
   3. Each item shows name, variation, quantity, price
   ```

3. **Match Test**
   ```
   1. Go to Unmatched tab
   2. Select a show from dropdown
   3. Order moves to All Sales with show linked
   ```

4. **Analytics Test**
   ```
   1. Go to Analytics tab
   2. See bar chart with shows
   3. See ranked list of top shows
   ```

## 🐛 Troubleshooting

### Orders Not Syncing
- Check backend log: `tail -f /Users/jon/Desktop/scenegen/SceneGenUIV2/backend/backend.log`
- Verify Square credentials in `.env`
- Check Square API status

### No Line Items Showing
- Make sure you clicked on the row to expand
- Look for chevron icon (▼)
- Check browser console for errors

### City/State Not Showing
- Orders must be matched to a show first
- Shows must have city/state filled in
- Use auto-match or manual match

### Analytics Empty
- Need at least one matched order
- Go to Unmatched tab and match orders
- Analytics only shows matched orders

## 🎉 Success!

You now have a **full merch sales tracking system** that:
- ✅ Pulls order data from Square (not just payments)
- ✅ Shows item-level details (name, size, quantity)
- ✅ Matches to shows for location/date context
- ✅ Provides analytics and insights
- ✅ Searchable by item, variant, city, date

All without processing any payments - just **viewing historical order data**!

---

**Last Updated:** December 2024
**Status:** ✅ Production Ready
**Environment:** Square Production API
