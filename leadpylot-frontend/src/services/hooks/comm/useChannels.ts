import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CommApi from '@/services/CommApiService';
import { commKeys } from './useServers';
import type { CreateChannelRequest, PermissionOverride } from '@/types/comm.types';

export function useChannels(serverId: string | null) {
  return useQuery({
    queryKey: commKeys.channels(serverId || ''),
    queryFn: async () => {
      if (!serverId) return [];
      const { data } = await CommApi.getChannels(serverId);
      return data.data ?? [];
    },
    enabled: !!serverId,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverId, data }: { serverId: string; data: CreateChannelRequest }) => {
      const res = await CommApi.createChannel(serverId, data);
      return res.data.data;
    },
    onSuccess: (_, { serverId }) => {
      qc.invalidateQueries({ queryKey: commKeys.channels(serverId) });
    },
  });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, serverId, data }: { channelId: string; serverId: string; data: { name?: string; topic?: string } }) => {
      const res = await CommApi.updateChannel(channelId, data);
      return res.data.data;
    },
    onSuccess: (_, { serverId }) => {
      qc.invalidateQueries({ queryKey: commKeys.channels(serverId) });
    },
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, serverId }: { channelId: string; serverId: string }) => {
      await CommApi.deleteChannel(channelId);
      return serverId;
    },
    onSuccess: (serverId) => {
      qc.invalidateQueries({ queryKey: commKeys.channels(serverId) });
    },
  });
}

export function useSetChannelPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, serverId, overrides }: { channelId: string; serverId: string; overrides: PermissionOverride[] }) => {
      const res = await CommApi.setChannelPermissions(channelId, overrides);
      return res.data.data;
    },
    onSuccess: (_, { serverId }) => {
      qc.invalidateQueries({ queryKey: commKeys.channels(serverId) });
    },
  });
}
