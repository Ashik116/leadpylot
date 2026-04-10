'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import type { ActivityItem } from '@/utils/leadbotToolSummary';

interface LeadbotWorkSummaryProps {
  items: ActivityItem[];
  additionalChecks: number;
  totalChecks: number;
}

export function LeadbotWorkSummary({
  items,
  additionalChecks,
  totalChecks,
}: LeadbotWorkSummaryProps) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="mt-2 w-full rounded-lg border border-gray-200 bg-white/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50/90"
        aria-expanded={open}
        aria-controls="leadbot-work-summary-panel"
        id="leadbot-work-summary-trigger"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-gray-500" aria-hidden>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800">AI Work Summary</p>
            {!open && (
              <p className="truncate text-xxs text-gray-500">
                {totalChecks} CRM check{totalChecks !== 1 ? 's' : ''} · tap to expand
              </p>
            )}
            {open && <p className="text-xxs text-gray-500">Verified with live CRM checks</p>}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xxs font-medium text-gray-700">
          {totalChecks}
        </span>
      </button>

      {open && (
        <div
          id="leadbot-work-summary-panel"
          role="region"
          aria-labelledby="leadbot-work-summary-trigger"
          className="border-t border-gray-100 px-3 pb-2 pt-1"
        >
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.key} className="flex items-start gap-1.5 text-xs text-gray-700">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <p>
                  {item.title}
                  {item.status === 'empty' && <span className="text-gray-500"> - no matching records</span>}
                  {item.status !== 'empty' && item.detail && (
                    <span className="text-gray-500"> - {item.detail}</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {additionalChecks > 0 && (
            <p className="mt-1 text-xxs text-gray-500">+{additionalChecks} additional checks</p>
          )}

          <p className="mt-1.5 text-xxs text-gray-500">This response used real-time CRM validation.</p>
        </div>
      )}
    </div>
  );
}
