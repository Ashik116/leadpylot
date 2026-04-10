import { useCallback, useState } from 'react';
import { Appointment, useAppointmentsByLead, useDeleteAppointment } from '@/hooks/useAppointments';
import { useAppointmentDialogStore } from '@/stores/appointmentDialogStore';

interface UseMeetingTableActionsParams {
  leadId: string;
}

export function useMeetingTableActions({ leadId }: UseMeetingTableActionsParams) {
  const [selectedItems, setSelectedItems] = useState<Appointment[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);

  const { data: appointments, isLoading } = useAppointmentsByLead(leadId, {
    limit: 80,
  });
  const { openEditDialog } = useAppointmentDialogStore();
  const { mutateAsync: deleteAppointment, isPending: isDeleting } = useDeleteAppointment();

  const handleSelectedRowsChange = useCallback((rows: any) => {
    setSelectedItems(Array.isArray(rows) ? rows : []);
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedItems(appointments?.data || []);
  }, [appointments?.data]);

  const handleBulkEdit = useCallback(() => {
    if (selectedItems.length !== 1) return;
    openEditDialog(selectedItems[0], leadId, () => {
      setSelectedItems([]);
      setSelectionResetKey((k) => k + 1);
    });
  }, [selectedItems, leadId, openEditDialog]);

  const handleBulkDelete = useCallback(async () => {
    await Promise.all(selectedItems.map((item) => deleteAppointment(item._id?.toString() ?? '')));
    setSelectionResetKey((k) => k + 1);
    setSelectedItems([]);
  }, [selectedItems, deleteAppointment]);

  return {
    selectedItems,
    selectionResetKey,
    appointments,
    isLoading,
    isDeleting,
    handleSelectedRowsChange,
    handleSelectAll,
    handleBulkEdit,
    handleBulkDelete,
  };
}
