'use client';

import { useState } from 'react';
import { useInternalComments } from '../../_hooks/useInternalComments';
import { CommentAttachment, InternalComment } from '../../_types/comment.types';
import CommentBubble from './CommentBubble';
import CommentInput from './CommentInput';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface InternalCommentsPanelProps {
  emailId: string;
  onAttachmentClick?: (attachment: CommentAttachment) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
  visibleToAgents?: string[] | null;
}

export default function InternalCommentsPanel({
  emailId,
  onAttachmentClick,
  isExpanded = false,
  onToggle,
  visibleToAgents,
}: InternalCommentsPanelProps) {
  const { comments, isLoading, commentCount } = useInternalComments(emailId);
  const [editingComment, setEditingComment] = useState<InternalComment | null>(null);

  const header = (
    <div
      className="flex items-center justify-between px-4 py-3 bg-amber-50/50 cursor-pointer hover:bg-amber-100/50 transition-colors border-t border-gray-200"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <ApolloIcon name="meeting-source" className="text-amber-700" />
        <h3 className="text-sm font-semibold text-amber-900">Internal Conversation</h3>
        <span className="text-xs text-amber-700">
          ({commentCount} {commentCount === 1 ? 'comment' : 'comments'})
        </span>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xs text-yellow-600 overflow-hidden"> 💡 These comments are private and won&apos;t be sent to the customer</p>
        <ApolloIcon
          name={isExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
          className="text-amber-700"
        />
      </div>
    </div>
  );

  return (
    <div className="overflow-visible bg-amber-50/50">
      {header}
      {isExpanded && (
        <div className="px-4">

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <ApolloIcon name="loading" className="animate-spin text-xl text-amber-600" />
            </div>
          ) : comments.length > 0 ? (
            <div className="mb-4 max-h-60 space-y-3 overflow-y-auto">
              {comments.map((comment) => (
                <CommentBubble
                  key={comment._id}
                  comment={comment}
                  emailId={emailId}
                  onAttachmentClick={onAttachmentClick}
                  onEdit={(comment) => setEditingComment(comment)}
                  isBeingEdited={editingComment?._id === comment._id}
                />
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-amber-700">
              No internal comments yet. Start a conversation with your team!
            </div>
          )}

          <div className="pb-2">
            <CommentInput
              emailId={emailId}
              editingComment={editingComment}
              onCancelEdit={() => setEditingComment(null)}
              visibleToAgents={visibleToAgents}
            />
          </div>
        </div>
      )}
    </div>
  );
}
