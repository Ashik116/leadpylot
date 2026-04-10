'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { EmailMessage } from '../../_types/email.types';
import { format } from 'date-fns';

interface ThreadEmailSelectorProps {
  emails: EmailMessage[];
  primaryAgent?: string;
  selectedEmailIds?: string[];
  onChange: (selectedIds: string[], selectedEmails: EmailMessage[]) => void;
  disabled?: boolean;
}

export default function ThreadEmailSelector({
  emails,
  primaryAgent,
  selectedEmailIds = [],
  onChange,
  disabled = false,
}: ThreadEmailSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedEmailIds));

  useEffect(() => {
    setSelected(new Set(selectedEmailIds));
  }, [selectedEmailIds]);

  const visibleEmailIds = useMemo(() => {
    if (!primaryAgent || emails.length === 0) return [];
    return emails
      .filter((email) => {
        const visibleAgents = (email as any)?.visible_to_agents;
        return Array.isArray(visibleAgents) && visibleAgents.includes(primaryAgent);
      })
      .map((email) => email._id);
  }, [primaryAgent, emails]);

  useEffect(() => {
    if (!primaryAgent) {
      if (selected.size > 0) {
        setSelected(new Set());
        onChange([], []);
      }
      return;
    }

    if (visibleEmailIds.length > 0) {
      const currentSelected = Array.from(selected).sort();
      const visibleSorted = [...visibleEmailIds].sort();
      const isDifferent =
        currentSelected.length !== visibleSorted.length ||
        currentSelected.some((id, idx) => id !== visibleSorted[idx]);

      if (isDifferent) {
        const newSelected = new Set(visibleEmailIds);
        setSelected(newSelected);
        const selectedEmails = emails.filter((email) => newSelected.has(email._id));
        onChange(Array.from(newSelected), selectedEmails);
      }
    } else {
      setSelected(new Set());
      onChange([], []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryAgent, visibleEmailIds.join(',')]);

  useEffect(() => {
    if (emails.length === 1 && !disabled && selected.size === 0) {
      setSelected(new Set([emails[0]._id]));
      onChange([emails[0]._id], emails);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails.length]);

  const updateSelection = useCallback(
    (newSelected: Set<string>) => {
      setSelected(newSelected);
      const selectedIds = Array.from(newSelected);
      const selectedEmails = emails.filter((email) => newSelected.has(email._id));
      onChange(selectedIds, selectedEmails);
    },
    [emails, onChange]
  );

  const handleToggle = useCallback(
    (emailId: string) => {
      if (disabled) return;
      const newSelected = new Set(selected);
      newSelected.has(emailId) ? newSelected.delete(emailId) : newSelected.add(emailId);
      updateSelection(newSelected);
    },
    [disabled, selected, updateSelection]
  );

  const handleSelectAll = useCallback(() => {
    if (disabled) return;
    updateSelection(new Set(emails.map((email) => email._id)));
  }, [disabled, emails, updateSelection]);

  const handleDeselectAll = useCallback(() => {
    if (disabled) return;
    updateSelection(new Set());
  }, [disabled, updateSelection]);

  if (emails.length === 1) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
            2
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-900">
              Select Emails from Thread
            </label>
            <p className="text-xs text-gray-500">
              Choose which emails in this conversation the agent can see
            </p>
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
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white">
          {emails.map((email, index) => {
            const isSelected = selected.has(email._id);
            const hasAttachments = email.attachments && email.attachments.length > 0;

            return (
              <div
                key={email._id}
                className={`flex items-start gap-3 border-b border-gray-200 p-4 transition-colors last:border-b-0 ${
                  disabled ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'
                } ${isSelected ? 'bg-blue-50' : ''}`}
                onClick={() => handleToggle(email._id)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(email._id)}
                  disabled={disabled}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{email.from}</span>
                    {email.direction === 'outgoing' && (
                      <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        <ApolloIcon name="share" className="mr-1 text-xs" />
                        Sent
                      </span>
                    )}
                    {email.is_reply && index > 0 && (
                      <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        <ApolloIcon name="reply" className="mr-1 text-xs" />
                        Reply {index + 1}
                      </span>
                    )}
                    {hasAttachments && (
                      <span className="inline-flex items-center text-xs text-gray-500">
                        <ApolloIcon name="paperclip" className="mr-1 text-xs" />
                        {email.attachments.length}
                      </span>
                    )}
                  </div>
                  <p className="mb-1 text-xs text-gray-500">to: {email.to_address || email.to}</p>
                  <p className="line-clamp-2 text-sm text-gray-700">{email.body}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {format(new Date(email.received_at || email.sent_at), 'MMM d, h:mm a')}
                  </p>
                </div>

                {isSelected && (
                  <div className="mt-1 shrink-0">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                      <ApolloIcon name="check" className="text-xs text-white" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">
            {selected.size} of {emails.length} email{emails.length !== 1 ? 's' : ''} selected
          </span>
          {selected.size > 0 && (
            <span className="font-medium text-blue-600">
              Agent will see {selected.size} email{selected.size !== 1 ? 's' : ''} in thread
            </span>
          )}
        </div>
      </div>
    </>
  );
}
