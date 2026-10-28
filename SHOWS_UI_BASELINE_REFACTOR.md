# Shows Page UI Baseline Refactoring

## Date: February 3, 2026

## Summary
Refactored the shows page and related components to fully comply with the SceneGen UI Baseline design specifications.

## Changes Made

### 1. Calendar Grid (src/app/shows/page.tsx)

#### Before:
- Calendar days used `bg-card` for cells
- Non-current month used `bg-muted/30`
- Today indicator used solid `ring-primary`
- Calendar border was solid

#### After:
- Calendar days now use `bg-background` (proper surface hierarchy)
- Non-current month uses `opacity-40` (consistent opacity pattern)
- Today indicator uses `ring-primary/40` (opacity-based accent)
- Calendar border uses `bg-border/50` with rounded corners
- Multi-day events use `bg-purple-500/10` with `border-purple-500/60`
- Single-day events use `bg-primary/10`

### 2. Status Badges (src/components/shows/ShowsTable.tsx)

#### Before:
- Ring used `ring-border/40`

#### After:
- Ring now uses `ring-current/20` for better visual hierarchy
- Status badges already had proper opacity-based backgrounds:
  - `draft`: bg-muted text-foreground
  - `pending_invite`: bg-primary/10 text-primary
  - `pending_acceptance`: bg-amber-500/10 text-amber-500
  - `confirmed`: bg-emerald-500/10 text-emerald-500
  - `cancelled`: bg-destructive/10 text-destructive

### 3. Pending Shows Banner (src/app/shows/page.tsx)

#### Before:
- Used `bg-muted/40` with `border-border/40`

#### After:
- Uses `bg-card` with `border-border` for consistency with other panels

### 4. Surface Hierarchy

All surfaces now properly follow the SceneGen UI Baseline:
- **Page wrapper**: `bg-background` (solid, from globals.css)
- **Primary surfaces** (cards, panels, controls): `bg-card`
- **Secondary surfaces** (nested elements, toggle container): `bg-muted`
- **Active states**: `bg-background` (for toggles) or `bg-primary` (for filters)
- **Hover states**: opacity-based overlays (e.g., `hover:bg-accent/20`)

### 5. Layout Constraints

Page wrapper already correctly uses:
```tsx
<div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
```

## Design Principles Applied

1. **Solid background only**: Only the root `bg-background` is solid
2. **Card surfaces**: All panels use `bg-card` from shadcn/zinc palette
3. **Opacity-based accents**: Status indicators, hover states, and rings use opacity
4. **No unnecessary colors**: Removed solid color fills where possible
5. **Consistent spacing**: Layout constraint of max-w-6xl with px-4

## Files Modified

1. `src/app/shows/page.tsx`
   - Calendar grid styling
   - Pending shows banner
   - Day cell backgrounds
   - Event badges

2. `src/components/shows/ShowsTable.tsx`
   - Status badge rings

## Testing

To verify changes:
1. Check shows page in both light and dark modes
2. Verify calendar renders correctly with events
3. Confirm status badges display with proper opacity
4. Test hover states on show cards
5. Verify layout constraint (content max-width 1152px)

## Backup Files Created

- `src/app/shows/page.tsx.backup`
- `src/components/shows/ShowsTable.tsx.backup`

## Next Steps

1. Apply same baseline refactoring to other pages (dashboard, tours, contacts)
2. Audit modals and forms for baseline compliance
3. Review and update any remaining components
4. Update design documentation

## Commands Used

All changes were made using terminal commands (sed) as per user requirements:
- `sed -i` for find/replace operations
- `cp` for creating backups
- `cat` for verification
