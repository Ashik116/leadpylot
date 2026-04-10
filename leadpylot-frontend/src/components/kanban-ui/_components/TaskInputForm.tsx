'use client';

import React, { useRef, useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';

const DEFAULT_MAX_HEIGHT_REM = 12;
const REM_PX = 16;

interface TaskInputFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  placeholder?: string;
  submitText?: string;
  isLoading?: boolean;
  className?: string;
  maxHeightInRem?: number;
  title?: string;
}

export const TaskInputForm: React.FC<TaskInputFormProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = 'Enter a title...',
  submitText = 'Save',
  isLoading = false,
  className = '',
  maxHeightInRem = DEFAULT_MAX_HEIGHT_REM,
  title = 'Task creation from global',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxHeightPx = maxHeightInRem * REM_PX;

  useLayoutEffect(() => {
    const field = textareaRef.current;
    if (!field) return;
    field.style.height = 'auto';
    const contentHeight = field.scrollHeight;
    field.style.height = `${Math.min(contentHeight, maxHeightPx)}px`;
  }, [value, maxHeightPx]);

  return (
    <>
      {title ? <h3 className="text-sm font-medium text-gray-900 pb-1">{title}</h3> : null}
      <form
        onSubmit={onSubmit}
        className={` ${className}`}
      >
        <textarea
          ref={textareaRef}
          autoFocus
          rows={1}
          className=" w-full min-h-10 max-w-full resize-none overflow-x-auto overflow-y-auto bg-transparent p-2 text-[14px] text-black focus:ring-0 focus:outline-none border-ocean-2/50 rounded-lg border focus:border-ocean-2"
          style={{ maxHeight: `${maxHeightInRem}rem` }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            } else if (e.key === 'Escape') {
              onCancel();
            }
          }}
        />
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="xs"
            type="submit"
            disabled={value.trim() === '' || isLoading}
            className="rounded-sm"
          >
            {isLoading ? 'Processing...' : submitText}
          </Button>
          <Button variant="plain" size="xs" type="button" onClick={onCancel} className="rounded-sm">
            <X className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </form>
    </>
  );
};
