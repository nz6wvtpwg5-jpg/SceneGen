# Sidebar Badge Update - Shows Count Display

## ✅ Changes Completed

### Problem
When the sidebar was collapsed, the Shows menu item was showing the full badge text like "29 (24)" which took up too much space in the collapsed state. The user wanted:
- **Collapsed sidebar**: Show only total count (e.g., "29")
- **Expanded sidebar**: Show full format with future count (e.g., "29 (24)")

### Solution

Modified the sidebar navigation to support separate badge values for collapsed and expanded states.

### Files Changed

#### 1. `/src/app/config.tsx`
- Modified the Shows nav item to have two badge properties:
  - `badge`: Simple total count for collapsed state (e.g., `29`)
  - `badgeExpanded`: Full format for expanded state (e.g., `29 (24)`)

**Before:**
```typescript
badge: totalShowCount > 0 ? `${totalShowCount}${futureShowCount !== totalShowCount ? ` (${futureShowCount})` : ''}` : undefined,
```

**After:**
```typescript
badge: totalShowCount > 0 ? totalShowCount : undefined,
badgeExpanded: totalShowCount > 0 ? `${totalShowCount}${futureShowCount !== totalShowCount ? ` (${futureShowCount})` : ''}` : undefined,
```

#### 2. `/src/components/sidenav/side-nav.tsx`
- Updated `SideNavItem` component interface to accept `badgeExpanded` prop
- Added logic to use `badgeExpanded` when sidebar is expanded, otherwise use `badge`
- Updated all `SideNavItem` calls to pass the new prop

**Key Change:**
```typescript
const displayBadge = isSidebarExpanded && badgeExpanded !== undefined ? badgeExpanded : badge;
```

### How It Works

1. **Collapsed State**:
   - Shows just the number in a small badge overlay on the calendar icon
   - Example: `27` appears in the top-right corner of the icon

2. **Expanded State**:
   - Shows the full text inline with the menu item
   - Example: `Shows                    29 (24)`
   - The `(24)` represents future shows if different from total

### Visual Result

**Collapsed:**
```
[🗓️27]  <- Just the icon with number overlay
```

**Expanded:**
```
🗓️ Shows          29 (24)  <- Full label with detailed count
```

---

**Status:** ✅ Complete and tested for compilation errors
**No TypeScript errors**
