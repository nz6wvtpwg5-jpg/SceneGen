import { create } from 'zustand';

interface CountRefreshStore {
  tourRefreshTrigger: number;
  showRefreshTrigger: number;
  refreshTours: () => void;
  refreshShows: () => void;
}

export const useCountRefreshStore = create<CountRefreshStore>((set) => ({
  tourRefreshTrigger: 0,
  showRefreshTrigger: 0,
  refreshTours: () => set((state) => ({ tourRefreshTrigger: state.tourRefreshTrigger + 1 })),
  refreshShows: () => set((state) => ({ showRefreshTrigger: state.showRefreshTrigger + 1 })),
}));
