import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CommApi from '@/services/CommApiService';
import { commKeys } from './useServers';
import type { Message } from '@/types/comm.types';

export function useMessages(channelId: string | null) {
  return useInfiniteQuery({
    queryKey: commKeys.messages(channelId || ''),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!channelId) return { data: [], hasMore: false };
      const { data } = await CommApi.getMessages(channelId, {
        limit: 50,
        before: pageParam,
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.data.length === 0) return undefined;
      return lastPage.data[lastPage.data.length - 1].id;
    },
    enabled: !!channelId,
    staleTime: 0,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, content }: { channelId: string; content: string }) => {
      const res = await CommApi.sendMessage(channelId, { content });
      return res.data.data;
    },
    // We rely on WebSocket for real-time updates, but also invalidate for consistency
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: commKeys.messages(msg.channelId) });
    },
  });
}

export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, messageId, content }: { channelId: string; messageId: string; content: string }) => {
      const res = await CommApi.editMessage(channelId, messageId, { content });
      return res.data.data;
    },
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: commKeys.messages(msg.channelId) });
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, messageId }: { channelId: string; messageId: string }) => {
      await CommApi.deleteMessage(channelId, messageId);
      return channelId;
    },
    onSuccess: (channelId) => {
      qc.invalidateQueries({ queryKey: commKeys.messages(channelId) });
    },
  });
}

/** Utility to append a real-time message to the query cache */
export function appendMessageToCache(qc: ReturnType<typeof useQueryClient>, channelId: string, message: Message) {
  qc.setQueryData(commKeys.messages(channelId), (old: any) => {
    if (!old?.pages?.length) return old;
    const firstPage = old.pages[0];
    return {
      ...old,
      pages: [
        { ...firstPage, data: [message, ...firstPage.data] },
        ...old.pages.slice(1),
      ],
    };
  });
}
