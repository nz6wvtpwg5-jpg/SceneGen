# Show Count Badge Feature

## Overview
Added a badge to the "Shows" navigation item in the sidebar that displays the number of upcoming shows for the current entity.

## Implementation

### 1. useShowCount Hook (`src/hooks/useShowCount.ts`)
- Fetches shows from the API
- Filters for shows with dates in the future
- Returns the count of future shows
- Auto-refreshes every 30 seconds
- Handles authentication and entity context

### 2. Updated NavItems Config (`src/app/config.tsx`)
- Added `useShowCount` hook
- Shows nav item now includes `badge` property
- Badge only displays when count > 0

### 3. Updated SideNavItem Component (`src/components/sidenav/side-nav.tsx`)
- Added optional `badge` prop
- **Expanded sidebar**: Badge displays on the right side with white background
- **Collapsed sidebar**: Badge displays as a small circle in the top-right corner of the icon
- Styled with volcano theme colors

## Usage

The badge will automatically appear when there are future shows:
- **Collapsed sidebar**: Red circle with number in top-right corner of calendar icon
- **Expanded sidebar**: Rounded badge on the right side showing count

## Styling

### Expanded Sidebar
```tsx
<span className="ml-auto bg-white dark:bg-gray-800 text-volcano5 dark:text-volcano4 text-xs font-semibold px-2 py-0.5 rounded-full">
  {badge}
</span>
```

### Collapsed Sidebar
```tsx
<span className="absolute -top-1 -right-1 bg-volcano5 dark:bg-volcano4 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
  {badge}
</span>
```

## Current Status

**Database shows count**: 0 shows currently in database for Conan

The show creation was attempted but failed due to backend authentication middleware issues. The backend expects an `X-Entity-Id` header but the request from the Next.js API route may not be passing it correctly.

## Next Steps

1. **Fix show creation** - Debug why shows aren't being saved to the database
2. **Verify badge updates** - Once shows are saved, confirm the badge displays correctly
3. **Add refresh trigger** - Optionally refresh the count when navigating back to /shows page

## Files Changed
- ✅ `/src/hooks/useShowCount.ts` - New hook to fetch and count shows
- ✅ `/src/app/config.tsx` - Added badge to Shows nav item
- ✅ `/src/components/sidenav/side-nav.tsx` - Display badge in sidebar

## Testing

1. Navigate to any page in the app
2. Look at the sidebar "Shows" item
3. Currently shows no badge (0 shows)
4. Once shows are created, badge will appear with count
5. Badge only counts **future shows** (today or later)
