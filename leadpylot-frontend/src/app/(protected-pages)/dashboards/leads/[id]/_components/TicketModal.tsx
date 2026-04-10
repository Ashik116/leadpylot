'use client';

import TicketForm from '@/components/shared/TicketForm/TicketForm';
import Dialog from '@/components/ui/Dialog';
import { useEffect } from 'react';
import type { TicketModalProps } from './TicketModal.types';
import { useTicketModal } from './hooks/useTicketModal';

export default function TicketModal({
  isOpen,
  onClose,
  leadId,
  offers = [],
  opening,
  dashboardType,
  taskType,
  emailId,
}: TicketModalProps) {
  const { handleDiscard, resetForm } = useTicketModal({
    isOpen,
    leadId,
    onClose,
    offers,
    opening,
    dashboardType,
    taskType,
    emailId,
  });



  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  return (
    <Dialog isOpen={isOpen} onClose={handleDiscard} width={900}>
      <div className="flex max-h-[65dvh] flex-col">
        <div className="shrink-0 border-b border-gray-200 px-1 pb-2">
          <h6>Create Task</h6>
        </div>

        {/* Main Content */}
        <TicketForm
          leadId={leadId}
          emailId={emailId}
          offers={offers}
          opening={opening}
          dashboardType={dashboardType}
          variant="modal"
          taskType={taskType}
          isOpen={isOpen}
          onClose={onClose}
        />
      </div>
    </Dialog>
  );
}
