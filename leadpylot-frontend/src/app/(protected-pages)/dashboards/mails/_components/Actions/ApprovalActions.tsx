'use client';

/**
 * ApprovalActions Component
 * Quick approve/reject buttons for admin workflow
 * Shows "Assign to Lead" if email has no lead_id
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import EmailApiService from '../../_services/EmailApiService';
import AssignToLeadModal from './AssignToLeadModal';
import AttachmentApprovalSelector from '../Attachments/AttachmentApprovalSelector';
import { EmailConversation } from '../../_types/email.types';

interface ApprovalActionsProps {
  conversation: EmailConversation;
  onReject?: () => void;
  compact?: boolean;
}

export default function ApprovalActions({
  conversation,
  onReject,
  compact = false,
}: ApprovalActionsProps) {
  const queryClient = useQueryClient();
  const [isApprovingEmail, setIsApprovingEmail] = useState(false);
  const [isApprovingAttachments, setIsApprovingAttachments] = useState(false);
  const [isUnapprovingAttachments, setIsUnapprovingAttachments] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAttachmentSelector, setShowAttachmentSelector] = useState(false);

  // Check if email has a matched lead
  const hasLead = !!conversation.lead_id;

  // Check if email needs approval
  const needsApproval = conversation.needs_approval;
  const emailApproved = conversation.email_approved;
  const attachmentApproved = conversation.attachment_approved;
  const hasAttachments = conversation.has_attachments;

  // Get attachments - try conversation.attachments first, then messages[0].attachments
  const attachments =
    conversation.attachments && conversation.attachments.length > 0
      ? conversation.attachments
      : conversation.messages &&
          conversation.messages.length > 0 &&
          conversation.messages[0].attachments
        ? conversation.messages[0].attachments
        : [];

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['emails'] });
    queryClient.invalidateQueries({ queryKey: ['email', conversation._id] });
  };

  // Approve Email Only
  const approveEmailMutation = useMutation({
    mutationFn: async () => {
      setIsApprovingEmail(true);
      return await EmailApiService.approveEmail(conversation._id, {
        approve_email: true,
        approve_attachments: false,
      });
    },
    onSuccess: (data) => {
      toast.push(
        <Notification title="Success" type="success">
          {data.message || 'Email approved successfully'}
        </Notification>
      );
      invalidateQueries();
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to approve email'}
        </Notification>
      );
    },
    onSettled: () => {
      setIsApprovingEmail(false);
    },
  });

  // Approve Attachments Only
  const approveAttachmentsMutation = useMutation({
    mutationFn: async (attachmentIds?: string[]) => {
      setIsApprovingAttachments(true);
      return await EmailApiService.approveEmail(conversation._id, {
        approve_email: false,
        approve_attachments: true,
        attachment_ids: attachmentIds, // Pass specific attachment IDs
      });
    },
    onSuccess: (data) => {
      toast.push(
        <Notification title="Success" type="success">
          {data.message || 'Attachments approved successfully'}
        </Notification>
      );
      invalidateQueries();
      setShowAttachmentSelector(false); // Close selector after approval
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to approve attachments'}
        </Notification>
      );
    },
    onSettled: () => {
      setIsApprovingAttachments(false);
    },
  });

  // Approve All (Quick Approve)
  const approveAllMutation = useMutation({
    mutationFn: async () => {
      setIsApprovingAll(true);
      return await EmailApiService.quickApprove(conversation._id);
    },
    onSuccess: (data) => {
      toast.push(
        <Notification title="Success" type="success">
          {data.message || 'Email and attachments approved successfully'}
        </Notification>
      );
      invalidateQueries();
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to approve'}
        </Notification>
      );
    },
    onSettled: () => {
      setIsApprovingAll(false);
    },
  });

  // Unapprove Attachments
  const unapproveAttachmentsMutation = useMutation({
    mutationFn: async (attachmentIds: string[]) => {
      setIsUnapprovingAttachments(true);
      return await EmailApiService.unapproveAttachments(
        conversation._id,
        attachmentIds,
        'Admin removed approval'
      );
    },
    onSuccess: (data) => {
      toast.push(
        <Notification title="Success" type="success">
          {data.message || 'Attachment approval removed successfully'}
        </Notification>
      );
      invalidateQueries();
      setShowAttachmentSelector(false); // Close selector after unapproval
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to remove approval'}
        </Notification>
      );
    },
    onSettled: () => {
      setIsUnapprovingAttachments(false);
    },
  });

  // If no lead is matched, show "Assign to Lead" button
  if (!hasLead) {
    if (compact) {
      return (
        <>
          <Button
            size="xs"
            variant="default"
            onClick={() => setShowAssignModal(true)}
            icon={<ApolloIcon name="user-plus" />}
            title="Assign to Lead"
          >
            Assign
          </Button>

          {showAssignModal && (
            <AssignToLeadModal
              emailId={conversation._id}
              emailSubject={conversation.subject}
              emailFrom={conversation.participants[0]?.email}
              onClose={() => setShowAssignModal(false)}
            />
          )}
        </>
      );
    }

    return (
      <>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
            No Lead Matched
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowAssignModal(true)}
            icon={<ApolloIcon name="user-plus" />}
          >
            Assign to Lead
          </Button>
        </div>

        {showAssignModal && (
          <AssignToLeadModal
            emailId={conversation._id}
            emailSubject={conversation.subject}
            emailFrom={conversation.participants[0]?.email}
            onClose={() => setShowAssignModal(false)}
          />
        )}
      </>
    );
  }

  // Email has a lead - show approval buttons
  // Don't show if already fully approved
  if (!needsApproval && emailApproved && (hasAttachments ? attachmentApproved : true)) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="xs"
          variant="plain"
          onClick={() => approveAllMutation.mutate()}
          disabled={isApprovingAll}
          loading={isApprovingAll}
          icon={<ApolloIcon name="check" className="text-green-500" />}
          title="Quick Approve All"
          className="rounded-full border"
        />
        <Button
          size="xs"
          variant="plain"
          onClick={onReject}
          icon={<ApolloIcon name="cross" className="text-red-500" />}
          title="Reject"
          className="rounded-full border"
        />
      </div>
    );
  }

  // Full mode - show individual approval buttons
  const isAnyApproving = isApprovingEmail || isApprovingAttachments || isApprovingAll;

  return (
    <div className="flex items-center gap-2">
      {/* Status Info */}
      <div className="flex items-center gap-2 text-sm">
        {!emailApproved && (
          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
            <ApolloIcon name="mail" className="text-sm" />
            Email Pending
          </div>
        )}
        {hasAttachments && !attachmentApproved && (
          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
            <ApolloIcon name="paperclip" className="text-xs" />
            Attachments Pending
          </div>
        )}
      </div>

      {/* Approval Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Approve Email (if not already approved) */}
        {!emailApproved && (
          <Button
            size="sm"
            variant="success"
            onClick={() => approveEmailMutation.mutate()}
            disabled={isAnyApproving}
            loading={isApprovingEmail}
            icon={<ApolloIcon name="mail" />}
          >
            Approve Email
          </Button>
        )}

        {/* Approve All (if both need approval) */}
        {!emailApproved && hasAttachments && (
          <Button
            size="sm"
            variant="solid"
            onClick={() => approveAllMutation.mutate()}
            disabled={isAnyApproving}
            loading={isApprovingAll}
            icon={<ApolloIcon name="check-circle" />}
          >
            Approve All
          </Button>
        )}

        {/* If only one thing needs approval, also show "Approve All" for convenience */}
        {/* {((!emailApproved && emailApproved === attachmentApproved) || 
          (hasAttachments && !attachmentApproved && emailApproved)) && (
          <Button
            size="sm"
            variant="solid"
            onClick={() => approveAllMutation.mutate()}
            disabled={isAnyApproving}
            loading={isApprovingAll}
            icon={<ApolloIcon name="check-circle" />}
          >
            Quick Approve
          </Button>
        )} */}

        {/* Reject Button */}
        {/* <Button
          size="sm"
          variant="destructive"
          onClick={onReject}
          disabled={isAnyApproving}
          icon={<ApolloIcon name="x" />}
        >
          Reject
        </Button> */}
      </div>

      {/* Attachment Selector */}
      {showAttachmentSelector && hasAttachments && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <AttachmentApprovalSelector
            attachments={attachments}
            onApprove={(attachmentIds) => approveAttachmentsMutation.mutate(attachmentIds)}
            onUnapprove={(attachmentIds) => unapproveAttachmentsMutation.mutate(attachmentIds)}
            isApproving={isApprovingAttachments}
            isUnapproving={isUnapprovingAttachments}
          />
        </div>
      )}
    </div>
  );
}
