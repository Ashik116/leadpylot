'use client';

import { MessageSquare } from 'lucide-react';

interface LeadbotChatEmptyProps {
  leadId?: string;
  leadExpandView?: boolean;
}

export function LeadbotChatEmpty({ leadId, leadExpandView }: LeadbotChatEmptyProps) {
  const compact = leadExpandView;

  return (
    <div className={`flex min-h-full flex-col items-center justify-center text-center ${compact ? 'px-3' : 'px-6'}`}>
      <div className={`flex items-center justify-center rounded-full bg-gray-200 ${compact ? 'mb-2 h-10 w-10' : 'mb-4 h-12 w-12'}`}>
        <MessageSquare className={compact ? 'h-5 w-5 text-gray-400' : 'h-6 w-6 text-gray-400'} />
      </div>
      <h4 className={`mb-1 font-semibold text-gray-700 ${compact ? 'text-xs' : 'text-sm'}`}>No messages yet</h4>
      <p className={compact ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
        {leadId ? (
          <>Ask me anything about this lead. I can help with context, summaries, and next steps.</>
        ) : (
          <>Ask me anything. I can help with CRM data, leads, and general questions.</>
        )}
      </p>
      <p className={`mt-2 text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>Start a conversation by typing a message below.</p>
    </div>
  );
}
