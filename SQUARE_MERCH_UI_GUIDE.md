# 🎨 Square Merch UI - Visual Guide

## 📱 Dashboard View

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🛍️ Merch Sales                         [Auto-Match] [Sync Square] │
│ Track and analyze merch sales from your Square card reader         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ 🛍️       │  │ 📦       │  │ 💰       │  │ 📈       │          │
│  │ Total    │  │ Total    │  │ Total    │  │ Average  │          │
│  │ Orders   │  │ Items    │  │ Revenue  │  │ Order    │          │
│  │          │  │          │  │          │  │          │          │
│  │   127    │  │   342    │  │ $5,240   │  │  $41.26  │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                     │
│  ┌──────────┐  ┌──────────┐                                       │
│  │ 📅       │  │ 📍       │                                       │
│  │ Matched  │  │Unmatched │                                       │
│  │ Orders   │  │ Orders   │                                       │
│  │          │  │          │                                       │
│  │   115    │  │    12    │                                       │
│  └──────────┘  └──────────┘                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 📋 All Sales Tab (Collapsed)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [All Sales] [Unmatched (12)] [Analytics]                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🔍 Search sales...                                    [Refresh]   │
│                                                                     │
│  ┌───┬────────┬────────┬────────┬──────────┬──────────┬─────┬───┐ │
│  │ ▼ │Status  │Total   │Items   │Date/Time │Location  │Show │✓  │ │
│  ├───┼────────┼────────┼────────┼──────────┼──────────┼─────┼───┤ │
│  │ ▼ │✓Complete│$45.00 │📦 3    │📅 Dec 15 │📍Austin  │Show │✓  │ │
│  │   │        │        │items   │2:30 PM   │TX        │#123 │   │ │
│  ├───┼────────┼────────┼────────┼──────────┼──────────┼─────┼───┤ │
│  │ ▼ │✓Complete│$28.00 │📦 2    │📅 Dec 14 │📍Dallas  │Show │✓  │ │
│  │   │        │        │items   │7:15 PM   │TX        │#122 │   │ │
│  ├───┼────────┼────────┼────────┼──────────┼──────────┼─────┼───┤ │
│  │ ▼ │⚠️ Open  │$65.00 │📦 4    │📅 Dec 13 │    -     │  -  │✗  │ │
│  │   │        │        │items   │9:00 PM   │          │     │   │ │
│  └───┴────────┴────────┴────────┴──────────┴──────────┴─────┴───┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 📋 All Sales Tab (Expanded)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [All Sales] [Unmatched (12)] [Analytics]                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🔍 Search sales...                                    [Refresh]   │
│                                                                     │
│  ┌───┬────────┬────────┬────────┬──────────┬──────────┬─────┬───┐ │
│  │ ▲ │✓Complete│$45.00 │📦 3    │📅 Dec 15 │📍Austin  │Show │✓  │ │
│  │   │        │        │items   │2:30 PM   │TX        │#123 │   │ │
│  ├───┴────────┴────────┴────────┴──────────┴──────────┴─────┴───┤ │
│  │  Order Items:                                                  │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │ ┃ T-Shirt  [Large]  Qty: 2         $40.00             │   │ │
│  │  │ ┃ Sticker            Qty: 1          $5.00             │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  │  Order ID: sq0abcd-1234-5678-9012-efghijklmnop                │ │
│  ├───┬────────┬────────┬────────┬──────────┬──────────┬─────┬───┤ │
│  │ ▼ │✓Complete│$28.00 │📦 2    │📅 Dec 14 │📍Dallas  │Show │✓  │ │
│  │   │        │        │items   │7:15 PM   │TX        │#122 │   │ │
│  └───┴────────┴────────┴────────┴──────────┴──────────┴─────┴───┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔗 Unmatched Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ [All Sales] [Unmatched (12)] [Analytics]                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Unmatched Transactions                                             │
│  12 transactions need to be matched to shows                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  $65.00  ⚠️ Open                                            │   │
│  │  📅 Dec 13, 2024 9:00 PM                                    │   │
│  │  4 items: T-Shirt (Large) x2, Hat x1, Poster x1            │   │
│  │  Order ID: sq0abcd-1234-5678-9012...                        │   │
│  │                                                              │   │
│  │  [Match to show... ▼]  ← Select show here                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  $35.00  ⚠️ Open                                            │   │
│  │  📅 Dec 12, 2024 8:30 PM                                    │   │
│  │  2 items: Vinyl x1, Sticker x1                              │   │
│  │  Order ID: sq0wxyz-9876-5432-1098...                        │   │
│  │                                                              │   │
│  │  [Match to show... ▼]                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 📊 Analytics Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ [All Sales] [Unmatched (12)] [Analytics]                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ 🏆           │  │ 📈           │  │ 📅           │             │
│  │ Best Show    │  │ Avg Order    │  │ Total Shows  │             │
│  │              │  │              │  │              │             │
│  │  $1,250.00   │  │   $42.50     │  │      28      │             │
│  │ Austin Show  │  │ Across 28    │  │ From matched │             │
│  │ 35 orders •  │  │ shows        │  │ transactions │             │
│  │ 105 items    │  │              │  │              │             │
│  │ Austin, TX   │  │              │  │              │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
│  Sales by Show                                                      │
│  Top performing shows by merch revenue                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │   $                                                          │   │
│  │ 1500│                                                        │   │
│  │ 1200│  ██                                                    │   │
│  │  900│  ██  ██                                                │   │
│  │  600│  ██  ██  ██                                            │   │
│  │  300│  ██  ██  ██  ██  ██                                    │   │
│  │    0└──────────────────────────────────────────              │   │
│  │      Austin Dallas Houston Boston NYC                       │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Top Performing Shows                                               │
│  Shows ranked by merch sales revenue                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🥇  Austin Show                         $1,250.00          │   │
│  │      Dec 15 • Austin, TX                 35 orders • 105 it │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  🥈  Dallas Show                         $1,100.00          │   │
│  │      Dec 14 • Dallas, TX                 32 orders • 96 it  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  🥉  Houston Show                        $950.00            │   │
│  │      Dec 13 • Houston, TX                28 orders • 84 it  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 🎨 Color Scheme

