'use client';

/**
 * Hook for managing attachment approval/unapproval
 * Handles optimistic updates for instant UI feedback
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import EmailApiService from '../_services/EmailApiService';
import { EmailAttachment, EmailConversation, EmailMessage } from '../_types/email.types';

interface UseAttachmentApprovalOptions {
  conversationId: string;
  onSuccess?: () => void;
}

export function useAttachmentApproval({ conversationId, onSuccess }: UseAttachmentApprovalOptions) {
  const queryClient = useQueryClient();
  const [isApprovingAttachments, setIsApprovingAttachments] = useState(false);
  const [isUnapprovingAttachments, setIsUnapprovingAttachments] = useState(false);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['emails'] });
    queryClient.invalidateQueries({ queryKey: ['email', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['email-detail', conversationId] });
  };

  // Helper to update conversation in cache
  const updateConversationInCache = (attachmentIds: string[], approved: boolean) => {
    // Update single email query
    queryClient.setQueryData(['email', conversationId], (old: any) => {
      if (!old) return old;
      const updated = { ...old };
      const conversation = updated.data || updated;

      // Update attachments in conversation
      if (conversation.attachments) {
        conversation.attachments = conversation.attachments.map((att: EmailAttachment) =>
          attachmentIds.includes(att.document_id) ? { ...att, approved } : att
        );
      }
      // Update attachments in messages
      if (conversation.messages) {
        conversation.messages = conversation.messages.map((msg: EmailMessage) => ({
          ...msg,
          attachments: msg.attachments?.map((att: EmailAttachment) =>
            attachmentIds.includes(att.document_id) ? { ...att, approved } : att
          ),
        }));
      }
      // Update conversation-level attachment_approved status
      if (approved) {
        const allAttachments = conversation.attachments ||
          (conversation.messages?.[0]?.attachments || []);
        const allApproved = allAttachments.every((att: EmailAttachment) =>
          attachmentIds.includes(att.document_id) ? true : att.approved
        );
        conversation.attachment_approved = allApproved;
      } else {
        conversation.attachment_approved = false;
      }

      if (updated.data) {
        updated.data = conversation;
      } else {
        Object.assign(updated, conversation);
      }
      return updated;
    });

    // Update emails list query
    queryClient.setQueryData(['emails'], (old: any) => {
      if (!old) return old;
      const updated = { ...old };
      if (updated.conversations) {
        updated.conversations = updated.conversations.map((conv: EmailConversation) => {
          if (conv._id === conversationId) {
            const updatedConv = { ...conv };
            // Update attachments in conversation
            if (updatedConv.attachments) {
              updatedConv.attachments = updatedConv.attachments.map((att: EmailAttachment) =>
                attachmentIds.includes(att.document_id) ? { ...att, approved } : att
              );
            }
            // Update attachments in messages
            if (updatedConv.messages) {
              updatedConv.messages = updatedConv.messages.map((msg: EmailMessage) => ({
                ...msg,
                attachments: msg.attachments?.map((att: EmailAttachment) =>
                  attachmentIds.includes(att.document_id) ? { ...att, approved } : att
                ),
              }));
            }
            // Update conversation-level attachment_approved status
            if (approved) {
              const allAttachments = updatedConv.attachments ||
                (updatedConv.messages?.[0]?.attachments || []);
              const allApproved = allAttachments.every((att: EmailAttachment) =>
                attachmentIds.includes(att.document_id) ? true : att.approved
              );
              updatedConv.attachment_approved = allApproved;
            } else {
              updatedConv.attachment_approved = false;
            }
            return updatedConv;
          }
          return conv;
        });
      }
      return updated;
    });
  };

  // Approve Attachments Only
  const approveAttachmentsMutation = useMutation({
    mutationFn: async (attachmentIds?: string[]) => {
      setIsApprovingAttachments(true);
      return await EmailApiService.approveEmail(conversationId, {
        approve_email: false,
        approve_attachments: true,
        attachment_ids: attachmentIds,
      });
    },
    onMutate: async (attachmentIds) => {
      await queryClient.cancelQueries({ queryKey: ['email', conversationId] });
      await queryClient.cancelQueries({ queryKey: ['emails'] });
      const previousConversation = queryClient.getQueryData(['email', conversationId]);
      const previousEmails = queryClient.getQueryData(['emails']);

      // If attachmentIds is undefined, approve all attachments
      if (!attachmentIds || attachmentIds.length === 0) {
        // Get all attachments from the conversation
        const cachedData = queryClient.getQueryData(['email', conversationId]) as any;
        const cachedConversation = cachedData?.data || cachedData || previousConversation;
        const allAttachments = cachedConversation?.attachments ||
          (cachedConversation?.messages?.[0]?.attachments || []);

        // Extract all document_ids
        const allAttachmentIds = allAttachments
          .filter((att: EmailAttachment) => !att.approved) // Only get unapproved ones
          .map((att: EmailAttachment) => att.document_id);

        if (allAttachmentIds.length > 0) {
          updateConversationInCache(allAttachmentIds, true);
        }
      } else {
        updateConversationInCache(attachmentIds, true);
      }

      return { previousConversation, previousEmails };
    },
    onSuccess: (data) => {
      toast.push(
        <Notification title="Success" type="success">
          {data.message || 'Attachments approved successfully'}
        </Notification>,

      );
      invalidateQueries();
      onSuccess?.();
    },
    onError: (error: any, attachmentIds, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(['email', conversationId], context.previousConversation);
      }
      if (context?.previousEmails) {
        queryClient.setQueryData(['emails'], context.previousEmails);
      }
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to approve attachments'}
        </Notification>,

      );
    },
    onSettled: () => {
      setIsApprovingAttachments(false);
    },
  });

  // Unapprove Attachments
  const unapproveAttachmentsMutation = useMutation({
    mutationFn: async (attachmentIds: string[]) => {
      setIsUnapprovingAttachments(true);
      return await EmailApiService.unapproveAttachments(
        conversationId,
        attachmentIds,
        'Admin removed approval'
      );
    },
    onMutate: async (attachmentIds) => {
      await queryClient.cancelQueries({ queryKey: ['email', conversationId] });
      await queryClient.cancelQueries({ queryKey: ['emails'] });
      const previousConversation = queryClient.getQueryData(['email', conversationId]);
      const previousEmails = queryClient.getQueryData(['emails']);

      updateConversationInCache(attachmentIds, false);

      return { previousConversation, previousEmails };
    },
    onSuccess: (data) => {
      toast.push(
        <Notification title="Success" type="success">
          {data.message || 'Attachment approval removed successfully'}
        </Notification>,

      );
      invalidateQueries();
      onSuccess?.();
    },
    onError: (error: any, attachmentIds, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(['email', conversationId], context.previousConversation);
      }
      if (context?.previousEmails) {
        queryClient.setQueryData(['emails'], context.previousEmails);
      }
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to remove approval'}
        </Notification>,

      );
    },
    onSettled: () => {
      setIsUnapprovingAttachments(false);
    },
  });

  return {
    approveAttachmentsMutation,
    unapproveAttachmentsMutation,
    isApprovingAttachments,
    isUnapprovingAttachments,
    isAnyApproving: isApprovingAttachments || isUnapprovingAttachments,
  };
}
