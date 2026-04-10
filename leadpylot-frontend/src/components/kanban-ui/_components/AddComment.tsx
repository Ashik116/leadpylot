'use client';

import React, { useState, useRef } from 'react';
import { useCreateChatMessage } from '@/hooks/useInternalChat';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

interface AddCommentProps {
  taskId: string;
  onCommentAdded?: () => void;
  onCancel?: () => void;
}

export const AddComment: React.FC<AddCommentProps> = ({
  taskId,
  onCommentAdded,
  onCancel,
}) => {
  const [commentText, setCommentText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createMessageMutation = useCreateChatMessage();
  const isComposingRef = useRef(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recentEnterPressRef = useRef(false);

  const handleSave = async () => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    // Don't save if user is composing (IME input)
    if (isComposingRef.current) {
      return;
    }

    const trimmedText = commentText.trim();
    
    if (!trimmedText) {
      if (onCancel) {
        onCancel();
      }
      return;
    }

    try {
      await createMessageMutation.mutateAsync({
        taskId,
        message: trimmedText,
      });
      
      setCommentText('');
      
      toast.push(
        <Notification title="Success" type="success">
          Comment added successfully
        </Notification>
      );

      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error: any) {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.message || 'Failed to add comment. Please try again.'}
        </Notification>
      );
    }
  };

  const handleBlur = () => {
    // If Enter was just pressed, don't trigger blur immediately
    if (recentEnterPressRef.current) {
      recentEnterPressRef.current = false;
      return;
    }

    // Add a delay before saving to prevent accidental closes
    // This allows space key and other inputs to register before blur fires
    blurTimeoutRef.current = setTimeout(() => {
      // Only save if there's content
      if (commentText.trim()) {
        handleSave();
      } else if (onCancel) {
        onCancel();
      }
    }, 200);
  };

  const handleFocus = () => {
    // Clear any pending blur timeout when refocusing
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  };

  const handleCancel = () => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setCommentText('');
    if (onCancel) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Clear blur timeout when user is typing ANY key
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    // Prevent space from bubbling up to parent (which might cause blur)
    if (e.key === ' ') {
      e.stopPropagation();
    }

    if (e.key === 'Enter') {
      // Enter saves the comment (Shift+Enter for new line)
      if (e.shiftKey) {
        // Shift+Enter creates a new line
        e.stopPropagation();
        // Don't prevent default - allow new line
      } else {
        // Regular Enter saves
        e.preventDefault();
        e.stopPropagation();
        // Mark that Enter was pressed to prevent immediate blur
        recentEnterPressRef.current = true;
        setTimeout(() => {
          recentEnterPressRef.current = false;
        }, 100);
        handleSave();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
    // Don't prevent default for space or other keys - let them type normally
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  return (
    <div 
      className="space-y-2"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onKeyUp={() => {
          // Clear blur timeout on any key up as well
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
          }
        }}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        placeholder="Add a comment... (Enter to save, Shift+Enter for new line, Esc to cancel)"
        className="w-full resize-none rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        rows={3}
        autoFocus
      />
    </div>
  );
};
