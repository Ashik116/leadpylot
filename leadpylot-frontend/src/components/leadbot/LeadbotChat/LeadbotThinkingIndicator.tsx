'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';

interface LeadbotThinkingIndicatorProps {
  leadExpandView?: boolean;
  /** Status text per FILE_HANDLE.md: "Thinking…", "Reading file(s)…", "Analysing document…" */
  statusText?: string;
}

export function LeadbotThinkingIndicator({ leadExpandView, statusText = 'Thinking' }: LeadbotThinkingIndicatorProps) {
  const compact = leadExpandView;

  return (
    <div className="flex items-center gap-2 py-0.5" data-testid="leadbot-thinking-indicator">
      <div
        className={`flex shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
          compact ? 'h-6 w-6' : 'h-8 w-8'
        } bg-linear-to-br from-gray-500 to-gray-600`}
      >
        <ApolloIcon
          name="ai-stars"
          className={`text-white ${compact ? 'text-xs' : 'text-sm'}`}
          ariaLabel="AI thinking"
        />
      </div>
      <div
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 bg-gray-200 ${
          compact ? 'text-xs' : 'text-sm'
        } text-gray-500 italic`}
      >
        <span>{statusText}</span>
        <span className="flex gap-0.5">
          <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
          <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
          <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-gray-400" />
        </span>
      </div>
    </div>
  );
}
