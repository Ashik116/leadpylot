import { create } from 'zustand';

interface TDrawerState {
  isOpen: boolean;
  sidebarType: 'create' | 'edit' | 'changePassword' | 'telegram' | null;
  selectedId: string | null;
  sidebarKey: number;
  // Actions
  onOpenSidebar: () => void;
  onHandleSidebar: (serverId?: string, type?: 'create' | 'edit' | 'changePassword' | 'telegram') => void;
  resetDrawer: () => void;
  // resetOnRouteChange: () => void;
}

export const useDrawerStore = create<TDrawerState>((set, get) => ({
  isOpen: false,
  sidebarType: null,
  selectedId: null,
  sidebarKey: 0,
  onOpenSidebar: () => set({ isOpen: !get().isOpen }),
  resetDrawer: () =>
    set({ isOpen: false, sidebarType: null, selectedId: null, sidebarKey: get().sidebarKey + 1 }),
  onHandleSidebar: (serverId, type) =>
    set({
      selectedId: serverId || null,
      sidebarType: type || (serverId ? 'edit' : 'create'),
      isOpen: true,
      sidebarKey: get().sidebarKey + 1,
    }),
  // resetOnRouteChange: () => set({ isOpen: false, sidebarType: null, selectedId: null })
}));
