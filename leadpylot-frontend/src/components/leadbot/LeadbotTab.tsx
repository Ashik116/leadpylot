'use client';

import { LeadbotChat } from './LeadbotChat/LeadbotChat';

interface LeadbotTabProps {
  leadId: string | undefined;
  leadExpandView?: boolean;
}

export function LeadbotTab({ leadId, leadExpandView }: LeadbotTabProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <LeadbotChat leadId={leadId} leadExpandView={leadExpandView} />
    </div>
  );
}
