'use client';

/**
 * EmailDetailsModal Component
 * Modal showing email details with blur background (same as openings modal)
 */

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Dialog from '@/components/ui/Dialog';
import Spinner from '@/components/ui/Spinner';
import { EmailConversation } from '../../_types/email.types';
import AssignToLeadModal from '../Actions/AssignToLeadModal';
import LeadDetailsForMail from './LeadDetailsForMail';
import UpdatesFilterTabs from '@/app/(protected-pages)/dashboards/leads/[id]/_components/RightSidebar/UpdatesFilterTabs';
import EmailDetail from '../EmailLayout/EmailDetail';
import TicketModal from '@/app/(protected-pages)/dashboards/leads/[id]/_components/TicketModal';
import PinnedEmailView from './PinnedEmailView';
import LeadDetailsPage from '../../../leads/[id]/page';

interface EmailDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: EmailConversation | null;
  slotDocuments?: any[];
  slotTitle?: string;
}

export default function EmailDetailsModal({
  isOpen,
  onClose,
  conversation,
  slotDocuments = [],
  slotTitle,
}: EmailDetailsModalProps) {
  const [cachedConversation, setCachedConversation] = useState<EmailConversation | null>(
    () => conversation
  );
  const [showAssignLeadModal, setShowAssignLeadModal] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Update cache when conversation is available, but keep cached if current becomes null
  const displayConversation = useMemo(() => {
    if (conversation) {
      // Update cached conversation when we have a new one
      if (conversation !== cachedConversation) {
        // Use setTimeout to avoid render-time state update warning
        setTimeout(() => setCachedConversation(conversation), 0);
      }
      return conversation;
    }
    // Use cached conversation if current is null (during refetch)
    return cachedConversation;
  }, [conversation, cachedConversation]);

  // Handle successful lead assignment - invalidate queries to refresh conversation data
  const handleAssignLeadSuccess = useCallback(() => {
    setShowAssignLeadModal(false);
    // Invalidate email conversations to refresh the conversation prop with new lead_id
    queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
    if (displayConversation?._id) {
      queryClient.invalidateQueries({ queryKey: ['email-detail', displayConversation._id] });
    }
  }, [queryClient, displayConversation]);

  // Extract lead ID from conversation
  const leadId = useMemo(() => {
    if (!displayConversation) return undefined;
    return typeof displayConversation.lead_id === 'string'
      ? displayConversation.lead_id
      : displayConversation.lead_id?._id || undefined;
  }, [displayConversation]);

  // Check if email is assigned to a lead
  const isAssigned = !!leadId;

  // Show loading if we don't have a conversation yet (but modal is open)
  if (!displayConversation) {
    return (
      <Dialog isOpen={isOpen} onClose={onClose} height="90vh" className="min-w-[90vw]">
        <div className="flex h-full items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        height="91vh"
        className={` ${slotTitle ? 'max-w-5xl' : 'min-w-[90vw]'}`}
      >
        {slotTitle && displayConversation ? (
          // Slot Details: Show simplified PinnedEmailView
          <PinnedEmailView
            conversation={displayConversation}
            slotTitle={slotTitle}
            slotDocuments={slotDocuments}
          />
        ) : isAssigned ? (
          // Assigned: Show split view (Left: Lead Details, Right: Updates)
          <LeadDetailsPage leadId={leadId} showInDialog={true} />
        ) : (
          // Not Assigned: Show full-width Email Details with title and Assign to Lead button
          <div className="flex h-full flex-col overflow-hidden">
            {/* Header with Title and Assign to Lead Button */}
            {/* <h2 className="text-xl font-semibold text-gray-900 px-2">Email Details</h2> */}
            {/* Full-width Email Details */}
            <div className="flex-1 overflow-auto">
              {displayConversation && (
                <EmailDetail conversation={displayConversation} hideBackButton={true} forEmail={true} />
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Assign to Lead Modal */}
      {showAssignLeadModal && displayConversation && (
        <AssignToLeadModal
          emailId={displayConversation._id}
          emailSubject={displayConversation.subject}
          emailFrom={
            displayConversation.participants?.[0]?.email || displayConversation.lead_id?.email_from
          }
          onClose={handleAssignLeadSuccess}
        />
      )}

      {/* Create Task / Ticket Modal — same as OpeningDetailsPopup */}
      {leadId && displayConversation && (
        <TicketModal
          isOpen={isTicketModalOpen}
          onClose={() => setIsTicketModalOpen(false)}
          leadId={leadId}
          offers={[]}
          taskType="email"
          emailId={displayConversation._id}
        />
      )}
    </>
  );
}
