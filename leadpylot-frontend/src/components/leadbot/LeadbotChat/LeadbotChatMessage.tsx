'use client';

import { useState, useRef, useMemo } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { getDocumentPreviewType } from '@/utils/documentUtils';
import type {
  LeadbotConversationMessage,
  LeadbotEmailDraftMetadata,
  LeadbotFeedbackSubmitResult,
  LeadbotMessageAttachment,
} from '@/types/leadbot.types';
import { parseLeadbotMessageFeedback } from '@/utils/leadbotFeedback';
import { buildPostResponseSummary } from '@/utils/leadbotToolSummary';
import 'highlight.js/styles/github.min.css';
import { LeadbotAssistantMessageContent } from './LeadbotAssistantMessageContent';
import { LeadbotUserMessageContent } from './LeadbotUserMessageContent';
import type { UploadProgressState } from '@/utils/leadbotUploadProgress';

interface LeadbotChatMessageProps {
  message: LeadbotConversationMessage;
  userInitials?: string;
  leadExpandView?: boolean;
  /** When true, shows placeholder for empty assistant messages (streaming) */
  isThinking?: boolean;
  /** Status text per FILE_HANDLE.md: "Thinking…", "Reading file(s)…", "Analysing document…" */
  thinkingStatusText?: string;
  /** Multipart stream: replaces single-line thinking text with a step tracker */
  uploadProgress?: UploadProgressState | null;
  onDelete?: () => void;
  onRegenerate?: () => void;
  onEditSubmit?: (content: string) => void;
  disabled?: boolean;
  onOpenComposeEmail?: any;
  onFeedbackSubmit?: (
    messageId: string,
    rating: 1 | -1,
    correction?: string
  ) => Promise<LeadbotFeedbackSubmitResult>;
}

