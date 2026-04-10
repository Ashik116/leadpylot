'use client';

import React from 'react';
import dayjs from 'dayjs';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Appointment, useDeleteAppointment } from '@/hooks/useAppointments';
import { useAppointmentDialogStore } from '@/stores/appointmentDialogStore';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useState } from 'react';

interface AppointmentBadgeListProps {
  appointments: Appointment[];
  leadId: string;
}

const AppointmentBadgeList = ({ appointments, leadId }: AppointmentBadgeListProps) => {
  const { openEditDialog } = useAppointmentDialogStore();
  const { mutate: deleteAppointment, isPending: isDeleting } = useDeleteAppointment();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!appointments || appointments.length === 0) return null;

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteAppointment(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="flex items-end gap-2 rounded-lg bg-blue-50 px-3 py-2">
      <div className="flex">
        <div className="flex items-center gap-1 text-xs font-medium text-blue-900">
          <ApolloIcon name="calendar" className="text-blue-600" />
          <span>Termin At :</span>
        </div>
        <div className="ml-2 flex flex-wrap gap-1">
          {appointments.map((appointment) => {
            const isUpcoming = dayjs(appointment?.appointment_date).isAfter(dayjs());
            const isToday = dayjs(appointment?.appointment_date).isSame(dayjs(), 'day');

            const handleEditClick = () => {
              openEditDialog(appointment as any, leadId);
            };

            return (
              <div
                key={appointment?._id}
                className={`group relative inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-md ${
                  isToday
                    ? 'bg-green-100 text-green-800'
                    : isUpcoming
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                <button
                  onClick={handleEditClick}
                  className="cursor-pointer"
                  title={`Click to edit appointment: ${appointment?.title || 'Untitled'}`}
                >
                  {dayjs(appointment?.appointment_date).format('MMM DD, YYYY')}
                </button>
                <button
                  onClick={(e) => handleDeleteClick(e, appointment._id)}
                  disabled={isDeleting}
                  className="ml-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
                  title="Delete appointment"
                >
                  <ApolloIcon name="trash" className="text-[10px]" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Appointment"
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      >
        <p>Are you sure you want to delete this appointment? This action cannot be undone.</p>
      </ConfirmDialog>
    </div>
  );
};

export default AppointmentBadgeList;
