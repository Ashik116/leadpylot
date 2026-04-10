'use client';

import { useState, useRef, useEffect } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useCurrentUser } from '@/stores/userStore';
import { useLeadbotConversation } from '@/hooks/leadbot/useLeadbotConversation';
import { LeadbotChatMessage } from '../LeadbotChat/LeadbotChatMessage';
import { LeadbotChatInput } from '../LeadbotChat/LeadbotChatInput';
import { LeadbotChatSkeleton } from '../LeadbotChat/LeadbotChatSkeleton';
import { LeadbotThinkingIndicator } from '../LeadbotChat/LeadbotThinkingIndicator';

/**
 * Email draft assistant - paste email thread and ask AI for a draft reply.
 */
export function LeadbotEmailDraft() {
  const currentUser = useCurrentUser();
  const [emailsText, setEmailsText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const emails = emailsText.trim()
    ? [{ subject: '', body: emailsText }]
    : undefined;

  const {
    messages,
    isLoading,
    error,
    refetch,
    sendMessageOrWithFiles,
    isSending,
    sendError,
    resetSendError,
  } = useLeadbotConversation(
    currentUser?._id ?? '',
    undefined,
    null,
    emails
  );

  const userInitials = (currentUser?.login || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  if (!currentUser?._id) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-gray-500">Please sign in to use the email draft assistant.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-gray-50">
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          <LeadbotChatSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <Mail className="h-6 w-6 text-red-500" />
        </div>
        <h4 className="mb-2 text-sm font-semibold text-gray-900">Error Loading</h4>
        <p className="mb-4 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Failed to load'}
        </p>
        <Button variant="solid" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Paste email thread for context (optional)
        </label>
        <textarea
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
          placeholder="Paste the email conversation here. Then ask for a draft reply below."
          className="min-h-[80px] w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          rows={3}
        />
      </div>

      <div ref={scrollRef} className="custom-scrollbar flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !isSending ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <Mail className="mb-4 h-12 w-12 text-gray-400" />
            <h4 className="mb-1 text-sm font-semibold text-gray-700">Email Draft Assistant</h4>
            <p className="text-sm text-gray-500">
              Paste an email thread above, then ask for a draft reply below.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1;
              const isEmptyAssistant = msg.role === 'assistant' && !msg.content;
              const isThinking = isSending && isLast && isEmptyAssistant;
              return (
                <LeadbotChatMessage
                  key={`${msg.role}-${i}`}
                  message={msg}
                  userInitials={userInitials}
                  isThinking={isThinking}
                />
              );
            })}
            {isSending && !(messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') && (
              <LeadbotThinkingIndicator />
            )}
          </div>
        )}
      </div>

      {sendError && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-4 py-2">
          <p className="text-sm text-red-600">{(sendError as Error).message}</p>
          <Button variant="plain" size="xs" onClick={() => resetSendError()}>
            Dismiss
          </Button>
        </div>
      )}

      <LeadbotChatInput
        onSend={(msg, files) => sendMessageOrWithFiles(msg, files ?? [])}
        disabled={isSending}
        isSending={isSending}
        placeholder="Ask for a draft reply..."
      />
    </div>
  );
}
