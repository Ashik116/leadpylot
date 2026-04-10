import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CommApi from '@/services/CommApiService';
import { commKeys } from './useServers';

export function useDMConversations() {
  return useQuery({
    queryKey: commKeys.dms,
    queryFn: async () => {
      const { data } = await CommApi.getDMConversations();
      return data.data ?? [];
    },
  });
}

export function useCreateDM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recipientId: string) => {
      const res = await CommApi.createDMConversation(recipientId);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commKeys.dms });
    },
  });
}

export function useDMMessages(dmId: string | null) {
  return useInfiniteQuery({
    queryKey: commKeys.dmMessages(dmId || ''),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!dmId) return { data: [], hasMore: false };
      const { data } = await CommApi.getDMMessages(dmId, {
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
    enabled: !!dmId,
    staleTime: 0,
  });
}

export function useSendDM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dmId, content }: { dmId: string; content: string }) => {
      const res = await CommApi.sendDMMessage(dmId, { content });
      return res.data.data;
    },
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: commKeys.dmMessages(msg.conversationId) });
    },
  });
}

export function useEditDM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dmId, messageId, content }: { dmId: string; messageId: string; content: string }) => {
      const res = await CommApi.editDMMessage(dmId, messageId, { content });
      return res.data.data;
    },
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: commKeys.dmMessages(msg.conversationId) });
    },
  });
}

export function useDeleteDM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dmId, messageId }: { dmId: string; messageId: string }) => {
      await CommApi.deleteDMMessage(dmId, messageId);
      return dmId;
    },
    onSuccess: (dmId) => {
      qc.invalidateQueries({ queryKey: commKeys.dmMessages(dmId) });
    },
  });
}
