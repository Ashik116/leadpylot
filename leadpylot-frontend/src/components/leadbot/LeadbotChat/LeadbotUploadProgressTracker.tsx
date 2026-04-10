'use client';

import { Check } from 'lucide-react';
import type { UploadProgressState } from '@/utils/leadbotUploadProgress';

interface LeadbotUploadProgressTrackerProps {
  state: UploadProgressState;
  compact?: boolean;
}

export function LeadbotUploadProgressTracker({ state, compact }: LeadbotUploadProgressTrackerProps) {
  const { steps, generatingDetail } = state;

  return (
    <div
      className={`flex flex-col gap-1.5 ${compact ? 'text-xxs' : 'text-xs'} text-gray-700`}
      data-testid="leadbot-upload-progress"
    >
      {steps.map((s) => {
        const displayTitle =
          s.key === 'generate' && generatingDetail !== null && generatingDetail !== undefined && generatingDetail !== ''
            ? generatingDetail
            : s.title;

        return (
          <div
            key={s.key}
            className={`flex items-center gap-2 rounded-md px-1 py-0.5 ${
              s.status === 'active' ? 'bg-white/80 font-medium text-gray-900' : 'text-gray-500'
            }`}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {s.status === 'done' ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} aria-hidden />
              ) : s.status === 'active' ? (
                <span className="flex gap-0.5" aria-hidden>
                  <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]" />
                  <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]" />
                  <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-gray-500" />
                </span>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300" aria-hidden />
              )}
            </span>
            <span className="min-w-0 leading-snug">{displayTitle}</span>
          </div>
        );
      })}
    </div>
  );
}
