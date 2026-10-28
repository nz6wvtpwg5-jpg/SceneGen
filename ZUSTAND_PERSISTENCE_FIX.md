# Zustand Persistence Fix - Entity Type Transformation

## Problem

When navigating to `/tours` as an artist user (e.g., CONAN), the page briefly showed "Artist Feature Only" message before displaying the correct content. This was caused by a snake_case vs camelCase mismatch in the persisted Zustand store data.

## Root Cause

1. **Backend returns snake_case**: The backend API returns `entity_type` instead of `entityType`
2. **Frontend expects camelCase**: The TypeScript `Entity` interface expects `entityType`
3. **Persistence issue**: Zustand's persisted localStorage data contained the old snake_case format
4. **Hydration timing**: On page load, Zustand hydrated from localStorage with `entity_type` (undefined for `entityType`), causing the artist check to fail initially

## Console Logs Showed

```
[Tours] Active Profile: {...}
[Tours] entityType: undefined  ❌ Missing!
[Tours] entity_type: artist    ✅ Present but wrong format
[Tours] isArtist: false        ❌ Check failed
```

## Solution

### 1. Added Migration to Zustand Store (`src/store/useProfileStore.ts`)

```typescript
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      activeProfile: null,
      setActiveProfile: (profile: Entity | null) => {
        // Transform snake_case to camelCase if needed
        if (profile && (profile as any).entity_type && !profile.entityType) {
          const transformed: Entity = {
            ...profile,
            entityType: (profile as any).entity_type,
            administratorId: (profile as any).administrator_id || profile.administratorId,
          };
          set({ activeProfile: transformed });
        } else {
          set({ activeProfile: profile });
        }
      },
    }),
    {
      name: 'profile-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Migrate old snake_case data to camelCase
        if (persistedState?.activeProfile && (persistedState.activeProfile as any).entity_type) {
          const oldProfile = persistedState.activeProfile;
          persistedState.activeProfile = {
            ...oldProfile,
            entityType: oldProfile.entity_type,
            administratorId: oldProfile.administrator_id || oldProfile.administratorId,
          };
        }
        return persistedState;
      },
    }
  )
);
```

**What this does:**
- **Migration function**: Automatically transforms old persisted data from snake_case to camelCase when loading from localStorage
- **setActiveProfile transformation**: Ensures any new data being saved is also transformed to camelCase
- **Version tracking**: Adds version number for future migrations if needed

### 2. Added Loading State to Tours Page (`src/app/tours/page.tsx`)

```typescript
// Show loading while session or profile is loading
const isLoadingAuth = status === 'loading' || (!activeProfile && status === 'authenticated');

// Promoter guard - but show loading state first
if (isLoadingAuth) {
  return (
    <div className="border-l w-full p-8">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
```

**What this does:**
- Prevents showing "Artist Feature Only" message while auth/profile is initializing
- Shows "Loading..." instead during the brief hydration period
- Only performs the artist check after profile is fully loaded

### 3. Kept Fallback Check

```typescript
const isArtist = activeProfile?.entityType === 'artist' ||
  (activeProfile as any)?.entity_type === 'artist';
```

**What this does:**
- Checks for both `entityType` (camelCase) and `entity_type` (snake_case)
- Provides backward compatibility in case any old data slips through
- Defense-in-depth approach

## Result

After the fix:
```
[Tours] Active Profile: {...}
[Tours] entityType: artist     ✅ Properly transformed!
[Tours] entity_type: artist    ✅ Still available as fallback
[Tours] isArtist: true         ✅ Check passes
```

## Benefits

1. ✅ **Automatic migration**: Old localStorage data is transformed on app load
2. ✅ **No manual clearing needed**: Users don't need to clear localStorage
3. ✅ **Future-proof**: Version tracking allows for future schema changes
4. ✅ **Better UX**: Loading state prevents confusing flash of wrong content
5. ✅ **Type safety**: Frontend uses proper TypeScript camelCase naming

## Files Modified

- `/src/store/useProfileStore.ts` - Added migration and transformation logic
- `/src/app/tours/page.tsx` - Added loading state and cleaned up logs
- `/src/components/sidenav/SidebarEntities.tsx` - Already had transformation (from previous fix)

## Testing

1. Navigate to `/tours` as artist user → Should see tours page immediately (after brief "Loading...")
2. Navigate to `/tours` as promoter user → Should see "Artist Feature Only" message
3. Check localStorage → Should see `entityType` in camelCase format
4. Old data automatically migrates without manual intervention

## Related Fixes

This builds on the previous snake_case fix documented in:
- `SNAKE_CASE_FIX.md` - Added entity_type fallback check
- `ALL_ISSUES_FIXED.md` - Documented the original snake_case vs camelCase issue
