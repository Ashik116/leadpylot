import { MessageSquare, Loader2, Check, X } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  useChatMessages,
  useUpdateChatMessage,
  useDeleteChatMessage,
  useChatRealtime,
} from '@/hooks/useInternalChat';
import { Comment } from '../types';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { CommentComposer } from './CommentComposer';
import { CommentBubble } from './CommentBubble';

interface CommentsTabProps {
  taskId: string;
}

export const CommentsTab: React.FC<CommentsTabProps> = ({ taskId }) => {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { data: chatResponse, isLoading, error } = useChatMessages(taskId);
  const updateMessageMutation = useUpdateChatMessage(taskId);
  const deleteMessageMutation = useDeleteChatMessage(taskId);

  // Enable real-time updates for chat messages
  useChatRealtime(taskId);

  // Map API response to Comment type with date grouping
  const { comments, groupedByDate } = useMemo(() => {
    if (!chatResponse?.data?.messages) return { comments: [], groupedByDate: {} };

    const mappedComments = chatResponse.data.messages.map((msg) => {
      const createdAt = new Date(msg.createdAt);
      const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
      const time = format(createdAt, 'h:mm a');
      const senderName = msg.sender?.login || 'Unknown User';
      const initials = senderName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      // Format date for grouping
      let dateKey: string;
      if (isToday(createdAt)) {
        dateKey = 'Today';
      } else if (isYesterday(createdAt)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(createdAt, 'MMMM d, yyyy');
      }

      return {
        id: msg._id,
        user: senderName,
        text: msg.message,
        date: timeAgo,
        time,
        avatar: initials,
        createdAt,
        dateKey,
        rawMessage: msg,
      };
    });

    // Group comments by date
    const grouped: Record<string, typeof mappedComments> = {};
    mappedComments.forEach((comment) => {
      if (!grouped[comment.dateKey]) {
        grouped[comment.dateKey] = [];
      }
      grouped[comment.dateKey].push(comment);
    });

    return { comments: mappedComments, groupedByDate: grouped };
  }, [chatResponse]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [comments, isLoading]);

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editingText.trim()) return;

    try {
      await updateMessageMutation.mutateAsync({
        messageId,
        data: { message: editingText.trim() },
      });
      setEditingCommentId(null);
      setEditingText('');
    } catch {
      // Error is handled by React Query
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessageMutation.mutateAsync(messageId);
    } catch {
      // Error is handled by React Query
    }
  };

  // Ensure cursor is placed at the end when entering edit mode
  useEffect(() => {
    if (!editingCommentId) return;

    const focusToEnd = () => {
      const el = editTextareaRef.current;
      if (!el) return;
      el.focus();
      const length = el.value.length;
      el.setSelectionRange(length, length);
    };

    const raf = requestAnimationFrame(focusToEnd);
    return () => cancelAnimationFrame(raf);
  }, [editingCommentId, editingText]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gray-50">
      {/* Comments List */}
      <div ref={scrollContainerRef} className="custom-scrollbar flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <p className="mt-3 text-sm text-gray-500">Loading comments...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <MessageSquare className="h-6 w-6 text-red-500" />
            </div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">Error Loading Comments</h4>
            <p className="text-sm text-gray-500">
              {error instanceof Error ? error.message : 'Failed to load comments'}
            </p>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
            <h4 className="mb-1 text-sm font-semibold text-gray-700">No comments yet</h4>
            <p className="text-sm text-gray-500">
              Start a conversation by adding a comment below.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByDate).map(([dateKey, dateComments]) => (
              <div key={dateKey}>
                {/* Date Separator */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-50 px-3 text-xs font-medium text-gray-500">
                      {dateKey}
                    </span>
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {dateComments.map((c) => (
                    <div key={c.id}>
                      {editingCommentId === c.id ? (
                        <div className="rounded-lg border border-indigo-300 bg-white p-3 shadow-sm">
                          <textarea
                            ref={editTextareaRef}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit(c.id);
                              }
                            }}
                            className="min-h-[80px] w-full resize-none rounded-md border-0 bg-transparent p-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                            rows={3}
                          />
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <button
                              onClick={handleCancelEdit}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 active:scale-95"
                              type="button"
                              title="Cancel edit"
                              aria-label="Cancel edit"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSaveEdit(c.id)}
                              disabled={!editingText.trim() || updateMessageMutation.isPending}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                              type="button"
                              title="Save comment"
                              aria-label="Save comment"
                            >
                              {updateMessageMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <CommentBubble
                          user={c.user}
                          text={c.text}
                          time={c.time}
                          avatar={c.avatar}
                          showActions
                          onEdit={() => handleStartEdit(c)}
                          onDelete={() => handleDelete(c.id)}
                          isDeleting={deleteMessageMutation.isPending}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Scroll target - invisible div at the bottom */}
        <div ref={messagesEndRef} />
      </div>

      <CommentComposer taskId={taskId} />

    </div>
  );
};
