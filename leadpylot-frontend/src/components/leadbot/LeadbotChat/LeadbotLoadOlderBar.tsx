'use client';

import { Loader2 } from 'lucide-react';

interface LeadbotLoadOlderBarProps {
  visible: boolean;
  loading: boolean;
  onLoad: () => void;
  leadExpandView?: boolean;
}

export function LeadbotLoadOlderBar({
  visible,
  loading,
  onLoad,
  leadExpandView,
}: LeadbotLoadOlderBarProps) {
  if (!visible) return null;

  const compact = leadExpandView;

  return (
    <div className={`flex shrink-0 justify-center ${compact ? 'py-1.5' : 'py-2'}`}>
      <button
        type="button"
        onClick={onLoad}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70 ${compact ? 'text-xxs' : 'text-xs'}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
            Loading…
          </>
        ) : (
          'Load older messages'
        )}
      </button>
    </div>
  );
}
