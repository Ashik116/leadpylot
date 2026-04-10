import { create } from 'zustand';
import { Lead } from '@/services/LeadsService';

interface AssignmentModalState {
  // State
  selectedLead: Lead | null;
  isOpen: boolean;

  // Actions
  openAssignmentModal: (lead: Lead) => void;
  closeAssignmentModal: () => void;
  setSelectedLead: (lead: Lead | null) => void;
}

export const useAssignmentModalStore = create<AssignmentModalState>((set, get) => ({
  // Initial state
  selectedLead: null,
  isOpen: false,

  // Actions
  openAssignmentModal: (lead: Lead) => {
    const currentState = get();
    // Prevent opening if already open to avoid React-Modal conflicts
    if (currentState.isOpen) {
      return;
    }
    set({
      selectedLead: lead,
      isOpen: true,
    });
  },

  closeAssignmentModal: () => {
    set({
      selectedLead: null,
      isOpen: false,
    });
  },

  setSelectedLead: (lead: Lead | null) => {
    set({ selectedLead: lead });
  },
}));
