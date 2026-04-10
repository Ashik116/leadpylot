'use client';

import { useRef, useLayoutEffect, useMemo, useState, useCallback } from 'react';
import { Eraser, MessageSquare, RefreshCw, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import Dialog from '@/components/ui/Dialog';
import { useCurrentUser } from '@/stores/userStore';
import { useLeadDetailsContextOptional } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadDetailsContext';
import { useLeadbotActions, type LeadbotAction } from '@/hooks/leadbot/useLeadbotActions';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { LEAD_TABLE_NAMES } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/v2/LeadDetailsBulkActionsContext';
import { LeadbotChatMessage } from './LeadbotChatMessage';
import { LeadbotChatInput } from './LeadbotChatInput';
import { LeadbotQuickActionsBar } from './LeadbotQuickActionsBar';
import { leadbotRichTooltipTitle } from './leadbotRichTooltip';
import { LeadbotChatEmpty } from './LeadbotChatEmpty';
import { LeadbotChatSkeleton } from './LeadbotChatSkeleton';
import { LeadbotThinkingIndicator } from './LeadbotThinkingIndicator';
import { LeadbotLoadOlderBar } from './LeadbotLoadOlderBar';
import { chatbotSendMailStore } from '@/stores/chatbotSendMailStore';

interface LeadbotChatProps {
  leadId: string | undefined;
  leadExpandView?: boolean;
}

function extractOfferIds(items: any[]): string[] {
  return items
    .map((item: any) => item?._id ?? item?.offer_id?._id ?? item?.offer_id)
    .filter(Boolean)
    .map(String);
}

function extractOpeningIds(items: any[]): string[] {
  return items
    .map((item: any) => item?._id ?? item?.opening_id?._id ?? item?.opening_id)
    .filter(Boolean)
    .map(String);
}

export function LeadbotChat({ leadId, leadExpandView }: LeadbotChatProps) {
  const currentUser = useCurrentUser();
  const leadDetailsCtx = useLeadDetailsContextOptional();
  const currentPage = useSelectedItemsStore((s) => s.currentPage);
  const selectedItems = useSelectedItemsStore((s) => s.selectedItems);
  const { openComposeMailModal } = chatbotSendMailStore();

  const { selectedOfferIds, selectedOutOfferIds, selectedOpeningIds } = useMemo(() => {
    if (currentPage === LEAD_TABLE_NAMES.OFFERS) {
      return {
        selectedOfferIds: extractOfferIds(selectedItems),
        selectedOutOfferIds: [] as string[],
        selectedOpeningIds: [] as string[],
      };
    }
    if (currentPage === LEAD_TABLE_NAMES.OUT_OFFERS) {
      return {
        selectedOfferIds: [] as string[],
        selectedOutOfferIds: extractOfferIds(selectedItems),
        selectedOpeningIds: [] as string[],
      };
    }
    if (currentPage === LEAD_TABLE_NAMES.OPENINGS) {
      return {
        selectedOfferIds: [] as string[],
        selectedOutOfferIds: [] as string[],
        selectedOpeningIds: extractOpeningIds(selectedItems),
      };
    }
    return {
      selectedOfferIds: [] as string[],
      selectedOutOfferIds: [] as string[],
      selectedOpeningIds: [] as string[],
    };
  }, [currentPage, selectedItems]);

  const leadContext = useMemo(() => {
    if (!leadDetailsCtx?.lead && !leadId) return undefined;
    const base = leadDetailsCtx?.lead
      ? {
        id: leadDetailsCtx.lead._id,
        name: leadDetailsCtx.lead.contact_name,
        email: leadDetailsCtx.lead.email_from,
      }
      : { id: leadId };
    return {
      ...base,
      ...(selectedOfferIds.length > 0 && { offer_ids: selectedOfferIds }),
      ...(selectedOutOfferIds.length > 0 && { out_offer_ids: selectedOutOfferIds }),
      ...(selectedOpeningIds.length > 0 && { opening_ids: selectedOpeningIds }),
    };
  }, [
    leadDetailsCtx,
    leadId,
    selectedOfferIds,
    selectedOutOfferIds,
    selectedOpeningIds,
  ]);

  const [action, setAction] = useState<LeadbotAction>('chat');
  const [confirmKind, setConfirmKind] = useState<'clean' | 'clear' | null>(null);

  const {
    messages,
    isLoading,
    error,
    refetch,
    executeAction,
    isSending,
    sendError,
    resetSendError,
    deleteMessage,
    deleteConversation,
    editAndRegenerate,
    regenerateLastReply,
    uploadProgress,
    streamPlaceholder,
    clearLocalChatView,
    submitFeedback,
    quickActions,
    isQuickActionsLoading,
    hasMore,
    isLoadingOlder,
    loadOlderMessages,
    EXTRACT_ACCEPT,
    TRANSCRIBE_ACCEPT,
    CHAT_ACCEPT,
  } = useLeadbotActions(
    currentUser?._id ?? '',
    leadId,
    leadContext ?? null
  );

  const handleConfirmAction = useCallback(async () => {
    const kind = confirmKind;
    setConfirmKind(null);
    if (kind === 'clean') {
      await deleteConversation().catch(console.error);
    } else if (kind === 'clear') {
      clearLocalChatView();
    }
  }, [confirmKind, deleteConversation, clearLocalChatView]);

  const handleSend = useCallback(
    async (
      message: string,
      files?: File[],
      sendAction?: LeadbotAction,
      classifyPayload?: { subject: string; body: string; direction?: 'incoming' | 'outgoing' }
    ) => {
      const act = sendAction ?? action;
      await executeAction(act, message, files ?? [], classifyPayload);
    },
    [action, executeAction]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  /** When true, skip auto scroll-to-bottom (e.g. after prepending older messages). */
  const skipScrollToBottomRef = useRef(false);

  const userInitials = useMemo(() => {
    const name = currentUser?.login || 'U';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [currentUser?.login]);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!hasMore || isLoadingOlder) return;
    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    const prevScrollTop = el?.scrollTop ?? 0;
    skipScrollToBottomRef.current = true;
    try {
      await loadOlderMessages();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      const el2 = scrollRef.current;
      if (el2) {
        el2.scrollTop = prevScrollTop + (el2.scrollHeight - prevScrollHeight);
      }
    } finally {
      skipScrollToBottomRef.current = false;
    }
  }, [hasMore, isLoadingOlder, loadOlderMessages]);

  /** Stick to latest messages: layout timing + direct scrollTop (reliable in flex/nested panels; smooth scroll often fails). */
  useLayoutEffect(() => {
    if (skipScrollToBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const apply = () => {
      if (skipScrollToBottomRef.current) return;
      el.scrollTop = el.scrollHeight;
    };
    apply();
    requestAnimationFrame(apply);
  }, [messages, isSending, leadId]);

  if (!currentUser?._id) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-gray-500">Please sign in to use Leadbot.</p>
      </div>
    );
  }

  if (!leadId) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
        <MessageSquare className="mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">Select a lead to use Leadbot.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-gray-50">
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          <LeadbotChatSkeleton leadExpandView={leadExpandView} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <MessageSquare className="h-6 w-6 text-red-500" />
        </div>
        <h4 className="mb-2 text-sm font-semibold text-gray-900">Error Loading Conversation</h4>
        <p className="mb-4 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Failed to load conversation'}
        </p>
        <Button
          variant="solid"
          size="sm"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const contentPadding = leadExpandView ? 'px-2 py-2' : 'px-4 py-3';

  const uidShort = (currentUser?._id ?? '').slice(0, 8);
  const lidLabel = leadId;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gray-50">
      <Dialog
        isOpen={confirmKind !== null}
        onClose={() => setConfirmKind(null)}
        width={420}
        contentClassName="!p-0"
      >
        {confirmKind === 'clean' && (
          <div className="p-4 pt-2">
            <h4 className="mb-2 pr-8 text-lg font-semibold text-gray-900">Delete conversation?</h4>
            <p className="mb-4 text-sm text-gray-600">
              This removes the conversation on the server for user {uidShort || '…'}… and lead{' '}
              {String(lidLabel)}. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="plain" size="sm" type="button" onClick={() => setConfirmKind(null)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" type="button" onClick={() => void handleConfirmAction()}>
                Delete
              </Button>
            </div>
          </div>
        )}
        {confirmKind === 'clear' && (
          <div className="p-4 pt-2">
            <h4 className="mb-2 pr-8 text-lg font-semibold text-gray-900">Clear view only?</h4>
            <p className="mb-4 text-sm text-gray-600">
              Messages will disappear from this panel only. Nothing is deleted on the server.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="plain" size="sm" type="button" onClick={() => setConfirmKind(null)}>
                Cancel
              </Button>
              <Button variant="solid" size="sm" type="button" onClick={() => void handleConfirmAction()}>
                Clear
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      <div
        className={`flex shrink-0 items-center justify-end gap-1 border-b border-gray-200/80 bg-gray-100/80 ${contentPadding}`}
      >
        <Tooltip
          title={leadbotRichTooltipTitle(
            'Clean chat',
            'Delete this conversation on the server. This cannot be undone.'
          )}
          placement="bottom"
          wrapperClass="inline-flex"
        >
          <Button
            variant="plain"
            size="xs"
            type="button"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => setConfirmKind('clean')}
            disabled={isSending}
            className="text-gray-600"
          >
            Clean chat
          </Button>
        </Tooltip>
        <Tooltip
          title={leadbotRichTooltipTitle(
            'Clear view',
            'Clear messages from this panel only. Nothing is deleted on the server.'
          )}
          placement="bottom"
          wrapperClass="inline-flex"
        >
          <Button
            variant="plain"
            size="xs"
            type="button"
            icon={<Eraser className="h-3.5 w-3.5" />}
            onClick={() => setConfirmKind('clear')}
            disabled={isSending}
            className="text-gray-600"
          >
            Clear view
          </Button>
        </Tooltip>
      </div>
      {/* Messages List */}
      <div
        ref={scrollRef}
        className={`custom-scrollbar flex-1 overflow-y-auto ${contentPadding}`}
      >
        {messages.length === 0 && !isSending ? (
          <LeadbotChatEmpty leadId={leadId} leadExpandView={leadExpandView} />
        ) : (
          <>
            <LeadbotLoadOlderBar
              visible={hasMore && messages.length > 0}
              loading={isLoadingOlder}
              onLoad={() => void handleLoadOlderMessages()}
              leadExpandView={leadExpandView}
            />
            <div className="space-y-3">
              {messages.map((msg, i) => {
              const isLast = i === messages.length - 1;
              const isEmptyAssistant = msg.role === 'assistant' && !msg.content;
              const isThinking = isSending && isLast && isEmptyAssistant;
              const isLastAssistant = isLast && msg.role === 'assistant';
              const thinkingStatusText =
                isThinking && uploadProgress
                  ? undefined
                  : isThinking && streamPlaceholder
                    ? streamPlaceholder
                    : isThinking
                      ? 'Thinking…'
                      : undefined;
                return (
                  <LeadbotChatMessage
                    key={msg.id ?? `${msg.role}-${i}`}
                    message={msg}
                    userInitials={userInitials}
                    leadExpandView={leadExpandView}
                    isThinking={isThinking}
                    thinkingStatusText={thinkingStatusText}
                    uploadProgress={isThinking && uploadProgress ? uploadProgress : null}
                    onDelete={msg.role === 'user' && msg.id ? () => deleteMessage(msg.id!).catch(console.error) : undefined}
                    onRegenerate={isLastAssistant ? () => regenerateLastReply().catch(console.error) : undefined}
                    onEditSubmit={msg.role === 'user' && msg.id ? (content) => editAndRegenerate(msg.id!, content).catch(console.error) : undefined}
                    disabled={isSending}
                    onOpenComposeEmail={openComposeMailModal}
                    onFeedbackSubmit={submitFeedback}
                  />
                );
              })}
              {isSending && !(messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') && (
                <LeadbotThinkingIndicator
                  leadExpandView={leadExpandView}
                  statusText={streamPlaceholder ?? 'Thinking…'}
                />
              )}
            </div>
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {sendError && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-4 py-2">
          <p className="text-sm text-red-600">{(sendError as Error).message}</p>
          <Tooltip
            title={leadbotRichTooltipTitle('Dismiss', 'Hide this error message.')}
            placement="top"
            wrapperClass="inline-flex"
          >
            <Button
              variant="plain"
              size="xs"
              onClick={() => resetSendError()}
            >
              Dismiss
            </Button>
          </Tooltip>
        </div>
      )}

      {action === 'chat' && (
        <LeadbotQuickActionsBar
          actions={quickActions}
          isLoading={isQuickActionsLoading}
          disabled={isSending}
          onSelect={(a) => {
            void executeAction('chat', a.message, []);
          }}
          className={leadExpandView ? 'px-2 py-2' : ''}
        />
      )}

      <LeadbotChatInput
        onSend={handleSend}
        disabled={isSending}
        isSending={isSending}
        leadExpandView={leadExpandView}
        placeholder={
          leadExpandView
            ? 'Write a message...'
            : selectedOfferIds.length > 0 || selectedOutOfferIds.length > 0 || selectedOpeningIds.length > 0
              ? 'Your message will include the selected offer(s)/opening(s) for AI context.'
              : 'Ask about this lead...'
        }
        action={action}
        onActionChange={setAction}
        extractAccept={EXTRACT_ACCEPT}
        transcribeAccept={TRANSCRIBE_ACCEPT}
        chatAccept={CHAT_ACCEPT}
      />
    </div>
  );
}
