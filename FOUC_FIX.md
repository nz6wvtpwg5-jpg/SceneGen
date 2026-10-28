# Flash of Unstyled Content (FOUC) Fix

## Issue
The app was showing unstyled/plain text content on page refresh, looking "shit" before the styles loaded.

## Root Cause
1. **Font Loading Delay** - Custom Geist fonts were loading without `font-display: swap`
2. **No Loading State** - Pages had no skeleton/loading UI during hydration
3. **Hydration Mismatch** - React was taking time to hydrate, showing plain HTML first

## Solutions Implemented

### 1. Font Optimization (`/src/app/layout.tsx`)
Added `display: "swap"` and `preload: true` to font configurations:
```typescript
const geistSans = localFont({
  src: "./assets/fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",      // ← Show fallback font immediately
  preload: true,        // ← Preload fonts for faster loading
});
```

**Benefits:**
- `display: "swap"` - Shows system font immediately, then swaps to custom font when loaded
- `preload: true` - Starts loading fonts earlier in the page load process

### 2. Loading Skeleton (`/src/app/merch/loading.tsx`)
Created a loading skeleton component that Next.js automatically shows during page transitions and initial loads.

**Features:**
- Mimics the actual page layout
- Animated pulse effect
- Matches the merch page structure (stats cards, table, etc.)

## How It Works
- **Font Display Swap**: Users see content with system fonts immediately, custom fonts swap in when ready
- **Next.js Suspense**: The `loading.tsx` file is automatically used by Next.js during page loads
- **Smooth Transitions**: Users see a skeleton instead of unstyled HTML

## Testing
1. Hard refresh the page (Cmd+Shift+R)
2. You should now see:
   - Immediate styled content (even if using fallback fonts briefly)
   - Loading skeletons during page transitions
   - No more flash of plain/unstyled content

## Additional Recommendations
If FOUC still occurs on other pages, create `loading.tsx` files in their directories:
- `/src/app/dashboard/loading.tsx`
- `/src/app/shows/loading.tsx`
- `/src/app/contacts/loading.tsx`
- etc.
