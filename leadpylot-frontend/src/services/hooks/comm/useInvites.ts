import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CommApi from '@/services/CommApiService';
import { commKeys } from './useServers';
import type { CreateInviteRequest } from '@/types/comm.types';

export function useInvites(serverId: string | null) {
  return useQuery({
    queryKey: commKeys.invites(serverId || ''),
    queryFn: async () => {
      if (!serverId) return [];
      const { data } = await CommApi.getInvites(serverId);
      return data.data ?? [];
    },
    enabled: !!serverId,
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverId, data }: { serverId: string; data?: CreateInviteRequest }) => {
      const res = await CommApi.createInvite(serverId, data);
      return res.data.data;
    },
    onSuccess: (invite) => {
      qc.invalidateQueries({ queryKey: commKeys.invites(invite.serverId) });
    },
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await CommApi.acceptInvite(code);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commKeys.servers });
    },
  });
}

export function useDeleteInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverId, inviteId }: { serverId: string; inviteId: string }) => {
      await CommApi.deleteInvite(serverId, inviteId);
      return serverId;
    },
    onSuccess: (serverId) => {
      qc.invalidateQueries({ queryKey: commKeys.invites(serverId) });
    },
  });
}