```
Status Badges:
✅ Completed  → Green badge
⚠️  Open      → Yellow badge
❌ Canceled   → Red badge

Matched Indicators:
✓ Yes → Green checkmark
✗ No  → Yellow X

Charts:
Bars → Cyan (#00C9FF)
Background → Dark theme
Grid → Subtle opacity
```

## 📱 Mobile View

```
┌─────────────────┐
│ 🛍️ Merch Sales  │
│ Track merch...  │
├─────────────────┤
│ [Auto-Match]    │
│ [Sync Square]   │
├─────────────────┤
│ ┌─────────────┐ │
│ │ Total Orders│ │
│ │     127     │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Total Items │ │
│ │     342     │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │Total Revenue│ │
│ │  $5,240.00  │ │
│ └─────────────┘ │
├─────────────────┤
│ [All Sales]     │
│ [Unmatched (12)]│
│ [Analytics]     │
├─────────────────┤
│ 🔍 Search...    │
├─────────────────┤
│ Orders table    │
│ (scrollable →)  │
└─────────────────┘
```

## 🔍 Search Examples

```
Search: "Large"
Results: All orders with "Large" variant items
─────────────────────────────────────────────
$45.00 | T-Shirt (Large) x2, Sticker x1
$28.00 | T-Shirt (Large) x1, Hat x1

Search: "Austin"
Results: All orders from Austin shows
─────────────────────────────────────────────
$65.00 | Austin Show | Dec 15
$35.00 | Austin Show | Dec 14

Search: "T-Shirt"
Results: All orders with T-Shirt items
─────────────────────────────────────────────
$45.00 | T-Shirt (Large) x2
$28.00 | T-Shirt (Medium) x1
```

## 🎯 Interactive Elements

```
Clickable:
▼ Chevron    → Click to expand row
▲ Chevron    → Click to collapse row
Order Row    → Click anywhere to toggle
[Buttons]    → Click to perform action
Dropdowns    → Click to select show

Hoverable:
Rows         → Highlight on hover
Buttons      → Change color on hover
Chart bars   → Show tooltip on hover
```

## 🎉 Success States

```
After Sync:
┌─────────────────────────────────────┐
│ ✅ Synced 5 new orders             │
│ (127 total fetched, 122 existing)   │
└─────────────────────────────────────┘

After Auto-Match:
┌─────────────────────────────────────┐
│ ✅ Matched 12 sales to shows       │
└─────────────────────────────────────┘

All Matched:
┌─────────────────────────────────────┐
│        🔗                            │
│   All sales matched!                │
│   All transactions have been        │
│   matched to shows                  │
└─────────────────────────────────────┘
```

---

**This is what you'll see when you open `/merch` in your dashboard!**

Everything is live, interactive, and ready to use. 🎉
