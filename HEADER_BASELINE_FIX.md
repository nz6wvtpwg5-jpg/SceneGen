# Header UI Baseline Fix

## Issue
The app header had a grey background (`bg-gray-400 dark:bg-gray4`) which violated the SceneGen UI Baseline. The header should use the same solid background as the page.

## Fix Applied
Changed the header background styling:

**Before:**
```tsx
<NavigationMenu className="bg-gray-400 dark:bg-gray4 py-2.5 px-5 w-full flex justify-between items-center">
```

**After:**
```tsx
<NavigationMenu className="bg-background border-b border-border py-2.5 px-5 w-full flex justify-between items-center">
```

## Changes
- **Background**: Changed from `bg-gray-400 dark:bg-gray4` to `bg-background`
- **Border**: Added `border-b border-border` for subtle separation from page content

## Result
The header now:
- Uses the same solid background as the page (`bg-background`)
- Has a subtle border at the bottom for visual separation
- Properly follows the SceneGen UI Baseline design system

## Files Modified
- `/src/components/header/app-header.tsx`

## Date
3 February 2026
