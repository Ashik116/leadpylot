'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { LeadbotService } from '@/services/leadbot/LeadbotService';
import type {
  LeadbotLeadContext,
  LeadbotConversationMessage,
  LeadbotMessageAttachment,
  LeadbotFeedbackSubmitResult,
  LeadbotConversationCache,
} from '@/types/leadbot.types';
import axios from 'axios';
import { LEADBOT_GENERATING_PLACEHOLDER, LEADBOT_THINKING_PLACEHOLDER } from '@/utils/leadbotStreamPlaceholders';
import {
  activateGenerateStep,
  applyAudioTranscribingSse,
  applyFileUploadingSse,
  buildUploadProgressState,
  type UploadProgressState,
} from '@/utils/leadbotUploadProgress';

function isAudioFile(f: File): boolean {
  const ext = f.name.split('.').pop()?.toLowerCase();
  const audio = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'mp4'];
  return audio.includes(ext ?? '') || f.type.startsWith('audio/');
}

function isDocumentFile(f: File): boolean {
  const ext = f.name.split('.').pop()?.toLowerCase();
  return ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext ?? '');
}

/** Split files into documents (files) and first audio (audio) per AUDIO_FILE.md */
function splitFilesAndAudio(files: File[]): { documentFiles: File[]; audioFile?: File } {
  const documentFiles = files.filter(isDocumentFile);
  const audioFile = files.find(isAudioFile);
  return { documentFiles, audioFile };
}

/** Auto-generated message when message is empty (per AUDIO_FILE.md) */
function getAutoMessage(hasDocuments: boolean, hasAudio: boolean): string {
  if (hasDocuments && hasAudio) return 'What can you tell me about these documents and the voice recording?';
  if (hasAudio) return 'What can you tell me about this voice recording?';
  if (hasDocuments) return 'What can you tell me about these documents?';
  return '';
}

const LEADBOT_QUERY_KEY = 'leadbot-conversation';
const LEADBOT_QUICK_ACTIONS_QUERY_KEY = 'leadbot-quick-actions';

const CONVERSATION_PAGE_SIZE = 20;

function normalizeConversationCache(data: unknown): LeadbotConversationCache {
  if (data && typeof data === 'object' && 'messages' in data) {
    const d = data as Partial<LeadbotConversationCache>;
    return {
      messages: Array.isArray(d.messages) ? d.messages : [],
      hasMore: typeof d.hasMore === 'boolean' ? d.hasMore : false,
    };
  }
  return { messages: [], hasMore: false };
}

/** Final SSE `done` may include `tool_exchanges` (same as GET /api/conversation); merge into cache. */
function mergeAssistantStreamFinish(
  messages: LeadbotConversationMessage[],
  reply: string,
  toolExchanges: unknown[] | undefined
): LeadbotConversationMessage[] {
  const last = messages[messages.length - 1];
  if (last?.role !== 'assistant') {
    return [
      ...messages,
      {
        role: 'assistant',
        content: reply,
        ...(toolExchanges !== undefined ? { tool_exchanges: toolExchanges } : {}),
      },
    ];
  }
  return [
    ...messages.slice(0, -1),
    {
      ...last,
      content: reply,
      ...(toolExchanges !== undefined ? { tool_exchanges: toolExchanges } : {}),
    },
  ];
}

