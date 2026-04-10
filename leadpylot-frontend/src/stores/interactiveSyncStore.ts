import { create } from 'zustand';
import type {
  InteractiveSyncStatus,
  InteractiveSyncProgressUpdate,
} from '@/services/emailSystem/EmailSystemService';

type InteractiveSyncUiState = {
  modalOpen: boolean;
  minimized: boolean;
  lastStatus: InteractiveSyncStatus | null;
  lastRealtime: InteractiveSyncProgressUpdate | null;
};

type InteractiveSyncActions = {
  openModal: () => void;
  closeModal: () => void;
  minimizeToHeader: () => void;
  clearMinimize: () => void;
  setStatus: (status: InteractiveSyncStatus | null) => void;
  setRealtime: (data: InteractiveSyncProgressUpdate | null) => void;
};

type InteractiveSyncStore = InteractiveSyncUiState & InteractiveSyncActions;

export const useInteractiveSyncStore = create<InteractiveSyncStore>((set) => ({
  modalOpen: false,
  minimized: false,
  lastStatus: null,
  lastRealtime: null,
  openModal: () => set({ modalOpen: true, minimized: false }),
  closeModal: () => set({ modalOpen: false }),
  minimizeToHeader: () => set({ minimized: true, modalOpen: false }),
  clearMinimize: () => set({ minimized: false }),
  setStatus: (status) => set({ lastStatus: status }),
  setRealtime: (data) => set({ lastRealtime: data }),
}));

// Derived helpers
export function computeProgressPercentage(status?: InteractiveSyncStatus | null): number {
  if (!status?.progress?.totalEmails) return 0;
  const { processedEmails, totalEmails } = status.progress;
  if (!totalEmails) return 0;
  return Math.round((processedEmails / totalEmails) * 100);
}
