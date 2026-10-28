import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Entity {
  id: string;
  name: string;
  entityType: string;
  administratorId: string;  // Week 1, Task 1.5: Added for ownership check
  membershipRole?: 'owner' | 'admin' | 'editor' | 'viewer' | 'provisional_agent';
  city?: string;
  country?: string;
  latitude?: number;  // Week 5, Task 5.2: Geolocation
  longitude?: number; // Week 5, Task 5.2: Geolocation
  trialEndsAt?: string; // Week 3: Trial expiry
}

interface ProfileState {
  activeProfile: Entity | null;
  ownerUserId: string | null;
  setActiveProfile: (profile: Entity | null) => void;
  bindUser: (userId: string | null) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      activeProfile: null,
      ownerUserId: null,
      setActiveProfile: (profile: Entity | null) => {
        // Transform snake_case to camelCase if needed
        if (profile && (profile as any).entity_type && !profile.entityType) {
          const transformed: Entity = {
            ...profile,
            entityType: (profile as any).entity_type,
            administratorId: (profile as any).administrator_id || profile.administratorId,
            membershipRole: (profile as any).membership_role || profile.membershipRole,
          };
          set({ activeProfile: transformed });
        } else {
          set({ activeProfile: profile });
        }
      },
      bindUser: (userId: string | null) => set((state) => {
        if (state.ownerUserId === userId) return state;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('scenegen-storage');
          localStorage.removeItem('entityId');
        }
        return { ownerUserId: userId, activeProfile: null };
      }),
    }),
    {
      name: 'profile-storage',
      version: 2,
      skipHydration: true,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) return { activeProfile: null, ownerUserId: null };
        // Migrate old snake_case data to camelCase
        if (persistedState?.activeProfile && (persistedState.activeProfile as any).entity_type) {
          const oldProfile = persistedState.activeProfile;
          persistedState.activeProfile = {
            ...oldProfile,
            entityType: oldProfile.entity_type,
            administratorId: oldProfile.administrator_id || oldProfile.administratorId,
            membershipRole: oldProfile.membership_role || oldProfile.membershipRole,
          };
        }
        return persistedState;
      },
    }
  )
);
