'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { EmailMessage, EmailAttachment } from '../../_types/email.types';

interface ThreadAttachmentSelectorProps {
  selectedEmails: EmailMessage[];
  selectedAttachmentIds?: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
  hasThread?: boolean;
}

export default function ThreadAttachmentSelector({
  selectedEmails,
  selectedAttachmentIds = [],
  onChange,
  disabled = false,
  hasThread = false,
}: ThreadAttachmentSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedAttachmentIds));

  useEffect(() => {
    setSelected(new Set(selectedAttachmentIds));
  }, [selectedAttachmentIds]);

  const emailsWithAttachments = useMemo(
    () => selectedEmails.filter((email) => email.attachments && email.attachments.length > 0),
    [selectedEmails]
  );

  const totalAttachments = useMemo(
    () => emailsWithAttachments.reduce((sum, email) => sum + (email.attachments?.length || 0), 0),
    [emailsWithAttachments]
  );

  const allAttachmentIds = useMemo(
    () =>
      emailsWithAttachments.flatMap(
        (email) => email.attachments?.map((att) => att.document_id) || []
      ),
    [emailsWithAttachments]
  );

  const updateSelection = useCallback(
    (newSelected: Set<string>) => {
      setSelected(newSelected);
      onChange(Array.from(newSelected));
    },
    [onChange]
  );

  const handleToggle = useCallback(
    (documentId: string) => {
      if (disabled) return;
      const newSelected = new Set(selected);
      newSelected.has(documentId) ? newSelected.delete(documentId) : newSelected.add(documentId);
      updateSelection(newSelected);
    },
    [disabled, selected, updateSelection]
  );

  const handleSelectAll = useCallback(() => {
    if (disabled) return;
    updateSelection(new Set(allAttachmentIds));
  }, [disabled, allAttachmentIds, updateSelection]);

  const handleDeselectAll = useCallback(() => {
    if (disabled) return;
    updateSelection(new Set());
  }, [disabled, updateSelection]);

  if (emailsWithAttachments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-600">
            {hasThread ? '3' : '2'}
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-900">
              Select Attachments
            </label>
            <p className="text-xs text-gray-500">Choose which attachments the agent can see</p>
          </div>
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

      <div className="space-y-3">
        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white">
          {emailsWithAttachments.map((email, emailIndex) => {
            const emailAttachments = email.attachments || [];

            return (
              <div key={email._id} className="border-b border-gray-200 last:border-b-0">
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2">
                  <ApolloIcon name="mail" className="text-sm text-gray-400" />
                  <span className="truncate text-sm font-medium text-gray-700">
                    {email.is_reply && emailIndex > 0
                      ? `Reply ${emailIndex + 1}`
                      : 'Original Email'}{' '}
                    - {email.from}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({emailAttachments.length} attachment{emailAttachments.length !== 1 ? 's' : ''})
                  </span>
                </div>

                <div>
                  {emailAttachments.map((attachment: EmailAttachment) => {
                    const isSelected = selected.has(attachment.document_id);

                    return (
                      <div
                        key={attachment.document_id}
                        className={`flex items-center gap-3 border-b border-gray-100 px-4 py-3 transition-colors last:border-b-0 ${
                          disabled ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'
                        } ${isSelected ? 'bg-blue-50' : ''}`}
                        onClick={() => handleToggle(attachment.document_id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(attachment.document_id)}
                          disabled={disabled}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <ApolloIcon name="file" className="shrink-0 text-gray-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(attachment.size / 1024).toFixed(1)} KB
                            {attachment.approved && (
                              <span className="ml-2 text-green-600">• Currently Approved</span>
                            )}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="shrink-0">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                              <ApolloIcon name="check" className="text-xs text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-gray-600">
          {selected.size} of {totalAttachments} attachment{totalAttachments !== 1 ? 's' : ''}{' '}
          selected
        </div>
      </div>
    </>
  );
}
