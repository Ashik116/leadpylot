'use client';

/**
 * AttachmentSelector Component
 * Allows selecting multiple attachments with checkboxes
 */

import { useState, useEffect } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { EmailAttachment } from '../../_types/email.types';

interface AttachmentSelectorProps {
  attachments: EmailAttachment[];
  selectedAttachments?: string[]; // Array of document_ids
  onChange: (selectedIds: string[]) => void;
  label?: string;
  helpText?: string;
  disabled?: boolean;
}

export default function AttachmentSelector({
  attachments,
  selectedAttachments = [],
  onChange,
  label = 'Select Attachments',
  helpText,
  disabled = false,
}: AttachmentSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedAttachments));

  useEffect(() => {
    setSelected(new Set(selectedAttachments));
  }, [selectedAttachments]);

  const handleToggle = (documentId: string) => {
    if (disabled) return;

    const newSelected = new Set(selected);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelected(newSelected);
    onChange(Array.from(newSelected));
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const allIds = attachments.map((att) => att.document_id);
    setSelected(new Set(allIds));
    onChange(allIds);
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    setSelected(new Set());
    onChange([]);
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            Select All
          </button>
          <span className="text-xs text-gray-400">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            disabled={disabled}
            className="text-xs text-gray-600 hover:text-gray-700 disabled:opacity-50"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Attachment List */}
      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50">
        {attachments.map((attachment) => (
          <div
            key={attachment.document_id}
            className={`flex items-center gap-3 border-b border-gray-200 p-3 last:border-b-0 ${
              disabled ? 'opacity-50' : 'cursor-pointer hover:bg-gray-100'
            }`}
            onClick={() => handleToggle(attachment.document_id)}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selected.has(attachment.document_id)}
              onChange={() => handleToggle(attachment.document_id)}
              disabled={disabled}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />

            {/* File Icon */}
            <ApolloIcon name="file" className="shrink-0 text-gray-400" />

            {/* File Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{attachment.filename}</p>
              <p className="text-xs text-gray-500">
                {(attachment.size / 1024).toFixed(1)} KB
                {attachment.approved && (
                  <span className="ml-2 text-green-600">• Currently Approved</span>
                )}
              </p>
            </div>

            {/* Selection Indicator */}
            {selected.has(attachment.document_id) && (
              <div className="shrink-0">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                  <ApolloIcon name="check" className="text-xs text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selection Summary */}
      <div className="text-xs text-gray-600">
        {selected.size} of {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}{' '}
        selected
      </div>
    </div>
  );
}
