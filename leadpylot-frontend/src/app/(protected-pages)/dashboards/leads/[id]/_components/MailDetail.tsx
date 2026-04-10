'use client';

import Card from '@/components/ui/Card';

import {
  useEmailSystemEmail,
  useAgentEmail,
  // useApproveEmailContent,
  // useRejectEmailContent,
  // useApproveEmailAttachments,
  // useRejectEmailAttachments,
} from '@/services/hooks/useEmailSystem';
import { useSession } from '@/hooks/useSession';
// import { useQueryClient } from '@tanstack/react-query';

import { Email } from '../emailTypes/types';
import { mapEmailSystemToEmails } from './mailtabs/utils';
import EmailHeader from './mailtabs/EmailHeader';
import EmailBody from './mailtabs/EmailBody';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';

// Custom components
import LoadingState from './mailtabs/LoadingState';
import EmptyState from './mailtabs/EmptyState';
// import EmailError from './EmailError';

import { THandleQuickAction } from './mailtabs/useMailData';
// import EmailAttachment from './EmailAttachment';
import LeadSelectionModal from '../../../documents/components/LeadSelectionModal';
import { useCallback, useState, useEffect } from 'react';
import { Lead } from '@/services/LeadsService';
import ReplyEditor from './mailtabs/ReplyEditor';
import { Role } from '@/configs/navigation.config/auth.route.config';
import ImagePreviewService from '@/server/ImagePreviewService';

interface MailDetailProps {
  emailId: string;
  closeSidebar: () => void;
  handleQuickApproveContent?: ({ emailId, isApprove, attachments }: THandleQuickAction) => void;
  onRejectShowModal: (email: Email) => void;
  handleAssignEmailToLead: ({
    emailId,
    leadId,
    reason,
    comments,
  }: {
    emailId: string;
    leadId: string;
    reason?: string;
    comments?: string;
  }) => void;
  updateEmailViewStatus?: (emailId: string, isAdminView: boolean) => void;
  onPrevEmail?: () => void;
  onNextEmail?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const MailDetail = ({
  emailId,
  closeSidebar,
  handleQuickApproveContent,
  onRejectShowModal,
  handleAssignEmailToLead,
  updateEmailViewStatus,
  onPrevEmail,
  onNextEmail,
  hasPrev,
  hasNext,
}: MailDetailProps) => {
  const { data: session } = useSession();
  // const queryClient = useQueryClient();
  const isAgent = session?.user?.role === Role.AGENT;
  const isAdmin = session?.user?.role === Role.ADMIN;

  // Simple state for lead assignment modal
  const [showLeadSelectionModal, setShowLeadSelectionModal] = useState(false);
  const [currentEmailForLead, setCurrentEmailForLead] = useState<Email | null>(null);

  // Email data hooks
  const { data: emailSystemData, isLoading: isEmailSystemLoading } = useEmailSystemEmail(
    isAdmin ? emailId : ''
  );
  // Agent DATA hOOK
  const { data: agentEmailData, isLoading: isAgentEmailLoading } = useAgentEmail(
    isAgent ? emailId : ''
  );
  // Reply editor controlled locally
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const openReply = useCallback(() => setIsReplyOpen((prev) => !prev), []);

  // Document preview hook - using existing hook instead of custom implementation
  const documentPreview = useDocumentPreview();

  // Convert email system data to email format
  let email: Email | null = null;
  let combinedLoading = false;

  const newSystemEmail = isAdmin ? emailSystemData : agentEmailData;
  const newSystemLoading = isAdmin ? isEmailSystemLoading : isAgentEmailLoading;

  if (newSystemEmail) {
    const mappedEmails = mapEmailSystemToEmails({ data: [newSystemEmail] } as any, session);
    email = mappedEmails[0] || null;
  }
  combinedLoading = newSystemLoading;

  // Update email view status when email detail is loaded
  useEffect(() => {
    if (email && !combinedLoading && updateEmailViewStatus) {
      const shouldUpdateViewStatus =
        (isAdmin && !email.admin_viewed) || (isAgent && !email.agent_viewed);

      if (shouldUpdateViewStatus) {
        updateEmailViewStatus(email.id, isAdmin);
      }
    }
  }, [email, combinedLoading, isAdmin, isAgent, updateEmailViewStatus]);

  // Handle document preview using the existing hook

  // Lead selection modal handlers
  const handleAssignLead = useCallback((email: Email) => {
    setCurrentEmailForLead(email);
    setShowLeadSelectionModal(true);
  }, []);

  const handleLeadSelect = useCallback(
    async (lead: Lead) => {
      if (!currentEmailForLead || !lead._id) {
        console.error('Missing email or lead data');
        return;
      }

      try {
        await handleAssignEmailToLead({
          emailId: currentEmailForLead.id,
          leadId: lead._id,
          comments: `Assigned lead: ${lead.contact_name} (${lead.lead_source_no})`,
        });

        // Close modal on success - React Query will auto-update the data
        setShowLeadSelectionModal(false);
        setCurrentEmailForLead(null);

        console.log(
          'Successfully assigned lead:',
          lead.contact_name,
          'to email:',
          currentEmailForLead.subject
        );
      } catch (error) {
        console.error('Failed to assign lead:', error);
        // Keep modal open on error so user can retry
      }
    },
    [currentEmailForLead, handleAssignEmailToLead]
  );

  const handleCloseLeadModal = useCallback(() => {
    setShowLeadSelectionModal(false);
    setCurrentEmailForLead(null);
  }, []);
  // Loading state
  if (combinedLoading) {
    return <LoadingState />;
  }

  // Empty state
  if (!email) {
    return <EmptyState onButtonClick={closeSidebar} />;
  }

  return (
    <div className="flex h-full flex-col">
      <Card
        className="mx-0 h-full flex-1 rounded-xl"
        bodyClass="h-full flex flex-col p-2 sm:p-4 lg:p-6"
      >
        {/* Fixed Header */}
        <div className="shrink-0">
          <EmailHeader
            email={email}
            onBack={closeSidebar}
            notification={null}
            handleQuickApproveContent={handleQuickApproveContent}
            onRejectShowModal={onRejectShowModal}
            onAssignLead={handleAssignLead}
            onReply={openReply}
            onPrev={onPrevEmail}
            onNext={onNextEmail}
            hasPrev={!!hasPrev}
            hasNext={!!hasNext}
          />
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Admin approval controls */}
          {/* Email Body (expanded by default) */}
          <div className="max-h-max flex-1">
            <EmailBody
              email={email}
              onAttachmentClick={(attachment) =>
                ImagePreviewService({ attachment, usePreviewHook: documentPreview })
              }
            />
          </div>
        </div>
        <ReplyEditor
          isOpen={isReplyOpen}
          emailId={email.id}
          onClose={() => setIsReplyOpen(false)}
        />
      </Card>

      {/* Document Preview Dialog - using hook's dialogProps */}
      <DocumentPreviewDialog {...documentPreview.dialogProps} title="Email Attachment Preview" />

      {/* Assign Leads */}
      {/* Lead Selection Modal */}
      <LeadSelectionModal
        isOpen={showLeadSelectionModal}
        onClose={handleCloseLeadModal}
        onSelectLead={handleLeadSelect}
      />
    </div>
  );
};

export default MailDetail;
