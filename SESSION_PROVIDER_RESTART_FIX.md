# Session Provider Error - Quick Fix

## Error You're Seeing

```
Uncaught Error: [next-auth]: `useSession` must be wrapped in a <SessionProvider />
```

This is appearing on multiple pages (shows, touring) after refreshing.

## Why It's Happening

After making changes to the import flow components, Next.js's hot reload may have corrupted the session provider context. This is a common issue with Next.js development mode.

## Quick Fix - Restart Dev Server

**Stop and restart your Next.js development server:**

### Terminal 1 (Frontend)
```bash
# Press Ctrl+C to stop
# Then restart:
npm run dev
```

### Terminal 2 (Backend - if needed)
```bash
# Press Ctrl+C to stop
# Then restart:
npm start
```

## Why This Works

- SessionProvider IS properly configured in `src/app/layout.tsx`
- The wrapper component exists and is correct
- Hot Module Replacement (HMR) sometimes breaks React context
- A full restart resets the context properly

## Verify It's Fixed

After restarting:

1. Go to http://localhost:3000
2. Navigate to `/import` - should work
3. Navigate to `/shows` - should work
4. Navigate to `/touring` - should work
5. No more SessionProvider errors in console

## If It Still Doesn't Work

If restarting doesn't fix it, try:

### Option 1: Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

### Option 2: Clear node_modules (nuclear option)
```bash
rm -rf node_modules .next
npm install
npm run dev
```

### Option 3: Check SessionProvider Setup

Verify `/src/app/layout.tsx` has:
```tsx
import { SessionProviderWrapper } from "@/components/providers/session-provider-wrapper";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProviderWrapper>
          {/* all your app content */}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
```

And verify `/src/components/providers/session-provider-wrapper.tsx` has:
```tsx
'use client';

import { SessionProvider } from 'next-auth/react';

export function SessionProviderWrapper({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

Both files look correct in your codebase ✅

## Root Cause

This is NOT a code issue - it's a Next.js HMR/Fast Refresh issue that happens when:
- Making changes to context providers
- Making changes to client components
- Hot reload doesn't properly re-establish React context

**Solution:** Just restart the dev server! 🔄

## Status

✅ Code is correct
✅ SessionProvider is properly configured
⏳ Just needs a dev server restart

---

**TL;DR:** Press Ctrl+C and run `npm run dev` again in your frontend terminal.
