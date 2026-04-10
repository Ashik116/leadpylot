'use client';

/**
 * EmailDetail Component - Missive-Style
 * Right panel showing full email conversation with internal comments
 */

import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import Notification from '@/components/ui/Notification';
import Spinner from '@/components/ui/Spinner';
import toast from '@/components/ui/toast';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import EmailDraftService from '@/services/emailSystem/EmailDraftService';
import { getDocumentPreviewType } from '@/utils/documentUtils';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAutoMarkAsViewed } from '../../_hooks/useAutoMarkAsViewed';
import { useEmailData, useEmailDetail } from '../../_hooks/useEmailData';
import { useEmailPresence, usePresence } from '../../_hooks/usePresence';
import { CommentAttachment } from '../../_types/comment.types';
import { EmailAttachment, EmailConversation } from '../../_types/email.types';
import AssignAgentModal from '../Actions/AssignAgentModal';
import AssignToLeadModal from '../Actions/AssignToLeadModal';
import CreateTaskModal from '../Actions/CreateTaskModal';
import ReplyEditor from '../Compose/ReplyEditor';
import ConversationHeader from '../Conversation/ConversationHeader';
import MessageThread from '../Conversation/MessageThread';
import { SlotPinningMenu } from '../EmailDetail/SlotPinningMenu';
import CollisionWarning from '../Presence/CollisionWarning';
import PresenceIndicators from '../Presence/PresenceIndicators';

interface EmailDetailProps {
  conversation: EmailConversation;
  hideBackButton?: boolean;
  showSingleEmail?: boolean; // If true, show only this email, not the thread
  /** When provided (e.g. embedded in EmailActivityCard), collapse button is shown in header and calls this */
  onCollapse?: () => void;
  /** When provided (e.g. from EmailActivityCard), thread toggle icon is shown in ConversationHeader */
  onToggleThreadView?: () => void;
  currentOfferId?: string;
  currentLeadId?: string;
  replyAll?: boolean;
  forEmail?: boolean;
  /** When true, hide Pin to Slot button (e.g. on mail page; show on lead details page) */
  hidePinning?: boolean;
}

