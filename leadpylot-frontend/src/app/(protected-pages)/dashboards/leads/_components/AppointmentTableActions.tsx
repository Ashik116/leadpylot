'use client';

import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { Appointment, useDeleteAppointment } from '@/hooks/useAppointments';
import { useAppointmentDialogStore } from '@/stores/appointmentDialogStore';
import ConfirmPopover from '@/components/shared/ConfirmPopover';

interface AppointmentTableActionsProps {
  appointment: Appointment;
  leadId: string;
}

const AppointmentTableActions = ({ appointment, leadId }: AppointmentTableActionsProps) => {
  const { openEditDialog } = useAppointmentDialogStore();
  const { mutate: deleteAppointment, isPending: isDeleting } = useDeleteAppointment();

  const handleEdit = () => {
    openEditDialog(appointment as any, leadId);
  };

  return (
    <div className="flex items-center gap-2">
      {/* <Button
        onClick={handleEdit}
        size="xs"
        variant="plain"
        className="rounded-md p-1 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
        title="Edit Appointment"
        icon={<ApolloIcon name="pen" className="text-base" />}
      /> */}
      {/* Delete button commented out - uncomment to restore */}
      <ConfirmPopover
        title="Delete appointment"
        description="Are you sure you want to delete this appointment? This cannot be undone."
        confirmText="Delete"
        onConfirm={() => deleteAppointment(appointment._id)}
        isLoading={isDeleting}
        placement="left"
        floatingClassName="!z-[100003]"
      >
        <Button
          onClick={(e) => e.stopPropagation()}
          size="xs"
          variant="plain"
          disabled={isDeleting}
          className="rounded-md p-1 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
          title="Delete Appointment"
          icon={<ApolloIcon name="trash" className="text-base" />}
        />
      </ConfirmPopover>
    </div>
  );
};

export default AppointmentTableActions;
