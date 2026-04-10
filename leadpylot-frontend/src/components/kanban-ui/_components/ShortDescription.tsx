'use client';

import React, { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { X, Check } from 'lucide-react';

interface ShortDescriptionProps {
  description: string;
  taskId: string;
  boardId: string;
  onUpdate: (description: string) => Promise<void>;
  isEditing?: boolean;
  onEditChange?: (isEditing: boolean) => void;
}

export const ShortDescription: React.FC<ShortDescriptionProps> = ({
  description,
  onUpdate,
  isEditing: externalIsEditing,
  onEditChange,
}) => {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const hasChangesRef = useRef(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalDescriptionRef = useRef<string>('');
  
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;
  const setIsEditing = onEditChange || setInternalIsEditing;

  // Initialize editDescription when entering edit mode
  useEffect(() => {
    if (isEditing) {
      // Remove <p> tags for editing (display plain text)
      const plainText = description
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .trim();
      
      originalDescriptionRef.current = plainText;
      
      // Use setTimeout to avoid cascading renders
      setTimeout(() => {
        setEditDescription(plainText);
        hasChangesRef.current = false;
        // Focus and position cursor at end
        if (textareaRef.current) {
          textareaRef.current.focus();
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 0);
    } else {
      // Cleanup timeout when closing
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    }
  }, [isEditing, description]);

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

    const trimmedDescription = editDescription.trim();
    
    // Only save if there are actual changes
    // If content hasn't changed, just close without saving
    if (trimmedDescription === originalDescriptionRef.current && !hasChangesRef.current) {
      setIsEditing(false);
      return;
    }
    
    // Wrap in <p> tag if there's content
    const formattedDescription = trimmedDescription 
      ? `<p>${trimmedDescription.replace(/\n/g, '<br>')}</p>` 
      : '';
    
    await onUpdate(formattedDescription);
    setIsEditing(false);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Check if focus is moving to another element within our component (like Save/Cancel buttons)
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget) {
      // Check if focus is moving to Save or Cancel button
      const isMovingToButton = relatedTarget.closest('button') !== null;
      if (isMovingToButton && textareaRef.current?.parentElement?.contains(relatedTarget)) {
        // Focus is moving to a button within our component, don't close
        return;
      }
    }

    // Add a delay before saving to prevent accidental closes
    // This allows space key and other inputs to register before blur fires
    blurTimeoutRef.current = setTimeout(() => {
      // Double-check that we're still supposed to be editing
      if (isEditing) {
        handleSave();
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
    setEditDescription('');
    setIsEditing(false);
    hasChangesRef.current = false;
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

    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
    // Don't prevent default for space or other keys - let them type normally
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditDescription(e.target.value);
    hasChangesRef.current = true;
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  // Only show when editing (when icon is clicked)
  // Don't show description by default
  if (!isEditing) {
    return null;
  }

  return (
    <div 
      className="space-y-2"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={editDescription}
        onChange={handleChange}
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
        placeholder="Add a description..."
        className="w-full resize-none rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        rows={3}
      />
      <div className="flex items-center justify-end gap-1">
        <Button
          size="xs"
          variant="default"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            e.preventDefault();
            handleCancel();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="rounded-sm px-2 py-1 text-xs"
          icon={<X className="h-3 w-3" />}
        >
          Cancel
        </Button>
        <Button
          size="xs"
          variant="secondary"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            e.preventDefault();
            handleSave();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="rounded-sm bg-indigo-500 px-2 py-1 text-xs text-white hover:bg-indigo-600"
          icon={<Check className="h-3 w-3" />}
        >
          Save
        </Button>
      </div>
    </div>
  );
};