export function LeadbotChatMessage({
  message,
  userInitials,
  leadExpandView,
  isThinking,
  thinkingStatusText = 'Thinking',
  uploadProgress,
  onDelete,
  onRegenerate,
  onEditSubmit,
  disabled,
  onOpenComposeEmail,
  onFeedbackSubmit,
}: LeadbotChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [attachmentPreview, setAttachmentPreview] = useState({
    isOpen: false,
    isLoading: false,
    isDownloading: false,
    previewUrl: null as string | null,
    previewType: 'other',
    documentName: undefined as string | undefined,
    selectedDocumentId: undefined as string | undefined,
  });
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const isUser = message.role === 'user';
  const compact = leadExpandView;
  const feedbackFromMeta = parseLeadbotMessageFeedback(message.metadata);
  const feedbackRating = feedbackFromMeta?.rating ?? null;
  const summary = useMemo(
    () => buildPostResponseSummary(message.tool_exchanges),
    [message.tool_exchanges]
  );

  if (message.role === 'system') {
    return (
      <div className="flex justify-center px-2 py-1" data-testid="leadbot-system-message">
        <p className={`text-center text-gray-500 italic ${compact ? 'text-xxs' : 'text-xs'}`}>{message.content}</p>
      </div>
    );
  }
  const canEdit = isUser && message.id && onEditSubmit;
  const canDelete = isUser && message.id && onDelete;
  const canCopyUserMessage = isUser && message.content.trim().length > 0;
  // Some model outputs include escaped newlines (`\n`) in plain text; normalize for markdown rendering.
  const assistantMessageText = message.content
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const hasAssistantMessageText = !isUser && assistantMessageText.length > 0;
  const draftMetadata =
    message.metadata &&
      (message.metadata as LeadbotEmailDraftMetadata).message_type === 'email_draft'
      ? (message.metadata as LeadbotEmailDraftMetadata)
      : null;

  const startEditing = () => {
    setEditValue(message.content);
    setIsEditing(true);
    requestAnimationFrame(() => editInputRef.current?.focus());
  };

  const handleEditSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && onEditSubmit) {
      onEditSubmit(trimmed);
      setIsEditing(false);
    }
  };

  const handleEditCancel = () => {
    setEditValue(message.content);
    setIsEditing(false);
  };

  const handleCopyAssistantMessage = async () => {
    if (!hasAssistantMessageText || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(assistantMessageText);
    } catch {
      // Ignore clipboard failures for this lightweight action row.
    }
  };

  const handleShareAssistantMessage = async () => {
    if (!hasAssistantMessageText) return;

    if (navigator.share) {
      try {
        await navigator.share({ text: assistantMessageText });
        return;
      } catch {
        // Fall back to copying if native share is dismissed or unavailable.
      }
    }

    await handleCopyAssistantMessage();
  };

  const handleCopyUserMessage = async () => {
    if (!canCopyUserMessage || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      // Ignore clipboard failures for this lightweight action row.
    }
  };

  const getAttachmentPreviewUrl = (attachment: LeadbotMessageAttachment) =>
    attachment.document_url ?? attachment.preview_url ?? attachment.url ?? null;

  const handleOpenAttachmentPreview = (attachment: LeadbotMessageAttachment) => {
    const previewUrl = getAttachmentPreviewUrl(attachment);
    if (!previewUrl) return;

    setAttachmentPreview({
      isOpen: true,
      isLoading: false,
      isDownloading: false,
      previewUrl,
      previewType: getDocumentPreviewType('', attachment.filename),
      documentName: attachment.filename,
      selectedDocumentId: previewUrl,
    });
  };

  const handleCloseAttachmentPreview = () => {
    setAttachmentPreview((prev) => ({
      ...prev,
      isOpen: false,
      isDownloading: false,
    }));
  };

  const handleDownloadAttachmentPreview = () => {
    if (!attachmentPreview.previewUrl) return;

    setAttachmentPreview((prev) => ({ ...prev, isDownloading: true }));

    try {
      const link = document.createElement('a');
      link.href = attachmentPreview.previewUrl;
      link.download = attachmentPreview.documentName ?? 'document';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setAttachmentPreview((prev) => ({ ...prev, isDownloading: false }));
    }
  };

  return (
    <div
      className={`group flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
      data-testid="leadbot-chat-message"
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-full text-white shadow-sm ${compact ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[11px] font-semibold'
          } ${isUser ? 'bg-gray-600' : 'bg-linear-to-br from-gray-500 to-gray-600'}`}
      >
        {isUser ? (
          (userInitials || 'U').toUpperCase().slice(0, 2)
        ) : (
          <ApolloIcon
            name="ai-stars"
            className={`text-white ${compact ? 'text-xs' : 'text-sm'}`}
            ariaLabel="AI assistant"
          />
        )}
      </div>
      <div className={`min-w-0 flex-1 ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
        <div
          className={`relative w-fit max-w-[85%] min-w-0 rounded-lg shadow-sm ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
            } ${isUser ? 'bg-gray-600 text-white' : 'bg-gray-200'
            } ${!isUser ? 'custom-scrollbar overflow-x-auto' : ''}`}
        >
          {isUser ? (
            <LeadbotUserMessageContent
              message={message}
              compact={compact}
              isEditing={isEditing}
              editValue={editValue}
              disabled={disabled}
              canCopyUserMessage={canCopyUserMessage}
              canEdit={Boolean(canEdit)}
              canDelete={Boolean(canDelete)}
              editInputRef={editInputRef}
              onEditValueChange={setEditValue}
              onEditSubmit={handleEditSubmit}
              onEditCancel={handleEditCancel}
              onStartEditing={startEditing}
              onDelete={onDelete}
              onCopyUserMessage={handleCopyUserMessage}
              onOpenAttachmentPreview={handleOpenAttachmentPreview}
              getAttachmentPreviewUrl={getAttachmentPreviewUrl}
            />
          ) : (
            <LeadbotAssistantMessageContent
              compact={compact}
              isThinking={isThinking}
              rawMessageContent={message.content}
              assistantMessageText={assistantMessageText}
              thinkingStatusText={thinkingStatusText}
              uploadProgress={uploadProgress}
              summaryItems={summary.visibleItems}
              summaryAdditionalChecks={summary.additionalChecks}
              summaryTotalChecks={summary.totalChecks}
              draftMetadata={draftMetadata}
              hasAssistantMessageText={hasAssistantMessageText}
              feedbackRating={feedbackRating}
              disabled={disabled}
              messageId={message.id}
              onOpenComposeEmail={onOpenComposeEmail}
              onRegenerate={onRegenerate}
              onFeedbackSubmit={onFeedbackSubmit}
              onCopyAssistantMessage={handleCopyAssistantMessage}
              onShareAssistantMessage={handleShareAssistantMessage}
            />
          )}
        </div>
      </div>
      <DocumentPreviewDialog
        isOpen={attachmentPreview.isOpen}
        onClose={handleCloseAttachmentPreview}
        previewUrl={attachmentPreview.previewUrl}
        previewType={attachmentPreview.previewType}
        isLoading={attachmentPreview.isLoading}
        selectedDocumentId={attachmentPreview.selectedDocumentId}
        onDownload={handleDownloadAttachmentPreview}
        isDownloading={attachmentPreview.isDownloading}
        documentName={attachmentPreview.documentName}
        title="Document Preview"
      />
    </div>
  );
}
