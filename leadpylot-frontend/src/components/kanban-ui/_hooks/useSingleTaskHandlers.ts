import React, { useRef, useCallback, useEffect } from 'react';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useUpdateTask } from '@/hooks/useTasks';
import { Task } from '../types';

interface UseSingleTaskHandlersProps {
  singleTask: Task;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (updatedTask: Task) => void;
  unAssign?: boolean;
  selectedBoardId?: string | null;
  updateInboxCard?: (card: any) => void;
  // State setters
  setIsEditing: (value: boolean) => void;
  setEditTitle: (value: string) => void;
  // State values
  isEditing: boolean;
  editTitle: string;
  // Refs
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  measureRef: React.RefObject<HTMLSpanElement | null>;
}

export const useSingleTaskHandlers = ({
  singleTask,
  onClick,
  onDelete,
  onUpdate,
  unAssign,
  selectedBoardId,
  updateInboxCard,
  setIsEditing,
  setEditTitle,
  isEditing,
  editTitle,
  inputRef,
  measureRef,
}: UseSingleTaskHandlersProps) => {
  const updateTaskMutation = useUpdateTask();
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDoubleClickRef = useRef(false);

  // Utility function to update input size
  const updateInputSize = useCallback(() => {
    if (inputRef.current) {
      const cardElement = inputRef.current.closest('.group');
      const maxWidth = cardElement ? cardElement.clientWidth - 24 : 250; // Subtract padding
      
      // Reset height to auto to get the correct scrollHeight
      inputRef.current.style.height = 'auto';
      
      // Calculate width based on content
      if (measureRef.current) {
        measureRef.current.textContent = editTitle || 'Enter task title...';
        const contentWidth = measureRef.current.offsetWidth + 4;
        const newWidth = Math.min(Math.max(contentWidth, 100), maxWidth);
        inputRef.current.style.width = `${newWidth}px`;
      }
      
      // Set height based on scrollHeight (content height)
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = `${Math.max(scrollHeight, 20)}px`;
    }
  }, [editTitle, inputRef, measureRef]);

  // Handle double-click to edit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Mark that double-click happened
    isDoubleClickRef.current = true;
    // Clear any pending single click immediately
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setIsEditing(true);
    setEditTitle(singleTask.title);
    // Set initial input size based on content
    requestAnimationFrame(() => {
      updateInputSize();
    });
    // Reset the flag after a delay
    setTimeout(() => {
      isDoubleClickRef.current = false;
    }, 400);
  }, [singleTask.title, setIsEditing, setEditTitle, updateInputSize]);

  // Handle single click with delay for double-click detection
  const handleSingleClick = useCallback((e: React.MouseEvent) => {
    // Prevent opening modal if editing
    if (isEditing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // If double-click flag is set, don't proceed
    if (isDoubleClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Delay the click to allow double-click to cancel it
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => {
      // Check again if double-click happened during the delay
      if (!isDoubleClickRef.current && !isEditing) {
        onClick(singleTask.id);
      }
      clickTimeoutRef.current = null;
    }, 300); // 300ms delay to detect double-click
  }, [isEditing, onClick, singleTask.id]);

  // Handle keyboard events for title editing
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, handleSubmit: (e: React.FormEvent) => void, handleCancel: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, []);

  // Handle delete action
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(singleTask.id);
    }
  }, [onDelete, singleTask.id]);

  // Handle form submission for title editing
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = editTitle.trim();
    
    if (!trimmedTitle) {
      setIsEditing(false);
      return;
    }

    // Don't make API call if title hasn't changed
    if (trimmedTitle === singleTask.title) {
      setIsEditing(false);
      return;
    }

    try {
      const response = await updateTaskMutation.mutateAsync({
        id: singleTask.id,
        data: {
          taskTitle: trimmedTitle,
        },
      });

      // Update inbox card directly if unAssign is true and response exists
      if (unAssign && response?.data && updateInboxCard) {
        updateInboxCard(response.data);
      }

      toast.push(
        React.createElement(Notification, { title: "Success", type: "success" }, "Task updated successfully")
      );

      if (onUpdate) {
        onUpdate({ ...singleTask, title: trimmedTitle });
      }

      setIsEditing(false);
    } catch (error: any) {
      toast.push(
        React.createElement(Notification, { title: "Error", type: "danger" }, error?.message || 'Failed to update task. Please try again.')
      );
    }
  }, [editTitle, singleTask, setIsEditing, updateTaskMutation, unAssign, updateInboxCard, onUpdate]);

  // Handle cancel action for title editing
  const handleCancel = useCallback(() => {
    setEditTitle(singleTask.title);
    setIsEditing(false);
  }, [singleTask.title, setEditTitle, setIsEditing]);

  // Handle description update
  const handleUpdateDescription = useCallback(async (description: string) => {
    try {
      if (!selectedBoardId) {
        throw new Error('Board ID not found');
      }

      await updateTaskMutation.mutateAsync({
        id: singleTask.id,
        data: {
          taskDescription: description,
          board_id: selectedBoardId,
        },
      });

      toast.push(
        React.createElement(Notification, { title: "Success", type: "success" }, "Description updated successfully")
      );

      if (onUpdate) {
        onUpdate({ ...singleTask, description });
      }
    } catch (error: any) {
      toast.push(
        React.createElement(Notification, { title: "Error", type: "danger" }, error?.message || 'Failed to update description. Please try again.')
      );
    }
  }, [singleTask, selectedBoardId, updateTaskMutation, onUpdate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return {
    handleDoubleClick,
    handleSingleClick,
    handleTitleKeyDown,
    handleDelete,
    handleSubmit,
    handleCancel,
    handleUpdateDescription,
    updateInputSize,
    clickTimeoutRef,
    isDoubleClickRef,
  };
};
