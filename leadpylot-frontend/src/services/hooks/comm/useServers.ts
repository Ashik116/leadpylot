import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CommApi from '@/services/CommApiService';
import type { CreateServerRequest } from '@/types/comm.types';

export const commKeys = {
  servers: ['comm-servers'] as const,
  server: (id: string) => ['comm-server', id] as const,
  channels: (serverId: string) => ['comm-channels', serverId] as const,
  messages: (channelId: string) => ['comm-messages', channelId] as const,
  roles: (serverId: string) => ['comm-roles', serverId] as const,
  members: (serverId: string) => ['comm-members', serverId] as const,
  invites: (serverId: string) => ['comm-invites', serverId] as const,
  dms: ['comm-dms'] as const,
  dmMessages: (dmId: string) => ['comm-dm-messages', dmId] as const,
};

export function useServers() {
  return useQuery({
    queryKey: commKeys.servers,
    queryFn: async () => {
      const { data } = await CommApi.getMyServers();
      return data.data ?? [];
    },
  });
}

export function useServer(serverId: string | null) {
  return useQuery({
    queryKey: commKeys.server(serverId || ''),
    queryFn: async () => {
      if (!serverId) return null;
      const { data } = await CommApi.getServer(serverId);
      return data.data;
    },
    enabled: !!serverId,
  });
}

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateServerRequest) => {
      const res = await CommApi.createServer(data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commKeys.servers });
    },
  });
}

export function useUpdateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverId, data }: { serverId: string; data: Partial<CreateServerRequest> }) => {
      const res = await CommApi.updateServer(serverId, data);
      return res.data.data;
    },
    onSuccess: (_, { serverId }) => {
      qc.invalidateQueries({ queryKey: commKeys.servers });
      qc.invalidateQueries({ queryKey: commKeys.server(serverId) });
    },
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serverId: string) => {
      await CommApi.deleteServer(serverId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commKeys.servers });
    },
  });
}

export function useLeaveServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serverId: string) => {
      await CommApi.leaveServer(serverId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commKeys.servers });
    },
  });
}
