'use client';

/**
 * ConversationCard - Missive-Style
 * Email card in the conversation list
 */

import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Checkbox from '@/components/ui/Checkbox';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSession } from '@/hooks/useSession';
import EmailDraftService from '@/services/emailSystem/EmailDraftService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { getEmailUrl } from '../../_hooks/useUrlSync';
import { useEmailStore } from '../../_stores/emailStore';
import { EmailConversation } from '../../_types/email.types';
import RejectionModal from '../Actions/RejectionModal';
import LabelBadge from '../Labels/LabelBadge';
import StarButton from '../Shared/StarButton';
import ConversationBatchSection from './ConversationBatchSection';

interface ConversationCardProps {
  conversation: EmailConversation;
  isSelected: boolean;
  isChecked?: boolean;
  onSelect?: (emailId: string) => void;
  onClick: () => void;
  onStarToggle?: (emailId: string, isStarred: boolean) => Promise<void>;
  isDraftsView?: boolean;
  onOpenModal?: (conversation: EmailConversation) => void;
}

export default function ConversationCard({
  conversation,
  isSelected,
  isChecked = false,
  onSelect,
  onClick,
  onStarToggle,
  isDraftsView,
  onOpenModal,
}: ConversationCardProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;
  const isAgent = session?.user?.role === Role.AGENT;
  const { currentView } = useEmailStore();
  const isUnread = isAdmin
    ? !conversation.admin_viewed
    : isAgent
      ? !conversation.agent_viewed
      : false;

  const hasComments = (conversation.comment_count || 0) > 0;
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Draft action state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [showSnoozeInfo, setShowSnoozeInfo] = useState(false);
  const queryClient = useQueryClient();

  // Generate URL for this conversation
  const conversationUrl = getEmailUrl(currentView, conversation._id);
  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: (draftId: string) => EmailDraftService.deleteDraft(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      setIsDeleteConfirmOpen(false);

      toast.push(
        <Notification title="Success" type="success">
          Draft deleted successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to delete draft. Please try again.'}
        </Notification>
      );
    },
  });

  // Send draft mutation
  const sendDraftMutation = useMutation({
    mutationFn: (draftId: string) => EmailDraftService.sendDraft(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      setIsSendConfirmOpen(false);

      toast.push(
        <Notification title="Success" type="success">
          Draft sent successfully!
        </Notification>
      );
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to send draft. Please try again.'}
        </Notification>
      );
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    // Don't select if clicking checkbox or action buttons
    if ((e.target as HTMLElement).closest('.prevent-select')) {
      e.preventDefault();
      return;
    }

    // Prevent default link behavior, we'll handle it with onClick
    e.preventDefault();

    // Open modal if handler is provided, otherwise use default onClick
    if (onOpenModal) {
      onOpenModal(conversation);
    } else {
      onClick();
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(conversation._id);
    }
  };

  // Draft action handlers
  // const handleEdit = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   onClick();
  // };

  // const handleDelete = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   setIsDeleteConfirmOpen(true);
  // };

  // const handleSend = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   setIsSendConfirmOpen(true);
  // };

  const confirmDelete = () => {
    deleteDraftMutation.mutate(conversation._id);
  };

  const confirmSend = () => {
    sendDraftMutation.mutate(conversation._id);
  };

  // Computed values for drafts
  // const isProcessing = deleteDraftMutation.isPending || sendDraftMutation.isPending;

  return (
    <Link
      href={conversationUrl}
      onClick={handleClick}
      className={`group relative block border-b border-border/50 hover:shadow-[0_0_12px_rgba(0,0,0,0.14)] cursor-pointer border-l-4 px-3 py-1 transition-all ${isSelected
        ? 'border-l-blue-600 bg-blue-50' : isUnread ? 'border-l-blue-400 bg-blue-50/30 hover:bg-gray-50' : 'border-l-transparent hover:bg-gray-50'} `}
    >
      {/* Header Row - Sender & Time */}
      <div className="flex items-center gap-2 ">
        {/* Left Section - Checkbox, Unread, Sender */}
        <div className="flex min-w-0 flex-1 items-center space-x-1 overflow-hidden ">
          {/* Checkbox for selection */}
          {onSelect && (
            <div className="prevent-select flex shrink-0" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isChecked}
                onChange={(_, e) => handleCheckboxChange(e)}
              />
            </div>
          )}

          {/* Star Button */}
          {(conversation as any)?.starred_by?.some((star: any) => typeof star?.user_id === 'string' ? star?.user_id : star?.user_id._id === session?.user?.id) ? (
            <StarButton
              emailId={conversation._id}
              isStarred={true}
              size="sm"
              onToggle={onStarToggle}
            />
          ) : (<></>)}

          {/* Unread indicator */}
          {isUnread && <div className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}

          {/* Batch section - contact name + badges (starts from conversation name) */}
          <ConversationBatchSection
            conversation={conversation}
            isUnread={isUnread}
            hasComments={hasComments}
            showSnoozeInfo={showSnoozeInfo}
            onSnoozeHoverChange={setShowSnoozeInfo}
          />
        </div>

        {/* Right Section - Time and Modal Button */}
        <div className="flex items-center space-x-2 ">
          {/* Open Modal Button */}
          {onOpenModal && (
            <button
              onClick={() => {
                onOpenModal(conversation);
              }}
              className="prevent-select rounded-md text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-700"
              title="Open details"
            >
              <ApolloIcon name="maximize" className="text-[0.9rem]" />
            </button>
          )}
          <span className="shrink-0 text-[0.698775rem] whitespace-nowrap text-gray-500">
            {formatDistanceToNow(new Date(conversation.latest_message_date), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Subject */}
      <div className="flex items-center">
        <div
          className={` truncate px-5.5 text-[0.8152375rem] line-clamp-1 max-w-[70dvw] ${isUnread ? 'font-semibold' : 'font-thin'} text-gray-900`}
        >
          {conversation.subject || '(no subject)'}
        </div>
        {/* Approval Actions - Show on hover for emails without lead OR pending approval */}
        {/* {(!conversation.lead_id || conversation.needs_approval) && (
          <div className="prevent-select z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <ApprovalActions
              conversation={conversation}
              onReject={() => setShowRejectModal(true)}
              compact
            />
          </div>
        )} */}
      </div>

      {/* Preview */}
      <div className="mb-2 px-5.5 text-[0.698775rem] text-gray-500 line-clamp-1 truncate">
        {conversation.latest_message_snippet}
      </div>

      {/* Draft Action Buttons */}
      {/* {isDraftsView && (
        <div className="mt-2 flex items-center gap-2">

          <Button
            size="sm"
            variant="plain"
            onClick={handleEdit}
            className="prevent-select text-[0.698775rem]"
            icon={<ApolloIcon name="pen" className="h-3 w-3" />}
          >
            Edit
          </Button>

          <Button
            size="sm"
            variant="success"
            onClick={handleSend}
            loading={sendDraftMutation.isPending}
            disabled={isProcessing}
            className="prevent-select text-[0.698775rem]"
            icon={<ApolloIcon name="send-inclined" className="h-3 w-3" />}
          >
            Send
          </Button>

          <Button
            size="sm"
            variant="plain"
            onClick={handleDelete}
            loading={deleteDraftMutation.isPending}
            disabled={isProcessing}
            className="prevent-select text-[0.698775rem] text-red-600 hover:text-red-700"
            icon={<ApolloIcon name="trash" className="h-3 w-3" />}
          >
            Delete
          </Button>
        </div>
      )} */}

      {/* Labels */}
      {conversation.labels && conversation.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {conversation.labels.map((label: any) => (
            <LabelBadge key={label._id} label={label} size="sm" />
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <RejectionModal
          emailId={conversation._id}
          emailSubject={conversation.subject}
          onClose={() => setShowRejectModal(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDraftsView && (
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete Draft"
          onCancel={() => setIsDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
          confirmText="Delete"
          confirmButtonProps={{
            variant: 'destructive',
            loading: deleteDraftMutation.isPending,
            disabled: deleteDraftMutation.isPending,
          }}
          cancelButtonProps={{
            variant: 'default',
            disabled: deleteDraftMutation.isPending,
          }}
        >
          <p>Are you sure you want to delete this draft? This action cannot be undone.</p>
        </ConfirmDialog>
      )}

      {/* Send Confirmation Dialog */}
      {isDraftsView && (
        <ConfirmDialog
          isOpen={isSendConfirmOpen}
          title="Send Draft"
          onCancel={() => setIsSendConfirmOpen(false)}
          onConfirm={confirmSend}
          confirmText="Send"
          confirmButtonProps={{
            variant: 'success',
            loading: sendDraftMutation.isPending,
            disabled: sendDraftMutation.isPending,
          }}
          cancelButtonProps={{
            variant: 'default',
            disabled: sendDraftMutation.isPending,
          }}
        >
          <p>Send this draft now?</p>
        </ConfirmDialog>
      )}
    </Link>
  );
}
