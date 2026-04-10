import React, { useState, useMemo } from 'react';
import RichTextEditor from '@/components/shared/RichTextEditor/RichTextEditor';
import Button from '@/components/ui/Button';
import { Pencil, Check, X } from 'lucide-react';

interface CustomTextAreaProps {
  value: string;
  onUpdate: (value: string) => void;
  placeholder?: string;
}

export const CustomTextArea: React.FC<CustomTextAreaProps> = ({
  value,
  onUpdate,
  placeholder = 'Add content...',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(value || '');
  const [lastSavedContent, setLastSavedContent] = useState(value || '');

  // Derive editing content from value when not editing
  const currentContent = useMemo(() => {
    if (!isEditing) {
      return value || '';
    }
    return editingContent;
  }, [value, isEditing, editingContent]);

  // Use value prop if available, otherwise fall back to last saved content (for immediate UI update after save)
  // This ensures the UI updates immediately after save, even before the parent updates the value prop
  const displayValue = useMemo(() => {
    // If value is updated from parent, use it
    if (value && value.trim() !== '') {
      return value;
    }
    // Fall back to last saved content if value hasn't updated yet (immediate UI feedback)
    if (lastSavedContent && lastSavedContent.trim() !== '') {
      return lastSavedContent;
    }
    return editingContent || '';
  }, [value, editingContent, lastSavedContent]);

  // View Mode: Show rendered HTML with Edit button
  if (!isEditing && displayValue && displayValue.trim() !== '') {
    return (
      <div className="group relative">
        <div
          className="prose prose-sm border-ocean-2/50 max-w-none rounded-lg border bg-white p-3 text-sm text-black/80"
          dangerouslySetInnerHTML={{ __html: displayValue }}
        />
        <button
          onClick={() => {
            setEditingContent(displayValue);
            setIsEditing(true);
          }}
          className="border-ocean-2/50 absolute top-2 right-2 flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-xs font-medium text-black opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Edit</span>
        </button>
      </div>
    );
  }

  // Edit Mode: Show RichTextEditor with Save/Cancel buttons
  return (
    <div className="space-y-2">
      <RichTextEditor
        content={currentContent}
        placeholder={placeholder}
        onChange={(content: { text: string; html: string; json: any }) => {
          setEditingContent(content.html);
          if (!isEditing) {
            setIsEditing(true);
          }
        }}
        editorContentClass="min-h-[120px] text-sm"
      />
      {/* Show Save/Cancel buttons when in edit mode */}
      {isEditing && (
        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={() => {
              setIsEditing(false);
              setEditingContent(value || '');
            }}
            size="xs"
            icon={<X className="h-4 w-4" />}
          >
            Cancel
          </Button>
          <Button
            size="xs"
            onClick={() => {
              // Update state immediately for instant UI feedback
              setLastSavedContent(editingContent);
              onUpdate(editingContent);
              setIsEditing(false);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
            icon={<Check className="h-4 w-4" />}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
};
