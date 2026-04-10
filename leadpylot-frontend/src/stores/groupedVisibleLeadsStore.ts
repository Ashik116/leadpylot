import { create } from 'zustand';

interface GroupedVisibleLeadsState {
  visibleLeadsByGroup: Record<string, any[]>;
  setVisibleLeadsForGroup: (groupId: string, leads: any[]) => void;
  removeVisibleLeadsForGroup: (groupId: string) => void;
  clearAllVisibleLeads: () => void;
  getVisibleLeads: () => any[];
}

export const useGroupedVisibleLeadsStore = create<GroupedVisibleLeadsState>((set, get) => ({
  visibleLeadsByGroup: {},

  setVisibleLeadsForGroup: (groupId, leads) =>
    set((state) => ({
      visibleLeadsByGroup: {
        ...state.visibleLeadsByGroup,
        [groupId]: Array.isArray(leads) ? leads : [],
      },
    })),

  removeVisibleLeadsForGroup: (groupId) =>
    set((state) => {
      const next = { ...state.visibleLeadsByGroup };
      delete next[groupId];
      return { visibleLeadsByGroup: next };
    }),

  clearAllVisibleLeads: () => set({ visibleLeadsByGroup: {} }),

  getVisibleLeads: () => {
    const seen = new Set<string>();
    const flattened: any[] = [];

    Object.values(get().visibleLeadsByGroup).forEach((leads = []) => {
      leads?.forEach((lead: any) => {
        const id = lead?._id?.toString();
        if (id && !seen.has(id)) {
          seen.add(id);
          flattened.push(lead);
        }
      });
    });

    return flattened;
  },
}));
