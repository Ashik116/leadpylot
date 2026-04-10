'use client';

import { Copy, ExternalLink, FileText, Mic, Pencil, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import type { LeadbotConversationMessage, LeadbotMessageAttachment, LeadbotVoiceAttachment } from '@/types/leadbot.types';
import { leadbotRichTooltipTitle } from './leadbotRichTooltip';

interface LeadbotUserMessageContentProps {
  message: LeadbotConversationMessage;
  compact?: boolean;
  isEditing: boolean;
  editValue: string;
  disabled?: boolean;
  canCopyUserMessage: boolean;
  canEdit: boolean;
  canDelete: boolean;
  editInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onEditValueChange: (value: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onStartEditing: () => void;
  onDelete?: () => void;
  onCopyUserMessage: () => Promise<void>;
  onOpenAttachmentPreview: (attachment: LeadbotMessageAttachment) => void;
  getAttachmentPreviewUrl: (attachment: LeadbotMessageAttachment) => string | null;
}

export function LeadbotUserMessageContent({
  message,
  compact,
  isEditing,
  editValue,
  disabled,
  canCopyUserMessage,
  canEdit,
  canDelete,
  editInputRef,
  onEditValueChange,
  onEditSubmit,
  onEditCancel,
  onStartEditing,
  onDelete,
  onCopyUserMessage,
  onOpenAttachmentPreview,
  getAttachmentPreviewUrl,
}: LeadbotUserMessageContentProps) {
  if (isEditing) {
    return (
      <div className="space-y-2">
        <textarea
          ref={editInputRef}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className={`w-full resize-none rounded border border-gray-500 bg-gray-700 text-white placeholder-gray-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-none ${compact ? 'p-1.5 text-xs' : 'p-2 text-sm'}`}
          rows={3}
          disabled={disabled}
        />
        <div className="flex gap-1">
          <Button
            variant="plain"
            size="xs"
            onClick={onEditSubmit}
            disabled={!editValue.trim() || disabled}
          >
            Save
          </Button>
          <Button variant="plain" size="xs" onClick={onEditCancel} disabled={disabled}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const docAttachments = message.document_attachments ?? message.attachments ?? [];
  const voiceAttachments = message.voice_attachments ?? [];
  const hasAnyAttachments = docAttachments.length > 0 || voiceAttachments.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center">
        <p
          className={`wrap-break-words leading-relaxed whitespace-pre-wrap ${compact ? 'text-xs' : 'text-sm'} text-white`}
        >
          {message.content}
        </p>
        {(canCopyUserMessage || canEdit || canDelete) && (
          <div className="absolute right-0 bottom-0 mr-1 flex shrink-0 bg-gray-600 px-1 opacity-0 transition-opacity group-hover:opacity-100">
            {canCopyUserMessage && (
              <Tooltip
                title={leadbotRichTooltipTitle('Copy', 'Copy this message to your clipboard.')}
                placement="top"
                wrapperClass="inline-flex"
              >
                <Button
                  variant="plain"
                  onClick={() => {
                    void onCopyUserMessage();
                  }}
                  aria-label="Copy"
                  className="group/copy"
                  icon={<Copy className="h-3.5 w-3.5 text-white group-hover/copy:text-gray-900" />}
                />
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip
                title={leadbotRichTooltipTitle('Edit', 'Edit and resend this message to get a new reply.')}
                placement="top"
                wrapperClass="inline-flex"
              >
                <Button
                  variant="plain"
                  onClick={onStartEditing}
                  disabled={disabled}
                  className="group/pen"
                  aria-label="Edit"
                  icon={<Pencil className="h-3.5 w-3.5 text-white group-hover/pen:text-gray-900" />}
                />
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip
                title={leadbotRichTooltipTitle('Delete', 'Remove this message from the conversation.')}
                placement="top"
                wrapperClass="inline-flex"
              >
                <Button
                  variant="plain"
                  onClick={onDelete}
                  disabled={disabled}
                  aria-label="Delete"
                  icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
                />
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {hasAnyAttachments && (
        <div className="flex flex-col gap-1.5">
          {docAttachments.map((att, idx) => {
            const viewUrl = getAttachmentPreviewUrl(att);
            if (!viewUrl) {
              return (
                <span
                  key={`doc-${idx}`}
                  className={`inline-flex items-center gap-1 rounded bg-gray-500/50 px-1.5 py-0.5 ${compact ? 'text-xxs' : 'text-xs'} text-gray-200`}
                  title={att.subject ?? att.filename}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="max-w-[120px] min-w-0 truncate sm:max-w-[180px]">{att.filename}</span>
                </span>
              );
            }
            return (
              <button
                key={`doc-${idx}`}
                type="button"
                onClick={() => onOpenAttachmentPreview(att)}
                className={`flex shrink-0 min-w-0 items-center gap-1 rounded bg-gray-500/50 px-1.5 py-0.5 text-left hover:bg-gray-500/70 ${compact ? 'text-xxs' : 'text-xs'} cursor-pointer text-gray-200 transition-colors`}
                title={`Preview ${att.filename}`}
              >
                <FileText className="h-3 w-3 shrink-0" />
                <span className="min-w-0 truncate">{att.filename}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
              </button>
            );
          })}

          {voiceAttachments.map((att: LeadbotVoiceAttachment, idx: number) => (
            <div
              key={`voice-${idx}`}
              className={`rounded bg-gray-500/50 px-1.5 py-1 ${compact ? 'text-xxs' : 'text-xs'} text-gray-200`}
              title={att.transcript}
            >
              <div className="flex items-center gap-1">
                <Mic className="h-3 w-3 shrink-0" />
                <span className="max-w-[120px] min-w-0 truncate sm:max-w-[180px]">{att.filename}</span>
              </div>
              {att.transcript && <p className="mt-0.5 line-clamp-2 text-gray-300">{att.transcript}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
