'use client';

import { useEffect, useState } from 'react';

const HIGHLIGHT_DURATION_MS = 2000;

export default function useLeadDetailsHighlight(offerIdFromUrl: string | null) {
  const [highlightedOfferId, setHighlightedOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!offerIdFromUrl) return;

    const timeoutId = setTimeout(() => setHighlightedOfferId(offerIdFromUrl), 0);
    const clearTimeoutId = setTimeout(() => setHighlightedOfferId(null), HIGHLIGHT_DURATION_MS);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(clearTimeoutId);
    };
  }, [offerIdFromUrl]);

  return highlightedOfferId;
}
