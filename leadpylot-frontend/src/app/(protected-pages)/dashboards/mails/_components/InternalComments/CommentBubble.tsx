'use client';

import { useState, useCallback } from 'react';
import { CommentAttachment, InternalComment, EditHistoryEntry } from '../../_types/comment.types';
import { useInternalComments } from '../../_hooks/useInternalComments';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { formatDistanceToNow } from 'date-fns';
import AttachmentList from '../Shared/AttachmentList';
import { useSession } from '@/hooks/useSession';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Dialog from '@/components/ui/Dialog/Dialog';

interface CommentBubbleProps {
  comment: InternalComment;
  emailId: string;
  onAttachmentClick?: (attachment: CommentAttachment) => void;
  onEdit?: (comment: InternalComment) => void;
  isBeingEdited?: boolean;
}

export default function CommentBubble({
  comment,
  emailId,
  onAttachmentClick,
  onEdit,
  isBeingEdited = false,
}: CommentBubbleProps) {
  const { data: session } = useSession();
  const { deleteComment, updateComment, isDeletingComment } = useInternalComments(emailId);
  const [showActions, setShowActions] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const isOwnComment = session?.user?.id === comment.user_id;
  const handleAttachmentClick = useCallback(
    (attachment: CommentAttachment) => {
      const attachmentId = attachment.document_id || attachment._id;

      if (!attachmentId) {
        console.error('Attachment missing identifier:', attachment);
        return;
      }

      onAttachmentClick?.({
        ...attachment,
        _id: attachmentId,
        document_id: attachmentId,
      });
    },
    [onAttachmentClick]
  );

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteComment(comment._id);
    setIsDeleteDialogOpen(false);
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
  };

  const handleAttachmentDelete = useCallback(
    (attachment: CommentAttachment) => {
      const attachmentId = attachment.document_id || attachment._id;

      if (!attachmentId) {
        console.error('Attachment missing identifier:', attachment);
        return;
      }

      // Get current attachment IDs and filter out the deleted one
      const currentAttachmentIds = comment.attachments?.map(a => a.document_id || a._id).filter(Boolean) as string[] || [];
      const updatedAttachmentIds = currentAttachmentIds.filter(id => id !== attachmentId);

      // Update comment with filtered attachment_ids
      updateComment({
        commentId: comment._id,

        data: {
          attachment_ids: updatedAttachmentIds,
          text: comment.text,
        },
      });
    },
    [comment._id, comment.attachments, updateComment]
  );

  const renderText = (text: string) => {
    return text.split(/(@\w+)/g).map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="rounded bg-blue-100 px-1 py-0.5 font-medium text-blue-700"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const HistoryItem = ({ entry }: { entry: EditHistoryEntry }) => {
    const userName = entry.edited_by.info?.name || entry.edited_by.login;
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-300 text-xs font-semibold text-white">
            {userName[0].toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-medium text-gray-900">{userName}</span>
            <span className="ml-2 text-xs text-gray-500">
              {formatDistanceToNow(new Date(entry.edited_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {renderText(entry.text)}
        </div>
        {entry.attachments && entry.attachments.length > 0 && (
          <AttachmentList
            attachments={entry.attachments}
            onAttachmentClick={handleAttachmentClick}
            size="sm"
          />
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`rounded-lg border p-3 transition-shadow ${isBeingEdited
          ? 'border-blue-400 bg-blue-50 shadow-md'
          : 'border-amber-200 bg-white hover:shadow-sm'
          }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Comment Header */}
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-300 text-xs font-semibold text-white">
              {comment.user.name[0].toUpperCase()}
            </div>

            {/* User Info */}
            <div>
              <span className="text-sm font-medium text-gray-900">
                {comment.user.name}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {comment.edited && comment.edit_history && comment.edit_history.length > 0 && (
                <button
                  onClick={() => setIsHistoryDialogOpen(true)}
                  className="ml-1 text-xs italic text-gray-400 hover:text-green-600 hover:underline relative "
                  onMouseEnter={(e) => {
                    e.currentTarget.textContent = '(view logs)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.textContent = '(edited)';
                  }}
                >
                  (edited)
                </button>
              )}
              {comment.edited && (!comment.edit_history || comment.edit_history.length === 0) && (
                <span className="ml-1 text-xs italic text-gray-400">(edited)</span>
              )}
            </div>
          </div>

          {/* Actions (show on hover) */}
          {isOwnComment && showActions && !isBeingEdited && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit?.(comment)}
                className="rounded p-1 hover:bg-amber-100"
                title="Edit"
              >
                <ApolloIcon name="pen" className="text-xs text-gray-600" />
              </button>
              <button
                onClick={handleDelete}
                className="rounded p-1 hover:bg-red-100"
                title="Delete"
              >
                <ApolloIcon name="trash" className="text-xs text-red-600" />
              </button>
            </div>
          )}
          {isBeingEdited && (
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-blue-600">Editing below ↓</span>
            </div>
          )}
        </div>

        {/* Comment Text */}
        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {renderText(comment.text)}
        </div>

        {/* Attachments List */}
        {comment.attachments && (
          <AttachmentList
            attachments={comment.attachments}
            onAttachmentClick={handleAttachmentClick}
            onAttachmentDelete={isOwnComment ? handleAttachmentDelete : undefined}
            showDelete={isOwnComment && !isBeingEdited}
            size="sm"
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={cancelDelete}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Comment"
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonProps={{ variant: 'destructive', disabled: isDeletingComment }}
      >
        <p className="text-sm text-gray-700">
          Are you sure you want to delete this internal comment? This action cannot be undone.
        </p>
      </ConfirmDialog>

      {comment.edit_history && comment.edit_history.length > 0 && (
        <Dialog
          isOpen={isHistoryDialogOpen}
          onClose={() => setIsHistoryDialogOpen(false)}
          width={600}
          contentClassName="p-6"
        >
          <h4 className="mb-4 text-lg font-semibold">Edit History</h4>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {[...comment.edit_history].reverse().map((entry) => (
              <HistoryItem key={entry._id} entry={entry} />
            ))}
          </div>
        </Dialog>
      )}
    </>
  );
}