export function useLeadbotConversation(
  userId: string,
  leadId: string | undefined,
  lead?: LeadbotLeadContext | null,
  emails?: unknown[]
) {
  const queryClient = useQueryClient();
  const [isRegenerating, setIsRegenerating] = useState(false);
  /** Multipart: step tracker before first token (replaces a single "Thinking…" line). */
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  /** JSON-only chat: SSE-driven status line in the assistant bubble (not mixed into content). */
  const [streamPlaceholder, setStreamPlaceholder] = useState<string | null>(null);
  /** CRM thread: real lead id. Without it, only legacy send (emails/lead) is used — no GET /api/conversation. */
  const isLegacyConversation = !leadId;
  const cacheKeySegment = leadId ?? 'legacy-email';

  /** SSE may omit `tool_exchanges`; refresh latest page and merge without dropping older loaded pages. */
  const syncConversationTailFromServer = useCallback(async () => {
    if (!leadId) return;
    try {
      const fresh = await LeadbotService.getConversation({
        user_id: userId,
        lead_id: leadId,
        limit: CONVERSATION_PAGE_SIZE,
      });
      const queryKey = [LEADBOT_QUERY_KEY, userId, cacheKeySegment] as const;
      const incoming = fresh.messages ?? [];
      const incomingIds = new Set(
        incoming.map((m) => m.id).filter((id): id is string => Boolean(id))
      );

      queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
        const prev = normalizeConversationCache(old);
        const olderOnly = prev.messages.filter(
          (m) => Boolean(m.id) && !incomingIds.has(String(m.id))
        );
        return {
          messages: [...olderOnly, ...incoming],
          hasMore: fresh.has_more ?? prev.hasMore,
        };
      });
    } catch {
      // Keep stream-updated cache if refresh fails.
    }
  }, [userId, leadId, cacheKeySegment, queryClient]);

  const patchLastAssistantMessageId = useCallback(
    (messageId: string) => {
      const queryKey = [LEADBOT_QUERY_KEY, userId, cacheKeySegment] as const;
      queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
        const prev = normalizeConversationCache(old);
        const messages = prev.messages;
        if (messages.length === 0) return prev;
        const last = messages[messages.length - 1];
        if (last.role !== 'assistant') return prev;
        return {
          ...prev,
          messages: [...messages.slice(0, -1), { ...last, id: messageId }],
        };
      });
    },
    [queryClient, userId, cacheKeySegment]
  );

  // Merge offer_ids, out_offer_ids, opening_ids into single offer_ids for payload (CRM only)
  const offerIds = [
    ...(lead?.offer_ids ?? []),
    ...(lead?.out_offer_ids ?? []),
    ...(lead?.opening_ids ?? []),
  ].filter(Boolean);

  const conversationQuery = useQuery({
    queryKey: [LEADBOT_QUERY_KEY, userId, cacheKeySegment],
    queryFn: async (): Promise<LeadbotConversationCache> => {
      const data = await LeadbotService.getConversation({
        user_id: userId,
        lead_id: leadId!,
        limit: CONVERSATION_PAGE_SIZE,
      });
      return {
        messages: data.messages ?? [],
        hasMore: data.has_more ?? false,
      };
    },
    enabled: !!userId && !!leadId,
  });

  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const loadingOlderLockRef = useRef(false);

  const loadOlderMessages = useCallback(async () => {
    if (!leadId) return;
    const queryKey = [LEADBOT_QUERY_KEY, userId, cacheKeySegment] as const;
    const prev = normalizeConversationCache(queryClient.getQueryData(queryKey));
    const oldestId = prev.messages[0]?.id;
    if (!prev.hasMore || loadingOlderLockRef.current) return;
    if (!oldestId) {
      queryClient.setQueryData<LeadbotConversationCache>(queryKey, { ...prev, hasMore: false });
      return;
    }

    loadingOlderLockRef.current = true;
    setIsLoadingOlder(true);
    try {
      const data = await LeadbotService.getConversation({
        user_id: userId,
        lead_id: leadId,
        limit: CONVERSATION_PAGE_SIZE,
        before_id: oldestId,
      });
      const batch = data.messages ?? [];
      queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
        const cur = normalizeConversationCache(old);
        if (batch.length === 0) {
          return { ...cur, hasMore: false };
        }
        const existingIds = new Set(
          cur.messages.map((m) => m.id).filter((id): id is string => Boolean(id))
        );
        const toPrepend = batch.filter((m) => !m.id || !existingIds.has(m.id));
        return {
          messages: [...toPrepend, ...cur.messages],
          hasMore: data.has_more ?? false,
        };
      });
    } finally {
      loadingOlderLockRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [userId, leadId, cacheKeySegment, queryClient]);

  const quickActionsQuery = useQuery({
    queryKey: [LEADBOT_QUICK_ACTIONS_QUERY_KEY, userId, leadId],
    queryFn: () => LeadbotService.getQuickActions(userId, leadId!),
    enabled: !!userId && !!leadId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const queryKey = [LEADBOT_QUERY_KEY, userId, cacheKeySegment] as const;
      let accumulated = '';

      const streamBody = isLegacyConversation
        ? {
            user_id: userId,
            message,
            ...(emails?.length ? { emails } : {}),
            ...(lead ? { lead } : {}),
          }
        : {
            user_id: userId,
            lead_id: leadId!,
            message,
            ...(offerIds.length > 0 && { offer_ids: offerIds }),
          };

      return LeadbotService.sendMessageStream(
        streamBody,
        {
          onPlaceholder: (text) => setStreamPlaceholder(text),
          onMessageId: ({ message_id }) => patchLastAssistantMessageId(message_id),
          onChunk: (content) => {
            accumulated += content;
            queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
              const prev = normalizeConversationCache(old);
              const messages = prev.messages;
              const last = messages[messages.length - 1];
              const updated =
                last?.role === 'assistant'
                  ? [...messages.slice(0, -1), { ...last, content: accumulated }]
                  : [...messages, { role: 'assistant' as const, content: accumulated }];
              return { ...prev, messages: updated };
            });
          },
          onDone: (data) => {
            setStreamPlaceholder(null);
            const reply = data.reply ?? accumulated;
            queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
              const prev = normalizeConversationCache(old);
              return {
                ...prev,
                messages: mergeAssistantStreamFinish(prev.messages, reply, data.tool_exchanges),
              };
            });
            void syncConversationTailFromServer();
          },
          onError: (msg) => {
            setStreamPlaceholder(null);
            throw new Error(msg);
          },
        }
      );
    },
    onMutate: async (message) => {
      setStreamPlaceholder(LEADBOT_THINKING_PLACEHOLDER);
      await queryClient.cancelQueries({ queryKey: [LEADBOT_QUERY_KEY, userId, cacheKeySegment] });
      const previous = queryClient.getQueryData<LeadbotConversationCache>([
        LEADBOT_QUERY_KEY,
        userId,
        cacheKeySegment,
      ]);
      const prev = normalizeConversationCache(previous);
      const optimisticMessages: LeadbotConversationMessage[] = [
        ...prev.messages,
        { role: 'user', content: message },
        { role: 'assistant', content: '' },
      ];
      queryClient.setQueryData([LEADBOT_QUERY_KEY, userId, cacheKeySegment], {
        ...prev,
        messages: optimisticMessages,
      });
      return { previous };
    },
    onSuccess: () => {
      /* Keep cache; stream + optimistic updates already match server. Refetch would drop prepended pages. */
    },
    onError: (_err, _message, context) => {
      setStreamPlaceholder(null);
      if (context?.previous) {
        queryClient.setQueryData(
          [LEADBOT_QUERY_KEY, userId, cacheKeySegment],
          context.previous
        );
      }
    },
  });

  const sendMessageWithFilesMutation = useMutation({
    mutationFn: async ({ message, files }: { message: string; files: File[] }) => {
      const queryKey = [LEADBOT_QUERY_KEY, userId, cacheKeySegment] as const;
      let accumulated = '';
      const { documentFiles, audioFile } = splitFilesAndAudio(files);
      const hasDocuments = documentFiles.length > 0;
      const hasAudio = !!audioFile;
      const resolvedMessage = message.trim()
        ? message.trim()
        : getAutoMessage(hasDocuments, hasAudio);

      const fileParams = isLegacyConversation
        ? {
            user_id: userId,
            message: resolvedMessage || undefined,
            ...(emails?.length ? { emails } : {}),
            ...(lead ? { lead } : {}),
            files: documentFiles,
            ...(audioFile && { audio: audioFile }),
          }
        : {
            user_id: userId,
            lead_id: leadId!,
            message: resolvedMessage || undefined,
            files: documentFiles,
            ...(audioFile && { audio: audioFile }),
            ...(offerIds.length > 0 && { offer_ids: offerIds }),
          };

      return LeadbotService.sendMessageWithFilesStream(
        fileParams,
        {
          onFileUploading: (status) => {
            setUploadProgress((prev) =>
              prev ? applyFileUploadingSse(prev, status, hasAudio) : null
            );
          },
          onAudioTranscribing: (status) => {
            setUploadProgress((prev) => (prev ? applyAudioTranscribingSse(prev, status) : null));
          },
          onGeneratingStepLabel: (text) => {
            setUploadProgress((prev) => {
              if (!prev) return null;
              const next = activateGenerateStep(prev);
              if (text === null || text === LEADBOT_GENERATING_PLACEHOLDER) {
                return { ...next, generatingDetail: undefined };
              }
              return { ...next, generatingDetail: text };
            });
          },
          onMessageId: ({ message_id }) => patchLastAssistantMessageId(message_id),
          onChunk: (content) => {
            accumulated += content;
            setUploadProgress(null);
            queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
              const prev = normalizeConversationCache(old);
              const messages = prev.messages;
              const last = messages[messages.length - 1];
              const updated =
                last?.role === 'assistant'
                  ? [...messages.slice(0, -1), { ...last, content: accumulated }]
                  : [...messages, { role: 'assistant' as const, content: accumulated }];
              return { ...prev, messages: updated };
            });
          },
          onDone: (data) => {
            setUploadProgress(null);
            const reply = data.reply ?? accumulated;
            queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
              const prev = normalizeConversationCache(old);
              return {
                ...prev,
                messages: mergeAssistantStreamFinish(prev.messages, reply, data.tool_exchanges),
              };
            });
            void syncConversationTailFromServer();
          },
          onError: (msg) => {
            setUploadProgress(null);
            throw new Error(msg);
          },
        }
      );
    },
    onMutate: async ({ message, files }) => {
      setStreamPlaceholder(null);
      await queryClient.cancelQueries({ queryKey: [LEADBOT_QUERY_KEY, userId, cacheKeySegment] });
      const previous = queryClient.getQueryData<LeadbotConversationCache>([
        LEADBOT_QUERY_KEY,
        userId,
        cacheKeySegment,
      ]);
      const prevNorm = normalizeConversationCache(previous);
      const { documentFiles, audioFile } = splitFilesAndAudio(files);
      setUploadProgress(
        buildUploadProgressState(documentFiles.length > 0, !!audioFile)
      );
      const hasDocuments = documentFiles.length > 0;
      const hasAudio = !!audioFile;
      const userContent = message.trim()
        ? message.trim()
        : getAutoMessage(hasDocuments, hasAudio) || `Uploaded ${files.length} file(s): ${files.map((f) => f.name).join(', ')}`;
      const blobUrls: string[] = [];
      const attachments: LeadbotMessageAttachment[] = files.map((f) => {
        const blobUrl = URL.createObjectURL(f);
        blobUrls.push(blobUrl);
        return {
          filename: f.name,
          subject: `Uploaded: ${f.name}`,
          preview_url: blobUrl,
        };
      });
      const optimisticMessages: LeadbotConversationMessage[] = [
        ...prevNorm.messages,
        { role: 'user', content: userContent, attachments },
        { role: 'assistant', content: '' },
      ];
      queryClient.setQueryData([LEADBOT_QUERY_KEY, userId, cacheKeySegment], {
        ...prevNorm,
        messages: optimisticMessages,
      });
      return { previous, blobUrls };
    },
    onSuccess: (_data, _variables, context) => {
      const urls = context?.blobUrls ?? [];
      // Delay revoke so user can click "View" before refetch replaces the message
      if (urls.length) setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 3000);
    },
    onError: (_err, _variables, context) => {
      setUploadProgress(null);
      (context?.blobUrls ?? []).forEach((url) => URL.revokeObjectURL(url));
      if (context?.previous) {
        queryClient.setQueryData(
          [LEADBOT_QUERY_KEY, userId, cacheKeySegment],
          context.previous
        );
      }
    },
  });

  const sendMessageOrWithFiles = async (message: string, files: File[] = []) => {
    const { documentFiles, audioFile } = splitFilesAndAudio(files);
    const hasAttachments = documentFiles.length > 0 || audioFile;
    if (hasAttachments) {
      return sendMessageWithFilesMutation.mutateAsync({ message, files });
    }
    return sendMessageMutation.mutateAsync(message);
  };

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await LeadbotService.deleteMessage(messageId, userId);
      queryClient.setQueryData<LeadbotConversationCache>(
        [LEADBOT_QUERY_KEY, userId, cacheKeySegment],
        (old) => {
          const prev = normalizeConversationCache(old);
          const messages = prev.messages;
          const idx = messages.findIndex((m) => m.id === messageId);
          if (idx < 0) return prev;
          return { ...prev, messages: messages.slice(0, idx) };
        }
      );
    },
    [userId, cacheKeySegment, queryClient]
  );

  const submitFeedback = useCallback(
    async (
      messageId: string,
      rating: 1 | -1,
      correction?: string
    ): Promise<LeadbotFeedbackSubmitResult> => {
      const result = await LeadbotService.sendFeedback({
        user_id: userId,
        message_id: messageId,
        rating,
        correction,
      });
      const queryKey = [LEADBOT_QUERY_KEY, userId, cacheKeySegment] as const;
      const mergeFeedback = (r: 1 | -1, corr?: string) => {
        queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
          const prev = normalizeConversationCache(old);
          const messages = prev.messages;
          const idx = messages.findIndex((m) => m.id === messageId);
          if (idx < 0) return prev;
          const msg = messages[idx];
          if (msg.role !== 'assistant') return prev;
          const base =
            typeof msg.metadata === 'object' && msg.metadata !== null
              ? { ...msg.metadata }
              : {};
          const feedback = { rating: r, ...(corr ? { correction: corr } : {}) };
          return {
            ...prev,
            messages: [
              ...messages.slice(0, idx),
              { ...msg, metadata: { ...base, feedback } },
              ...messages.slice(idx + 1),
            ],
          };
        });
      };

      if (result.ok) {
        mergeFeedback(rating, correction);
        return result;
      }
      mergeFeedback(result.existing_rating);
      return result;
    },
    [userId, cacheKeySegment, queryClient]
  );

  /** Server delete (same as stream-ui “delete conversation” / clean chat). */
  const deleteConversation = useCallback(async () => {
    if (!leadId) return;
    const queryKey = [LEADBOT_QUERY_KEY, userId, cacheKeySegment] as const;
    setUploadProgress(null);
    setStreamPlaceholder(null);
    try {
      await LeadbotService.deleteConversation(userId, leadId);
      queryClient.setQueryData<LeadbotConversationCache>(queryKey, {
        messages: [{ role: 'system', content: 'Conversation deleted' }],
        hasMore: false,
      });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (typeof err.response?.data === 'object' &&
            err.response?.data &&
            'detail' in err.response.data &&
            typeof (err.response.data as { detail?: unknown }).detail === 'string'
            ? (err.response.data as { detail: string }).detail
            : err.message)
        : err instanceof Error
          ? err.message
          : 'Delete failed';
      queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
        const prev = normalizeConversationCache(old);
        return {
          ...prev,
          messages: [...prev.messages, { role: 'system', content: `Delete failed: ${msg}` }],
        };
      });
    }
  }, [userId, leadId, cacheKeySegment, queryClient]);

  /** Local-only clear (does not call API). */
  const clearLocalChatView = useCallback(() => {
    queryClient.setQueryData<LeadbotConversationCache>([LEADBOT_QUERY_KEY, userId, cacheKeySegment], {
      messages: [],
      hasMore: false,
    });
  }, [queryClient, userId, cacheKeySegment]);

  const regenerateLastReply = useCallback(async () => {
    if (!leadId) return;
    const queryKey = [LEADBOT_QUERY_KEY, userId, cacheKeySegment] as const;
    const current = queryClient.getQueryData<LeadbotConversationCache>(queryKey);
    const prev = normalizeConversationCache(current);
    const messages = prev.messages;
    if (messages.length < 2) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;

    queryClient.setQueryData(queryKey, {
      ...prev,
      messages: [...messages.slice(0, -1), { ...last, content: '' }],
    });
    setIsRegenerating(true);
    setStreamPlaceholder(LEADBOT_THINKING_PLACEHOLDER);

    let accumulated = '';
    try {
      await LeadbotService.regenerateStream(userId, leadId, {
        onPlaceholder: (text) => setStreamPlaceholder(text),
        onMessageId: ({ message_id }) => patchLastAssistantMessageId(message_id),
        onChunk: (content) => {
          accumulated += content;
          queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
            const p = normalizeConversationCache(old);
            const msgs = p.messages;
            const updated = [...msgs.slice(0, -1), { ...msgs[msgs.length - 1], content: accumulated }];
            return { ...p, messages: updated };
          });
        },
        onDone: (data) => {
          setStreamPlaceholder(null);
          const reply = data.reply ?? accumulated;
          queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
            const p = normalizeConversationCache(old);
            return {
              ...p,
              messages: mergeAssistantStreamFinish(p.messages, reply, data.tool_exchanges),
            };
          });
          void syncConversationTailFromServer();
        },
        onError: (msg) => {
          setStreamPlaceholder(null);
          throw new Error(msg);
        },
      });
    } finally {
      setStreamPlaceholder(null);
      setIsRegenerating(false);
    }
  }, [userId, leadId, cacheKeySegment, queryClient, patchLastAssistantMessageId, syncConversationTailFromServer]);

  const editAndRegenerate = useCallback(
    async (messageId: string, newContent: string) => {
      if (!leadId) return;
      const queryKey = [LEADBOT_QUERY_KEY, userId, cacheKeySegment] as const;
      const current = queryClient.getQueryData<LeadbotConversationCache>(queryKey);
      const messages = normalizeConversationCache(current).messages;
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx < 0 || messages[idx]?.role !== 'user') return;

      const truncated = [
        ...messages.slice(0, idx),
        { ...messages[idx], content: newContent },
        { role: 'assistant' as const, content: '' },
      ];
      queryClient.setQueryData(queryKey, {
        ...normalizeConversationCache(current),
        messages: truncated,
      });
      setIsRegenerating(true);
      setStreamPlaceholder(LEADBOT_THINKING_PLACEHOLDER);

      let accumulated = '';
      try {
        await LeadbotService.editAndRegenerateStream(userId, leadId, messageId, newContent, {
          onPlaceholder: (text) => setStreamPlaceholder(text),
          onMessageId: ({ message_id }) => patchLastAssistantMessageId(message_id),
          onChunk: (content) => {
            accumulated += content;
            queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
              const p = normalizeConversationCache(old);
              const msgs = p.messages;
              const updated = [...msgs.slice(0, -1), { ...msgs[msgs.length - 1], content: accumulated }];
              return { ...p, messages: updated };
            });
          },
          onDone: (data) => {
            setStreamPlaceholder(null);
            const reply = data.reply ?? accumulated;
            queryClient.setQueryData<LeadbotConversationCache>(queryKey, (old) => {
              const p = normalizeConversationCache(old);
              return {
                ...p,
                messages: mergeAssistantStreamFinish(p.messages, reply, data.tool_exchanges),
              };
            });
            void syncConversationTailFromServer();
          },
          onError: (msg) => {
            setStreamPlaceholder(null);
            throw new Error(msg);
          },
        });
      } finally {
        setStreamPlaceholder(null);
        setIsRegenerating(false);
      }
    },
    [userId, leadId, cacheKeySegment, queryClient, patchLastAssistantMessageId, syncConversationTailFromServer]
  );

  return {
   messages: conversationQuery.data?.messages ?? [],
    hasMore: conversationQuery.data?.hasMore ?? false,
    isLoadingOlder,
    loadOlderMessages,
    isLoading: conversationQuery.isLoading,
    error: conversationQuery.error,
    refetch: conversationQuery.refetch,
    quickActions: quickActionsQuery.data?.actions ?? [],
    isQuickActionsLoading: quickActionsQuery.isLoading,
    quickActionsError: quickActionsQuery.error,
    sendMessage: sendMessageMutation.mutateAsync,
    sendMessageWithFiles: sendMessageWithFilesMutation.mutateAsync,
    sendMessageOrWithFiles,
    deleteMessage,
    deleteConversation,
    clearLocalChatView,
    submitFeedback,
    regenerateLastReply,
    editAndRegenerate,
    isSending: sendMessageMutation.isPending || sendMessageWithFilesMutation.isPending || isRegenerating,
    sendError: sendMessageMutation.error ?? sendMessageWithFilesMutation.error,
    /** Multipart stream: step tracker (reading → … → generating); cleared on first token. */
    uploadProgress,
    /** JSON chat only: SSE placeholder for thinking / tools (not message content). */
    streamPlaceholder,
    resetSendError: () => {
      sendMessageMutation.reset();
      sendMessageWithFilesMutation.reset();
    },
  };
}
