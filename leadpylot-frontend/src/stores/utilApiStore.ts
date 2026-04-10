import { create } from 'zustand';

interface UtilApiState {
    pendingTaskCount: number;
    setPendingTaskCount: (count: number) => void;
}

export const useUtilApiStore = create<UtilApiState>((set) => ({
    pendingTaskCount: 0,
    setPendingTaskCount: (count) => set({ pendingTaskCount: count }),
}));

