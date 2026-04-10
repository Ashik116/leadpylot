import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CommApi from '@/services/CommApiService';
import { commKeys } from './useServers';
import type { CreateRoleRequest } from '@/types/comm.types';

export function useRoles(serverId: string | null) {
  return useQuery({
    queryKey: commKeys.roles(serverId || ''),
    queryFn: async () => {
      if (!serverId) return [];
      const { data } = await CommApi.getRoles(serverId);
      return data.data ?? [];
    },
    enabled: !!serverId,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverId, data }: { serverId: string; data: CreateRoleRequest }) => {
      const res = await CommApi.createRole(serverId, data);
      return res.data.data;
    },
    onSuccess: (role) => {
      qc.invalidateQueries({ queryKey: commKeys.roles(role.serverId) });
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverId, roleId, data }: { serverId: string; roleId: string; data: Partial<CreateRoleRequest> }) => {
      const res = await CommApi.updateRole(serverId, roleId, data);
      return res.data.data;
    },
    onSuccess: (role) => {
      qc.invalidateQueries({ queryKey: commKeys.roles(role.serverId) });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverId, roleId }: { serverId: string; roleId: string }) => {
      await CommApi.deleteRole(serverId, roleId);
      return serverId;
    },
    onSuccess: (serverId) => {
      qc.invalidateQueries({ queryKey: commKeys.roles(serverId) });
    },
  });
}

export function useAssignRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverId, userId, roleIds }: { serverId: string; userId: string; roleIds: string[] }) => {
      await CommApi.assignRoles(serverId, userId, roleIds);
      return serverId;
    },
    onSuccess: (serverId) => {
      qc.invalidateQueries({ queryKey: commKeys.members(serverId) });
    },
  });
}
