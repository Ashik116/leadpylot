'use client';

/**
 * EmailViewContent - Inline email view (replaces RightSidebar when email view data exists)
 * Renders the same content as EmailDetailsModal without the modal wrapper
 */

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Card from '@/components/ui/Card';
import { useEmailViewStore } from '@/stores/emailViewStore';
import LeadDetailsForMail from './LeadDetailsForMail';
import UpdatesFilterTabs from '@/app/(protected-pages)/dashboards/leads/[id]/_components/RightSidebar/UpdatesFilterTabs';
import EmailDetail from '../EmailLayout/EmailDetail';
import TicketModal from '@/app/(protected-pages)/dashboards/leads/[id]/_components/TicketModal';
import PinnedEmailView from './PinnedEmailView';
import AssignToLeadModal from '../Actions/AssignToLeadModal';

interface EmailViewContentProps {
  currentOfferId?: string;
  isShareable?: boolean;
  /** When true, rendered inside DocumentSlotViewer dialog - prevents row clicks from opening OpeningDetailsPopup */
  embeddedInDialog?: boolean;
  /** When provided, called on close/back - ensures parent modal closes (e.g. from DocumentSlotViewer) */
  onClose?: () => void;
  /** Tailwind padding class(es) forwarded to PinnedEmailView content wrapper (e.g. 'p-2') */
  contentPadding?: string;
}

export default function EmailViewContent({
  currentOfferId,
  isShareable = false,
  embeddedInDialog = false,
  onClose,
  contentPadding,
}: EmailViewContentProps) {
  const { data, clearEmailView } = useEmailViewStore();
  const [cachedConversation, setCachedConversation] = useState(data?.conversation ?? null);
  const [showAssignLeadModal, setShowAssignLeadModal] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const conversation = data?.conversation ?? null;
  const slotTitle = data?.slotTitle ?? '';
  const slotDocuments = data?.slotDocuments ?? [];

  const displayConversation = useMemo(() => {
    if (conversation) {
      if (conversation !== cachedConversation) {
        setTimeout(() => setCachedConversation(conversation), 0);
      }
      return conversation;
    }
    return cachedConversation;
  }, [conversation, cachedConversation]);

  const handleAssignLeadSuccess = useCallback(() => {
    setShowAssignLeadModal(false);
    queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
    if (displayConversation?._id) {
      queryClient.invalidateQueries({ queryKey: ['email-detail', displayConversation._id] });
    }
  }, [queryClient, displayConversation]);

  const leadId = useMemo(() => {
    if (!displayConversation) return undefined;
    return typeof displayConversation.lead_id === 'string'
      ? displayConversation.lead_id
      : displayConversation.lead_id?._id || undefined;
  }, [displayConversation]);

  const isAssigned = !!leadId;

  if (!data || !displayConversation) {
    return null;
  }

  return (
    <>
      <Card
        className="flex h-full min-h-0 flex-col overflow-hidden"
        bodyClass="flex h-full min-h-0 flex-col overflow-hidden p-0"
      >
        {/* Header with Close button */}
        {!isShareable ? null : <div className="flex items-center justify-between border-b border-gray-200 py-1.5 pr-10 pl-2">
          <Button
            size="xs"
            variant="plain"
            onClick={() => {
              clearEmailView();
              onClose?.();
            }}
            className="flex items-center gap-1"
            icon={<ApolloIcon name="arrow-left" className="text-sm" />}
          >
            Back
          </Button>
          <span className="text-sm font-medium text-gray-700">{slotTitle || 'Email Details'}</span>
        </div>}
        {/* Content - same structure as EmailDetailsModal */}
        <div className="min-h-0 flex-1 overflow-auto">
          {slotTitle && displayConversation ? (
            <PinnedEmailView
              conversation={displayConversation}
              slotTitle={slotTitle}
              slotDocuments={slotDocuments}
              embeddedInDialog={embeddedInDialog}
              contentPadding={contentPadding}
            />
          ) : isAssigned ? (
            <div className="grid h-full grid-cols-2 overflow-hidden">
              <div className="overflow-y-auto border-r border-gray-200 pr-3">
                <LeadDetailsForMail
                  conversation={displayConversation}
                  showCreateTaskButton={true}
                  onCreateTaskClick={() => setIsTicketModalOpen(true)}
                />
              </div>
              <div className="flex h-full flex-col overflow-hidden">
                {leadId ? (
                  <UpdatesFilterTabs
                    leadId={leadId}
                    leadExpandView={false}
                    conversation={displayConversation}
                    taskType="email"
                  />
                ) : (
                  <div className="flex h-full flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto">
                      <EmailDetail
                        conversation={displayConversation}
                        currentOfferId={currentOfferId}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                <EmailDetail
                  conversation={displayConversation}
                  hideBackButton={true}
                  currentOfferId={currentOfferId}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

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
