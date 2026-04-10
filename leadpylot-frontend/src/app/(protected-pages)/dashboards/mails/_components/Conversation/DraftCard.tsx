'use client';

/**
 * DraftCard - Draft-Specific Email Card
 * Different UI for draft emails in the conversation list
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { EmailConversation } from '../../_types/email.types';
import EmailDraftService from '@/services/emailSystem/EmailDraftService';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useEmailStore } from '../../_stores';
import { useSession } from '@/components/providers/AuthProvider';

interface DraftCardProps {
  draft: EmailConversation;
  isSelected: boolean;
  isChecked?: boolean;
  onSelect?: (emailId: string) => void;
  onClick: () => void;
  onEdit?: (draftId: string) => void;
  onDelete?: (draftId: string) => void;
}

export default function DraftCard({
  draft,
  isSelected,
  isChecked = false,
  onSelect,
  onClick,
  onEdit,
  onDelete,
}: DraftCardProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: (draftId: string) => EmailDraftService.deleteDraft(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      setIsDeleteConfirmOpen(false);

      if (onDelete) {
        onDelete(draft._id);
      }

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

  // Event handlers
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect?.(draft._id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit ? onEdit(draft._id) : onClick();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteConfirmOpen(true);
  };

  const handleSend = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSendConfirmOpen(true);
  };

  const confirmDelete = () => {
    deleteDraftMutation.mutate(draft._id);
  };

  const confirmSend = () => {
    sendDraftMutation.mutate(draft._id);
  };

  // Computed values
  const recipients = draft.to || 'No recipients';
  const hasCC = draft.cc && draft.cc.length > 0;
  const lastSaved = draft.draft_last_saved_at || draft.updatedAt || draft.createdAt;
  const savedTime = lastSaved
    ? formatDistanceToNow(new Date(lastSaved), { addSuffix: true })
    : 'Never';
  const createdBy = draft.draft_created_by
    ? (draft.draft_created_by as any).name || (draft.draft_created_by as any).login
    : null;
  const isProcessing = deleteDraftMutation.isPending || sendDraftMutation.isPending;

  return (
    <div
      onClick={handleEdit}
      className={`group relative block cursor-pointer border-l-4 px-3 py-3 transition-all ${
        isSelected
          ? 'border-l-amber-600 bg-amber-50'
          : 'border-l-amber-400 bg-amber-50/20 hover:bg-gray-50'
      }`}
    >
      {/* Header Row - Draft Icon & Time */}
      <div className="mb-1.5 flex items-center gap-2">
        {/* Left Section - Checkbox, Draft Icon, Recipients */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {/* Checkbox for selection */}
          {onSelect && (
            <div className="prevent-select shrink-0">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={handleCheckboxChange}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Draft Icon */}
          <div className="shrink-0">
            <ApolloIcon name="file" className="text-amber-600" />
          </div>

          {/* Draft Badge */}
          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
            DRAFT
          </span>

          {/* Recipients */}
          <span className="min-w-0 truncate text-sm font-medium text-gray-700">
            To: {recipients}
            {hasCC && <span className="ml-1 text-gray-500">(+CC)</span>}
          </span>
        </div>

        {/* Right Section - Saved Time */}
        <span className="ml-2 shrink-0 text-xs whitespace-nowrap text-gray-500">
          Saved {savedTime}
        </span>
      </div>

      {/* Subject */}
      <div className="mb-2 flex items-center">
        <div className="truncate pr-20 text-sm font-normal text-gray-900">
          {draft.subject || '(No Subject)'}
        </div>
      </div>

      {/* Preview Text */}
      {draft.body && (
        <div className="mb-2 truncate text-xs text-gray-500">{draft.body.substring(0, 100)}...</div>
      )}

      {/* Action Buttons Row */}
      <div className="mt-2 flex items-center gap-2">
        {/* Edit Button */}
        <Button
          size="sm"
          variant="plain"
          onClick={handleEdit}
          className="prevent-select text-xs"
          icon={<ApolloIcon name="pen" className="h-3 w-3" />}
        >
          Edit
        </Button>

        {/* Send Button */}
        <Button
          size="sm"
          variant="success"
          onClick={handleSend}
          loading={sendDraftMutation.isPending}
          disabled={isProcessing}
          className="prevent-select text-xs"
          icon={<ApolloIcon name="send-inclined" className="h-3 w-3" />}
        >
          Send
        </Button>

        {/* Delete Button */}
        <Button
          size="sm"
          variant="plain"
          onClick={handleDelete}
          loading={deleteDraftMutation.isPending}
          disabled={isProcessing}
          className="prevent-select text-xs text-red-600 hover:text-red-700"
          icon={<ApolloIcon name="trash" className="h-3 w-3" />}
        >
          Delete
        </Button>

        {/* Created By (if available) */}
        {createdBy && <span className="ml-auto text-xs text-gray-400">by {createdBy}</span>}
      </div>

      {/* Delete Confirmation Dialog */}
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

      {/* Send Confirmation Dialog */}
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
    </div>
  );
}
