'use client';

import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import type { LeadbotEmailDraftMetadata, LeadbotFeedbackSubmitResult } from '@/types/leadbot.types';
import type { ActivityItem } from '@/utils/leadbotToolSummary';
import type { UploadProgressState } from '@/utils/leadbotUploadProgress';
import RenderAssistantActions from './RenderAssistantActions';
import { LeadbotUploadProgressTracker } from './LeadbotUploadProgressTracker';
import { LeadbotWorkSummary } from './LeadbotWorkSummary';

interface LeadbotAssistantMessageContentProps {
  compact?: boolean;
  isThinking?: boolean;
  rawMessageContent: string;
  assistantMessageText: string;
  thinkingStatusText: string;
  uploadProgress?: UploadProgressState | null;
  summaryItems: ActivityItem[];
  summaryAdditionalChecks: number;
  summaryTotalChecks: number;
  draftMetadata: LeadbotEmailDraftMetadata | null;
  hasAssistantMessageText: boolean;
  feedbackRating: 1 | -1 | null;
  disabled?: boolean;
  messageId?: string;
  onOpenComposeEmail?: (draft: LeadbotEmailDraftMetadata) => void;
  onRegenerate?: () => void;
  onFeedbackSubmit?: (
    messageId: string,
    rating: 1 | -1,
    correction?: string
  ) => Promise<LeadbotFeedbackSubmitResult>;
  onCopyAssistantMessage: () => Promise<void>;
  onShareAssistantMessage: () => Promise<void>;
}

export function LeadbotAssistantMessageContent({
  compact,
  isThinking,
  rawMessageContent,
  assistantMessageText,
  thinkingStatusText,
  uploadProgress,
  summaryItems,
  summaryAdditionalChecks,
  summaryTotalChecks,
  draftMetadata,
  hasAssistantMessageText,
  feedbackRating,
  disabled,
  messageId,
  onOpenComposeEmail,
  onRegenerate,
  onFeedbackSubmit,
  onCopyAssistantMessage,
  onShareAssistantMessage,
}: LeadbotAssistantMessageContentProps) {
  if (isThinking && !rawMessageContent) {
    return (
      <div className="flex flex-col items-start gap-2">
        {uploadProgress ? (
          <LeadbotUploadProgressTracker state={uploadProgress} compact={compact} />
        ) : (
          <div
            className={`inline-flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} text-gray-500 italic`}
          >
            <span>{thinkingStatusText}</span>
            <span className="flex gap-0.5">
              <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
              <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
              <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-gray-400" />
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <div className="relative flex min-w-0 items-start gap-1.5">
        <div
          className={`leadbot-markdown custom-scrollbar max-w-full min-w-0 overflow-x-auto leading-relaxed ${compact ? 'text-xs' : 'text-sm'} text-gray-900 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-800 [&_pre]:p-3 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:pl-5`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              h1: ({ children }) => (
                <h1 className="mt-3 mb-2 text-[16px] leading-snug font-semibold text-gray-900 first:mt-0 last:mb-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mt-3 mb-2 text-[15px] leading-snug font-semibold text-gray-900 first:mt-0 last:mb-0">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mt-2.5 mb-1.5 text-sm leading-snug font-semibold text-gray-900 first:mt-0 last:mb-0">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="mt-2 mb-1.5 text-sm leading-snug font-medium text-gray-900 first:mt-0 last:mb-0">
                  {children}
                </h4>
              ),
              h5: ({ children }) => (
                <h5 className="mt-2 mb-1 text-[13px] leading-snug font-medium text-gray-900 first:mt-0 last:mb-0">
                  {children}
                </h5>
              ),
              h6: ({ children }) => (
                <h6 className="mt-2 mb-1 text-[13px] leading-snug font-medium text-gray-700 first:mt-0 last:mb-0">
                  {children}
                </h6>
              ),
              p: ({ children }) => <p className="mb-2 text-gray-900 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
              ol: ({ children }) => (
                <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>
              ),
              li: ({ children }) => <li className="text-gray-900 marker:text-gray-500">{children}</li>,
              strong: ({ children }) => <strong className="font-medium text-gray-900">{children}</strong>,
              table: ({ children }) => (
                <div className="mb-2 overflow-x-auto last:mb-0">
                  <table className="w-full border-collapse text-sm">{children}</table>
                </div>
              ),
              hr: () => <hr className="my-3 border-gray-300/80" />,
              thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
              th: ({ children }) => (
                <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">
                  {children}
                </th>
              ),
              td: ({ children }) => <td className="border border-gray-300 px-2 py-1 text-gray-800">{children}</td>,
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.9em]" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {assistantMessageText}
          </ReactMarkdown>
        </div>
      </div>

      <LeadbotWorkSummary
        items={summaryItems}
        additionalChecks={summaryAdditionalChecks}
        totalChecks={summaryTotalChecks}
      />

      <RenderAssistantActions
        handleCopyAssistantMessage={() => {
          void onCopyAssistantMessage();
        }}
        draftMetadata={draftMetadata}
        onOpenComposeEmail={onOpenComposeEmail}
        hasAssistantMessageText={hasAssistantMessageText}
        handleShareAssistantMessage={() => {
          void onShareAssistantMessage();
        }}
        onRegenerate={onRegenerate}
        disabled={disabled}
        messageId={messageId}
        feedbackRating={feedbackRating}
        onFeedbackSubmit={onFeedbackSubmit}
      />
    </div>
  );
}
