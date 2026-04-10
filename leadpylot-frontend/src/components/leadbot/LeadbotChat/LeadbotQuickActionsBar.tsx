'use client';

import Tooltip from '@/components/ui/Tooltip';
import type { LeadbotQuickAction } from '@/types/leadbot.types';
import { leadbotRichTooltipTitle } from './leadbotRichTooltip';

interface LeadbotQuickActionsBarProps {
  actions: LeadbotQuickAction[];
  isLoading?: boolean;
  disabled?: boolean;
  onSelect: (action: LeadbotQuickAction) => void;
  className?: string;
}

export function LeadbotQuickActionsBar({
  actions,
  isLoading = false,
  disabled = false,
  onSelect,
  className = '',
}: LeadbotQuickActionsBarProps) {
  if (!isLoading && actions.length === 0) {
    return null;
  }

  return (
    <div
      className={`shrink-0 border-t border-gray-200/80 bg-gray-50/90 px-4 py-2 ${className}`}
      role="region"
      aria-label="Quick actions"
    >
      {isLoading ? (
        <p className="text-xs text-gray-400">Loading quick actions…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const canSend = a.available && !disabled;
            const isUnavailable = !a.available;

            return (
              <Tooltip
                key={a.slug}
                title={
                  isUnavailable
                    ? leadbotRichTooltipTitle(a.label, `${a.message} (Not available right now)`)
                    : leadbotRichTooltipTitle(a.label, a.message)
                }
                placement="top"
                wrapperClass="inline-flex max-w-full"
              >
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={() => {
                    if (canSend) onSelect(a);
                  }}
                  className={`max-w-full truncate rounded-full border px-3 py-1.5 text-left text-xs font-medium shadow-sm transition ${
                    isUnavailable
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                  }`}
                >
                  {a.label}
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
