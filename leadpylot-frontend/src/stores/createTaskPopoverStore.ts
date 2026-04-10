import { create } from 'zustand';

interface CreateTaskPopoverState {
  isOpen: boolean;
  leadId: string | undefined;
  taskType: string | undefined;

  open: (options?: { leadId?: string; taskType?: string }) => void;
  close: () => void;
}

export const useCreateTaskPopoverStore = create<CreateTaskPopoverState>((set) => ({
  isOpen: false,
  leadId: undefined,
  taskType: undefined,

  open: (options) =>
    set({
      isOpen: true,
      leadId: options?.leadId,
      taskType: options?.taskType ?? 'lead',
    }),

  close: () =>
    set({
      isOpen: false,
      leadId: undefined,
      taskType: undefined,
    }),
}));
