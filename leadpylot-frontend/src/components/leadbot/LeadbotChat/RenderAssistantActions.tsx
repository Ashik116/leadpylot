'use client';

import { useState } from 'react';
import { Button, Tooltip } from '@/components/ui';
import ApolloIcon from '@/components/ui/ApolloIcon';
import toast from '@/components/ui/toast';
import { Copy, RotateCcw, Share2, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { LeadbotEmailDraftMetadata, LeadbotFeedbackSubmitResult } from '@/types/leadbot.types';
import { LeadbotFeedbackDownModal } from './LeadbotFeedbackDownModal';
import { leadbotRichTooltipTitle } from './leadbotRichTooltip';

const assistantActionButtonClass = (active = false) =>
  `inline-flex h-7 w-7 items-center justify-center rounded transition-colors
    ${active ? 'bg-gray-300 text-gray-900' : 'text-gray-500 hover:bg-gray-300/80 hover:text-gray-900'}
    disabled:cursor-not-allowed disabled:opacity-40`;

const feedbackButtonClass = (state: 'neutral' | 'up' | 'down', active = false) => {
  if (active && state === 'up') {
    return `inline-flex h-7 w-7 items-center justify-center rounded border border-emerald-300 text-emerald-700 transition-colors`;
  }
  if (active && state === 'down') {
    return `inline-flex h-7 w-7 items-center justify-center rounded border border-rose-300 text-rose-700 transition-colors`;
  }
  if (state === 'up') {
    return `inline-flex h-7 w-7 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-300/80 hover:text-emerald-700`;
  }
  return `inline-flex h-7 w-7 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-300/80 hover:text-rose-700`;
};

type TRenderAssistantActions = {
  handleCopyAssistantMessage?: () => void;
  hasAssistantMessageText?: boolean;
  handleShareAssistantMessage?: () => void;
  onRegenerate?: () => void;
  disabled?: boolean;
  onOpenComposeEmail?: (draft: LeadbotEmailDraftMetadata) => void;
  draftMetadata?: LeadbotEmailDraftMetadata | null;
  /** Assistant message id (required for feedback). */
  messageId?: string;
  /** From server `metadata.feedback` — locks thumbs when set. */
  feedbackRating?: 1 | -1 | null;
  /** Called after successful POST; show thanks. */
  onFeedbackSubmit?: (
    messageId: string,
    rating: 1 | -1,
    correction?: string
  ) => Promise<LeadbotFeedbackSubmitResult>;
};

export default function RenderAssistantActions({
  handleCopyAssistantMessage,
  draftMetadata,
  onOpenComposeEmail,
  hasAssistantMessageText,
  handleShareAssistantMessage,
  onRegenerate,
  disabled,
  messageId,
  feedbackRating,
  onFeedbackSubmit,
}: TRenderAssistantActions) {
  const [localSelected, setLocalSelected] = useState<'up' | 'down' | null>(null);
  const [feedbackDisabled, setFeedbackDisabled] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [downModalOpen, setDownModalOpen] = useState(false);

  const serverLocked = feedbackRating !== null && feedbackRating !== undefined;
  const selectedUp = feedbackRating === 1 || localSelected === 'up';
  const selectedDown = feedbackRating === -1 || localSelected === 'down';
  const thumbsDisabled = disabled || !messageId || !hasAssistantMessageText || feedbackDisabled || serverLocked;

  const applyFeedbackUi = (rating: 1 | -1) => {
    setLocalSelected(rating === 1 ? 'up' : 'down');
    setFeedbackDisabled(true);
    setStatusText('Thanks for your feedback.');
  };

  const handleThumbUp = async () => {
    if (!messageId || !onFeedbackSubmit) return;
    try {
      const result = await onFeedbackSubmit(messageId, 1);
      if (result.ok) {
        applyFeedbackUi(1);
      } else if (result.conflict) {
        applyFeedbackUi(result.existing_rating);
        toast.push(<span className="text-sm text-gray-700">{result.message}</span>);
      }
    } catch (e) {
      toast.push(
        <span className="text-sm text-red-600">{e instanceof Error ? e.message : 'Feedback failed'}</span>
      );
    }
  };

  const handleThumbDown = () => {
    if (!messageId || !onFeedbackSubmit) return;
    setDownModalOpen(true);
  };

  const handleDownModalSubmit = async (correction: string) => {
    if (!messageId || !onFeedbackSubmit) return;
    try {
      const result = await onFeedbackSubmit(messageId, -1, correction || undefined);
      if (result.ok) {
        applyFeedbackUi(-1);
      } else if (result.conflict) {
        applyFeedbackUi(result.existing_rating);
        toast.push(<span className="text-sm text-gray-700">{result.message}</span>);
      }
    } catch (e) {
      toast.push(
        <span className="text-sm text-red-600">{e instanceof Error ? e.message : 'Feedback failed'}</span>
      );
    }
  };

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="inline-flex w-fit items-center gap-0.5 rounded-md px-1 shadow-sm">
        {draftMetadata && onOpenComposeEmail && (
          <Tooltip
            title={leadbotRichTooltipTitle('Send mail', 'Open email draft in composer.')}
            placement="top"
            wrapperClass="inline-flex"
          >
            <Button
              variant="plain"
              size="xs"
              type="button"
              icon={<ApolloIcon name="mail-upload" />}
              onClick={() => onOpenComposeEmail(draftMetadata)}
              className="border bg-transparent text-base font-light"
            >
              Send Mail
            </Button>
          </Tooltip>
        )}
        <Tooltip
          title={leadbotRichTooltipTitle('Copy', 'Copy this message to your clipboard.')}
          placement="top"
          wrapperClass="inline-flex"
        >
          <button
            type="button"
            className={assistantActionButtonClass()}
            aria-label="Copy"
            onClick={() => {
              void handleCopyAssistantMessage?.();
            }}
            disabled={!hasAssistantMessageText}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        {onFeedbackSubmit && messageId && (
          <>
            <Tooltip
              title={leadbotRichTooltipTitle('Helpful', 'Mark this answer as helpful.')}
              placement="top"
              wrapperClass="inline-flex"
            >
              <button
                type="button"
                className={`${feedbackButtonClass('up', selectedUp)} disabled:cursor-not-allowed disabled:opacity-40`}
                aria-label="Thumbs up"
                aria-pressed={selectedUp}
                onClick={() => void handleThumbUp()}
                disabled={thumbsDisabled}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip
              title={leadbotRichTooltipTitle('Not helpful', 'Leave optional feedback about what was wrong.')}
              placement="top"
              wrapperClass="inline-flex"
            >
              <button
                type="button"
                className={`${feedbackButtonClass('down', selectedDown)} disabled:cursor-not-allowed disabled:opacity-40`}
                aria-label="Thumbs down"
                aria-pressed={selectedDown}
                onClick={handleThumbDown}
                disabled={thumbsDisabled}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </>
        )}
        <Tooltip
          title={leadbotRichTooltipTitle('Share', 'Share this message or copy it to your clipboard.')}
          placement="top"
          wrapperClass="inline-flex"
        >
          <button
            type="button"
            className={assistantActionButtonClass()}
            aria-label="Share"
            onClick={() => {
              void handleShareAssistantMessage?.();
            }}
            disabled={!hasAssistantMessageText}
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        {onRegenerate && (
          <Tooltip
            title={leadbotRichTooltipTitle('Regenerate', 'Generate a new response for the last question.')}
            placement="top"
            wrapperClass="inline-flex"
          >
            <button
              type="button"
              className={assistantActionButtonClass()}
              onClick={onRegenerate}
              disabled={disabled}
              aria-label="Regenerate"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        )}
      </div>
      {statusText && <p className="text-xxs text-gray-500">{statusText}</p>}
      <LeadbotFeedbackDownModal
        isOpen={downModalOpen}
        onClose={() => setDownModalOpen(false)}
        onSubmit={(correction) => {
          void handleDownModalSubmit(correction);
        }}
      />
    </div>
  );
}
