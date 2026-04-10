'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import {
  useChatMessages,
  useChatRealtime,
} from '@/hooks/useInternalChat';
import { formatDistanceToNow, format } from 'date-fns';
import { AddComment } from './AddComment';
import CopyButton from '@/components/shared/CopyButton';

interface TaskSortCommentProps {
  taskId: string;
  onClose?: () => void;
}

interface Comment {
  id: string;
  user: string;
  text: string;
  date: string;
  time: string;
  createdAt: Date;
}

/** Single comment with 2-line clamp, "see more", and "less" */
const CommentCard: React.FC<{ comment: Comment }> = ({ comment }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsSeeMore, setNeedsSeeMore] = useState(false);
  const textElementRef = useRef<HTMLParagraphElement | null>(null);

  // Ref callback to check overflow when element mounts
  const textRefCallback = useCallback((node: HTMLParagraphElement | null) => {
    textElementRef.current = node;
    if (!node) {
      setNeedsSeeMore(false);
      return;
    }

    // Check overflow after layout is complete
    requestAnimationFrame(() => {
      if (textElementRef.current) {
        // When collapsed, check if content overflows 2 lines
        setNeedsSeeMore(textElementRef.current.scrollHeight > textElementRef.current.clientHeight);
      }
    });
  }, []);

  const handleSeeMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsExpanded(true);
    // When expanding, we know we need to show "less"
    setNeedsSeeMore(true);
  };

  const handleLess = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsExpanded(false);
    // Re-check overflow after collapsing by checking the element directly
    if (textElementRef.current) {
      requestAnimationFrame(() => {
        if (textElementRef.current) {
          setNeedsSeeMore(textElementRef.current.scrollHeight > textElementRef.current.clientHeight);
        }
      });
    }
  };

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white px-1.5 py-1 shadow-sm min-w-0 w-full"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <p
        ref={textRefCallback}
        className={`text-xs leading-relaxed text-gray-900 whitespace-pre-wrap min-w-0 w-full break-all ${!isExpanded ? 'line-clamp-2' : ''}`}
        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
      >
        {comment.text}
      </p>
      {needsSeeMore && (
        <div className="mt-0.5 flex items-center gap-2">
          {isExpanded ? (
            <>
              <button
                type="button"
                onClick={handleLess}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-xs font-medium text-ocean-2 hover:underline"
              >
                Less
              </button>
              <span
                className="inline-flex shrink-0"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                title="Copy comment"
              >
                <CopyButton value={comment.text} className="h-3.5 w-3.5 text-gray-500 hover:text-ocean-2" />
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSeeMore}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-xs font-medium text-ocean-2 hover:underline"
            >
              See more
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const TaskSortComment: React.FC<TaskSortCommentProps> = ({ taskId }) => {
  const [showAddComment, setShowAddComment] = useState(false);
  const { data: chatResponse, isLoading, error } = useChatMessages(taskId);

  useChatRealtime(taskId);

  const comments = useMemo<Comment[]>(() => {
    if (!chatResponse?.data?.messages) return [];

    return chatResponse.data.messages.map((msg) => {
      const createdAt = new Date(msg.createdAt);
      const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
      const time = format(createdAt, 'h:mm a');
      const senderName = msg.sender?.login || 'Unknown User';

      return {
        id: msg._id,
        user: senderName,
        text: msg.message,
        date: timeAgo,
        time,
        createdAt,
      };
    });
  }, [chatResponse]);

  const handleCommentAdded = () => {
    setShowAddComment(false);
  };

  return (
    <div
      className="space-y-1"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-[300px] space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            <span className="ml-2 text-xs text-gray-500">Loading comments...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-4 text-xs text-red-500">
            Failed to load comments
          </div>
        ) : comments.length === 0 ? (
          <></>
        ) : (
          comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        )}
      </div>

      {showAddComment ? (
        <AddComment
          taskId={taskId}
          onCommentAdded={handleCommentAdded}
          onCancel={() => setShowAddComment(false)}
        />
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowAddComment(true);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5 text-xs text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
        >
          Add a comment...
        </button>
      )}
    </div>
  );
};
