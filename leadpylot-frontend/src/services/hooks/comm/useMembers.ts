import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CommApi from '@/services/CommApiService';
import { commKeys } from './useServers';

export function useMembers(serverId: string | null) {
  return useQuery({
    queryKey: commKeys.members(serverId || ''),
    queryFn: async () => {
      if (!serverId) return [];
      const { data } = await CommApi.getMembers(serverId, { limit: 200 });
      return data.data ?? [];
    },
    enabled: !!serverId,
  });
}

export function useKickMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverId, userId }: { serverId: string; userId: string }) => {
      await CommApi.kickMember(serverId, userId);
      return serverId;
    },
    onSuccess: (serverId) => {
      qc.invalidateQueries({ queryKey: commKeys.members(serverId) });
    },
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverId, userId, nickname }: { serverId: string; userId: string; nickname: string }) => {
      await CommApi.updateMember(serverId, userId, { nickname });
      return serverId;
    },
    onSuccess: (serverId) => {
      qc.invalidateQueries({ queryKey: commKeys.members(serverId) });
    },
  });
}
