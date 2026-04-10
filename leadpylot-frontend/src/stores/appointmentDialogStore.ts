import { create } from 'zustand';
import { Appointment } from '@/hooks/useAppointments';

interface AppointmentDialogState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  appointmentData: Appointment | null;
  leadId: string | null;
  selectedDate: Date | null;
  onEditSuccess: (() => void) | null;

  // Actions
  openCreateDialog: (leadId: string, selectedDate?: Date) => void;
  openEditDialog: (appointment: Appointment, leadId: string, onEditSuccess?: () => void) => void;
  closeDialog: () => void;
  reset: () => void;
}

export const useAppointmentDialogStore = create<AppointmentDialogState>((set) => ({
  // Initial state
  isOpen: false,
  mode: 'create',
  appointmentData: null,
  leadId: null,
  selectedDate: null,
  onEditSuccess: null,

  // Actions
  openCreateDialog: (leadId: string, selectedDate?: Date) => {
    set({
      isOpen: true,
      mode: 'create',
      appointmentData: null,
      leadId,
      selectedDate: selectedDate || null,
    });
  },

  openEditDialog: (appointment: Appointment, leadId: string, onEditSuccess?: () => void) => {
    set({
      isOpen: true,
      mode: 'edit',
      appointmentData: appointment,
      leadId,
      selectedDate: null,
      onEditSuccess: onEditSuccess ?? null,
    });
  },

  closeDialog: () => {
    set({
      isOpen: false,
      mode: 'create',
      appointmentData: null,
      leadId: null,
      selectedDate: null,
      onEditSuccess: null,
    });
  },

  reset: () => {
    set({
      isOpen: false,
      mode: 'create',
      appointmentData: null,
      leadId: null,
      selectedDate: null,
      onEditSuccess: null,
    });
  },
}));