export default function EmailDetail({
  conversation: cachedConversation,
  hideBackButton = false,
  showSingleEmail = false,
  onCollapse,
  onToggleThreadView,
  currentOfferId,
  currentLeadId,
  replyAll = true,
  forEmail = false,
  hidePinning = false,
}: EmailDetailProps) {
  const { startViewing, stopViewing } = usePresence();
  const searchParams = useSearchParams();
  const todoType = searchParams.get('todoType');

  // Fetch fresh email data using the detail endpoint
  const { data: emailDetailData, isLoading } = useEmailDetail(cachedConversation._id);

  // Get archive/restore actions from useEmailData hook
  const { archiveEmail, restoreEmail, isArchiving, isRestoring } = useEmailData();

  // Use fresh data if available, otherwise fall back to cached data
  const conversation = emailDetailData?.email || cachedConversation;

  // Get thread messages (multiple messages in conversation)
  // If showSingleEmail is true, show only this email, not the thread
  const rawThreadMessages = showSingleEmail
    ? [conversation]
    : emailDetailData?.thread || conversation.messages || [conversation];
  const threadMessages = Array.isArray(rawThreadMessages)
    ? rawThreadMessages.filter((msg) => msg !== null && msg !== undefined)
    : [conversation];

  // Non-draft messages in thread (excludes drafts - same logic as MessageThread)
  const hasMessagesInBody =
    threadMessages.filter((msg) => msg && msg._id && !(msg as { is_draft?: boolean }).is_draft)
      .length > 0;

  // Auto-mark as viewed hook (extracted for SRP)
  useAutoMarkAsViewed({
    conversation: conversation as any,
    threadMessages,
    emailDetailData,
  });
  const { viewers, composers, isAnyoneComposing } = useEmailPresence(conversation._id);
  const [showAssignAgentModal, setShowAssignAgentModal] = useState(false);
  const [showAssignLeadModal, setShowAssignLeadModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'tasks' | 'comments' | 'reply' | null>(
    null
  );

  const handleSectionToggle = useCallback(
    (section: 'tasks' | 'comments' | 'reply') => {
      if (!conversation?.lead_id?._id && section !== 'reply') {
        toast.push(
          <Notification title="warning" type="warning">
            First assign lead to this email !
          </Notification>,
          { placement: 'bottom-end' }
        );
        return;
      }
      setExpandedSection((prev) => (prev === section ? null : section));
    },
    [conversation.lead_id?._id]
  );

  // ✅ NEW: Fetch ALL drafts for this thread to distribute to inline reply boxes
  const threadId = conversation.thread_id || conversation._id;
  const { data: threadDraftsData } = useQuery({
    queryKey: ['thread-drafts', threadId],
    queryFn: async () => {
      const response = await EmailDraftService.getDrafts({
        thread_id: threadId,
        limit: 100, // Get all drafts in thread
      });
      return response;
    },
  });

  // ✅ Create a map of drafts by reply_to_email for quick lookup
  const draftsByReplyTo = useCallback(() => {
    const draftsMap = new Map<string, any>();
    if (threadDraftsData?.data) {
      threadDraftsData.data.forEach((draft: any) => {
        const replyToId =
          draft.reply_to_email?._id ||
          draft.draft_parent_email_id?._id ||
          draft.draft_parent_email_id;
        if (replyToId) {
          draftsMap.set(replyToId, draft);
        }
      });
    }
    return draftsMap;
  }, [threadDraftsData]);

  const draftsMap = draftsByReplyTo();

  // ✅ NEW: Get draft for the bottom reply editor (draft for the last email in thread)
  const lastEmailInThread =
    threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : conversation;
  const lastEmailId = lastEmailInThread._id;
  const bottomReplyDraft = draftsMap.get(lastEmailId) || null;

  // Document preview hook
  const documentPreview = useDocumentPreview();
  const [previewAttachmentEmailId, setPreviewAttachmentEmailId] = useState<string | null>(null);

  // this function is used to handle attachment click to preview
  const handleAttachmentClick = useCallback(
    (attachment: EmailAttachment, messageId: string) => {
      if (!attachment.document_id) {
        // eslint-disable-next-line no-console
        console.error('Attachment missing document_id:', attachment);
        return;
      }

      const previewType = getDocumentPreviewType(
        attachment.mime_type || '',
        attachment.filename
      ) as 'pdf' | 'image' | 'other';

      setPreviewAttachmentEmailId(messageId);
      documentPreview.openPreview(attachment.document_id, attachment.filename, previewType);
    },
    [documentPreview]
  );

  const handleCommentAttachmentClick = useCallback(
    (attachment: CommentAttachment) => {
      if (!attachment?._id) {
        console.error('Comment attachment missing _id:', attachment);
        return;
      }

      handleAttachmentClick(
        {
          _id: attachment._id,
          document_id: attachment._id,
          filename: attachment.filename,
          mime_type: attachment.filetype,
          size: attachment.size ?? 0,
          approved: true,
          path: attachment.path,
        },
        conversation._id
      );
    },
    [handleAttachmentClick, conversation._id]
  );

  // Archive/Restore handlers
  const handleArchive = useCallback(() => {
    archiveEmail(conversation._id);
  }, [archiveEmail, conversation._id]);

  const handleRestore = useCallback(() => {
    restoreEmail(conversation._id);
  }, [restoreEmail, conversation._id]);

  // Track presence when viewing this email
  useEffect(() => {
    startViewing(conversation._id);

    return () => {
      stopViewing(conversation._id);
    };
  }, [conversation._id, startViewing, stopViewing]);

  // Reset expanded section when a new email is selected
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedSection(null);
  }, [conversation._id]);

  // Auto-expand reply section when draft is found
  useEffect(() => {
    if (bottomReplyDraft?._id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedSection('reply');
    }
  }, [bottomReplyDraft?._id]);

  // Auto-open section based on todoType query param
  useEffect(() => {
    if (todoType === 'make_draft') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedSection('reply');
    } else if (todoType === 'normal') {
      setExpandedSection('tasks');
    }
  }, [todoType]);

  // Show loading state while fetching fresh data
  if (isLoading && !emailDetailData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  const onAssignAgent = () => {
    if (conversation.lead_id) {
      setShowAssignAgentModal(true);
      return;
    }
    toast.push(
      <Notification title="warning" type="warning">
        First assign lead to this email !
      </Notification>,
      { placement: 'bottom-end' }
    );
  };

  return (
    <div className="flex h-full flex-col">
      {forEmail && <p className='absolute font-medium'>Email Details</p>}
      {/* Header */}
      <ConversationHeader
        conversation={conversation as any}
        onAssignAgent={onAssignAgent}
        onAssignLead={() => setShowAssignLeadModal(true)}
        onArchive={handleArchive}
        onRestore={handleRestore}
        isArchiving={isArchiving}
        isRestoring={isRestoring}
        hideBackButton={hideBackButton}
        onCollapse={onCollapse}
        showSingleEmail={showSingleEmail}
        onToggleThreadView={onToggleThreadView}
        currentOfferId={currentOfferId}
        currentLeadId={currentLeadId}
        forEmail={forEmail}
      />

      {/* Presence Indicators */}
      {viewers.length > 0 && (
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
          <PresenceIndicators viewers={viewers} />
        </div>
      )}

      {/* Collision Warning */}
      {isAnyoneComposing && <CollisionWarning users={composers} />}

      {/* Main Content Area */}
      <div className="overflow-y-auto">
        {/* Email Thread */}
        <MessageThread
          key={showSingleEmail ? 'single' : 'thread'}
          conversation={conversation as any}
          messages={threadMessages}
          onAttachmentClick={handleAttachmentClick}
          draftsMap={draftsMap}
          currentOfferId={currentOfferId}
          forceExpanded={!showSingleEmail}
          onToggleThreadView={onToggleThreadView}
          onCollapse={onCollapse}
          showSingleEmail={showSingleEmail}
          forEmail={forEmail}
          hidePinning={hidePinning}
        />
      </div>
      <div className={hasMessagesInBody ? 'border-t border-gray-200' : ''}>
        {/* Bottom Reply Editor - Only for replying to the last email in thread */}
        <ReplyEditor
          conversation={conversation as any}
          isExpanded={expandedSection === 'reply'}
          onToggle={() => handleSectionToggle('reply')}
          prefetchedDraft={bottomReplyDraft} // ✅ Pass pre-fetched draft to avoid duplicate API call
          skipFetch={true} // ✅ CRITICAL: Parent already fetched all drafts, never fetch again
          setExpandedSection={setExpandedSection}
          replyAll={replyAll}
        />
      </div>
      {/* Email Tasks Section */}
      {/* <EmailTaskList
        emailId={conversation._id}
        onCreateTask={() => setShowCreateTaskModal(true)}
        lead={conversation.lead_id || null}
        emailSubject={conversation.subject}
        emailFrom={
          conversation.participants?.length > 0
            ? conversation.participants[0]?.email
            : conversation.lead_id?.email_from
        }
        onAttachmentClick={handleAttachmentClick}
        isExpanded={expandedSection === 'tasks'}
        onToggle={() => handleSectionToggle('tasks')}
      /> */}

      {/* Internal Comments Section */}
      {/* <InternalCommentsPanel
        emailId={conversation._id}
        onAttachmentClick={handleCommentAttachmentClick}
        isExpanded={expandedSection === 'comments'}
        onToggle={() => handleSectionToggle('comments')}
        visibleToAgents={conversation.visible_to_agents}
      /> */}
      {/* Reply Editor at Bottom */}

      {/* Assign Agent Modal */}
      {showAssignAgentModal && (
        <AssignAgentModal
          emailId={conversation._id}
          emailSubject={conversation.subject}
          threadEmails={threadMessages}
          currentAssignedAgent={conversation.assigned_agent?._id}
          currentVisibleAgents={conversation.visible_to_agents || []}
          onClose={() => setShowAssignAgentModal(false)}
        />
      )}

      {/* Assign to Lead Modal */}
      {showAssignLeadModal && (
        <AssignToLeadModal
          emailId={conversation._id}
          emailSubject={conversation.subject}
          emailFrom={conversation.participants?.[0]?.email || conversation.lead_id?.email_from}
          onClose={() => setShowAssignLeadModal(false)}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <CreateTaskModal
          emailId={conversation._id}
          emailSubject={conversation.subject}
          threadEmails={threadMessages}
          leadId={conversation.lead_id?._id}
          onClose={() => setShowCreateTaskModal(false)}
        />
      )}

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        {...documentPreview.dialogProps}
        title="Email Attachment Preview"
        footerActions={
          previewAttachmentEmailId && currentOfferId && documentPreview.selectedDocumentId ? (
            <SlotPinningMenu
              emailId={previewAttachmentEmailId}
              currentOfferId={currentOfferId}
              documentIds={[documentPreview.selectedDocumentId]}
              inline
            />
          ) : null
        }
      />
    </div>
  );
}
