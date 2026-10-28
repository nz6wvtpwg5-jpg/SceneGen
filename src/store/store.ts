import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Entity {
  id: string;
  name: string;
  entityType: string;
}

interface StoreState {
  activeProfile: Entity | null;
  setActiveProfile: (profile: Entity | null) => void;
}

const useStore = create<StoreState>()(
  persist(
    (set) => ({
      activeProfile: null,
      setActiveProfile: (profile) => set({ activeProfile: profile }),
    }),
    {
      name: 'scenegen-storage',
    }
  )
);

export default useStore;
