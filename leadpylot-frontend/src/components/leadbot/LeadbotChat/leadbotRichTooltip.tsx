import type { ReactNode } from 'react';

/** Matches quick-action chips: `text-xs` heading + muted body (see LeadbotQuickActionsBar). */
export function leadbotRichTooltipTitle(heading: string, body: string): ReactNode {
  return (
    <span className="block max-w-xs text-left text-xs leading-snug">
      <span className="font-medium">{heading}</span>
      <span className="mt-1 block text-gray-600">{body}</span>
    </span>
  );
}
