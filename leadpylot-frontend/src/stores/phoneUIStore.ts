import { create } from 'zustand';

interface PhoneUIState {
  isOpen: boolean;
  setPhoneUIState: (state: Partial<PhoneUIState>) => void;
  contactName: string | null;
  leadId: string | null;
  projectId: string | null;
  selectedOutput: string;
  selectedRinging: string;
}

export const usePhoneUIStore = create<PhoneUIState>((set) => ({
  isOpen: false,
  setPhoneUIState: (state) => set((oldState) => ({ ...oldState, ...state })),
  contactName: null,
  leadId: null,
  projectId: null,
  selectedOutput: 'default',
  selectedRinging: 'default',
}));
