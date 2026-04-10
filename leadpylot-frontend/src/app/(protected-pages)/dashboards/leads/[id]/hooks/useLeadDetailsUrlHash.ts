'use client';

import { useEffect } from 'react';

interface LeadWithContact {
  contact_name?: string;
  lead_source_no?: string;
}

export default function useLeadDetailsUrlHash(
  lead: LeadWithContact | null | undefined,
  currentPath: string,
  showInDialog?: boolean
) {
  useEffect(() => {
    if (!lead || typeof window === 'undefined' || showInDialog) return;

    const contactNameSlug = lead?.contact_name?.replace(/\s+/g, '-');
    const hash = `#${contactNameSlug}-${lead?.lead_source_no ?? ''}`;

    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', `${currentPath}${hash}`);
    }
  }, [lead, currentPath, showInDialog]);
}
