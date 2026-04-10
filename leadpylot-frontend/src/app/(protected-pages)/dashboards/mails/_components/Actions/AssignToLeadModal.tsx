'use client';

/**
 * AssignToLeadModal Component
 * Modal for assigning emails to leads with search
 *
 * Refactored to use modular hooks and components for better maintainability
 */

import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Lead } from '@/services/LeadsService';
import { useLeadSearch } from '../../_hooks/useLeadSearch';
import { useEmailAssignment } from '../../_hooks/useEmailAssignment';
import {
  ModalHeader,
  LeadSearchInput,
  LeadList,
  SelectedLeadCard,
  AssignmentFormFields,
  ModalFooter,
} from './AssignToLeadModal/index';

interface AssignToLeadModalProps {
  emailId: string;
  emailSubject?: string;
  emailFrom?: string;
  onClose: () => void;
}

export default function AssignToLeadModal({
  emailId,
  emailSubject,
  emailFrom,
  onClose,
}: AssignToLeadModalProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  // Custom hooks for search and assignment
  const { searchTerm, setSearchTerm, debouncedSearchTerm, leads, isLoading, hasResults } =
    useLeadSearch({
      initialSearchTerm: emailFrom || '',
      debounceMs: 500,
      minSearchLength: 2,
      limit: 10,
    });

  const { assignEmail, isAssigning } = useEmailAssignment({
    emailId,
    onSuccess: onClose,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) {
      return;
    }
    assignEmail({ lead: selectedLead, reason, comments });
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onClose();
  };

  return (
    <Dialog
      isOpen={true}
      onClose={handleClose}
      width={800}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      shouldFocusAfterRender={true}
      shouldReturnFocusAfterClose={false}
    >
      <div
        className="flex max-h-[85vh] flex-col"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ModalHeader emailSubject={emailSubject} emailFrom={emailFrom} />

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-2 py-6">
          <LeadSearchInput value={searchTerm} onChange={setSearchTerm} />

          {hasResults && (
            <LeadList
              leads={leads}
              selectedLeadId={selectedLead?._id}
              onSelectLead={setSelectedLead}
              isLoading={isLoading}
              searchTerm={debouncedSearchTerm}
            />
          )}

          {selectedLead && <SelectedLeadCard lead={selectedLead} />}

          <AssignmentFormFields
            reason={reason}
            comments={comments}
            onReasonChange={setReason}
            onCommentsChange={setComments}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="plain" onClick={handleClose} disabled={isAssigning}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              disabled={isAssigning || !selectedLead}
              loading={isAssigning}
              icon={<ApolloIcon name="user-check" />}
            >
              {isAssigning ? 'Assigning...' : 'Assign to Lead'}
            </Button>
          </div>
        </form>

        <ModalFooter />
      </div>
    </Dialog>
  );
}
