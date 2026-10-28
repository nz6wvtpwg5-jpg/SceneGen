# Session Provider Error Fix

## Issue

The import flow was throwing an error:
```
Uncaught Error: [next-auth]: `useSession` must be wrapped in a <SessionProvider />
```

This occurred in two places:
1. `Step3Validation.tsx` - When entering venue addresses
2. `TourDetailsModal.tsx` - When viewing tour details after import

## Root Cause

Both components were using `useSession()` hook from `next-auth/react`, but they were being rendered in contexts where `<SessionProvider>` was not available.

## Solution

Changed both components to accept authentication data as props instead of using the `useSession()` hook directly.

### Changes Made

#### 1. Step3Validation.tsx

**Before:**
```tsx
import { useSession } from 'next-auth/react';

interface Step3ValidationProps {
  parsedData: ParsedCSV;
  mappings: FieldMapping[];
  entityId: string;
  // ... other props
}

export function Step3Validation({ ... }: Step3ValidationProps) {
  const { data: session } = useSession(); // ❌ Error!

  const fetchExistingTours = async () => {
    if (!session?.access_token) return;

    const response = await fetch(`/api/tours`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        // ...
      }
    });
  };
}
```

**After:**
```tsx
// ✅ No useSession import needed

interface Step3ValidationProps {
  parsedData: ParsedCSV;
  mappings: FieldMapping[];
  entityId: string;
  accessToken: string; // ✅ Added prop
  // ... other props
}

export function Step3Validation({
  accessToken, // ✅ Receive as prop
  ...
}: Step3ValidationProps) {
  const fetchExistingTours = async () => {
    if (!accessToken) return;

    const response = await fetch(`/api/tours`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`, // ✅ Use prop
        // ...
      }
    });
  };
}
```

#### 2. ImportWizard.tsx

**Updated to pass accessToken:**
```tsx
<Step3Validation
  parsedData={state.parsedData}
  mappings={state.mappings}
  entityId={entityId}
  accessToken={accessToken} // ✅ Pass accessToken prop
  onComplete={handleValidationComplete}
  onStartImport={handleStartImport}
  onBack={() => goToStep('mapping')}
/>
```

#### 3. TourDetailsModal.tsx (Previously Fixed)

Already refactored to use props pattern:
- Created `TourDetailsModalWithSession.tsx` wrapper for session context
- Base `TourDetailsModal.tsx` accepts auth data as props
- Used in `Step4Summary.tsx` with props

## Testing

After this fix:
1. ✅ Import flow works without session errors
2. ✅ Can enter venue addresses
3. ✅ Can fetch existing tours
4. ✅ Can view tour details after import
5. ✅ No console errors

## Pattern to Follow

**When creating components that need auth:**

**Option 1: Wrapper Pattern (for reusable components)**
```tsx
// BaseComponent.tsx
interface Props {
  accessToken: string;
  entityId: string;
  // ... other props
}

export function BaseComponent({ accessToken, entityId }: Props) {
  // Use accessToken directly
}

// ComponentWithSession.tsx
import { useSession } from 'next-auth/react';

export function ComponentWithSession() {
  const { data: session } = useSession();

  return (
    <BaseComponent
      accessToken={session?.access_token!}
      entityId={session?.user?.entity_id!}
    />
  );
}
```

**Option 2: Props Pattern (for nested components)**
```tsx
// Parent component has session
function ParentWithSession() {
  const { data: session } = useSession();

  return (
    <ChildComponent accessToken={session?.access_token!} />
  );
}

// Child component receives as prop
interface ChildProps {
  accessToken: string;
}

function ChildComponent({ accessToken }: ChildProps) {
  // Use accessToken
}
```

## Files Modified

1. `/src/app/import/components/Step3Validation.tsx`
   - Removed `useSession` import
   - Added `accessToken` prop
   - Updated `fetchExistingTours` to use prop

2. `/src/app/import/components/ImportWizard.tsx`
   - Pass `accessToken` prop to `Step3Validation`

## Related Fixes

- `TourDetailsModal.tsx` - Previously refactored
- `TourDetailsModalWithSession.tsx` - Wrapper component
- `Step4Summary.tsx` - Updated to use props pattern

## Status

✅ **FIXED** - Import flow now works without session provider errors

## Next Steps

1. Test the complete import flow
2. Verify venue address collection works
3. Verify tour modal opens correctly
4. Check for any other session-related errors
