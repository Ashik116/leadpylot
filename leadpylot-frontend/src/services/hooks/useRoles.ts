/**
 * useRoles Hook
 * React Query hooks for role and permission management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import {
  apiGetRoles,
  apiGetRoleById,
  apiCreateRole,
  apiCreateRoleFromTemplate,
  apiUpdateRole,
  apiDeleteRole,
  apiCloneRole,
  apiUpdateRolePermissions,
  apiBulkAddPermissions,
  apiBulkRemovePermissions,
  apiRefreshRoleCache,
  apiUpdateIncludePermissions,
  apiUpdateExcludePermissions,
  apiRecalculatePermissions,
  apiGetChildRoles,
  apiGetPermissions,
  apiGetPermissionGroups,
  apiSeedPermissions,
  apiGetPermissionTemplates,
  apiGetAuditLogs,
  apiGetRoleAuditLogs,
  Role,
} from '../RolesService';

// Query keys
export const ROLES_QUERY_KEYS = {
  roles: ['roles'] as const,
  role: (id: string) => ['roles', id] as const,
  childRoles: (id: string) => ['roles', id, 'children'] as const,
  permissions: ['permissions'] as const,
  permissionGroups: ['permission-groups'] as const,
  templates: ['permission-templates'] as const,
  auditLogs: ['audit-logs'] as const,
  roleAuditLogs: (roleId: string) => ['audit-logs', 'role', roleId] as const,
};

// ============================================
// ROLE HOOKS
// ============================================

/**
 * Get all roles
 */
export function useRoles(params?: {
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}) {
  return useQuery({
    queryKey: [...ROLES_QUERY_KEYS.roles, params],
    queryFn: () => apiGetRoles(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get role by ID
 */
export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: ROLES_QUERY_KEYS.role(id || ''),
    queryFn: () => apiGetRoleById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create role mutation
 */
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiCreateRole,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      toast.push(
        Notification({
          type: 'success',
          title: 'Role Created',
          children: `Role "${data.name}" has been created successfully.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to create role',
        })
      );
    },
  });
}

/**
 * Create role from template mutation
 */
export function useCreateRoleFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiCreateRoleFromTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      toast.push(
        Notification({
          type: 'success',
          title: 'Role Created',
          children: `Role "${data.name}" has been created from template.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to create role from template',
        })
      );
    },
  });
}

/**
 * Update role mutation
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Role> }) =>
      apiUpdateRole(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.role(data._id) });
      toast.push(
        Notification({
          type: 'success',
          title: 'Role Updated',
          children: `Role "${data.name}" has been updated successfully.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to update role',
        })
      );
    },
  });
}

/**
 * Delete role mutation
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiDeleteRole,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      toast.push(
        Notification({
          type: 'success',
          title: 'Role Deleted',
          children: data.message,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to delete role',
        })
      );
    },
  });
}

/**
 * Clone role mutation
 */
export function useCloneRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      apiCloneRole(id, name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      toast.push(
        Notification({
          type: 'success',
          title: 'Role Cloned',
          children: `Role "${data.name}" has been created.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to clone role',
        })
      );
    },
  });
}

/**
 * Update role permissions mutation
 * Note: This triggers automatic propagation to child roles
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      apiUpdateRolePermissions(id, permissions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.role(data._id) });
      // Invalidate child roles since permissions propagate automatically
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.childRoles(data._id) });
      toast.push(
        Notification({
          type: 'success',
          title: 'Permissions Updated',
          children: `Permissions for "${data.name}" have been updated and propagated to child roles.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to update permissions',
        })
      );
    },
  });
}

/**
 * Bulk add permissions mutation
 */
export function useBulkAddPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      apiBulkAddPermissions(id, permissions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.role(data._id) });
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to add permissions',
        })
      );
    },
  });
}

/**
 * Bulk remove permissions mutation
 */
export function useBulkRemovePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      apiBulkRemovePermissions(id, permissions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.role(data._id) });
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to remove permissions',
        })
      );
    },
  });
}

/**
 * Refresh role cache mutation
 */
export function useRefreshRoleCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiRefreshRoleCache,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      toast.push(
        Notification({
          type: 'success',
          title: 'Cache Refreshed',
          children: `${data.rolesRefreshed} roles have been refreshed.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to refresh cache',
        })
      );
    },
  });
}

/**
 * Update include permissions mutation (for child roles)
 */
export function useUpdateIncludePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      apiUpdateIncludePermissions(id, permissions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.role(data._id) });
      if (typeof data.sourceRole === 'object' && data.sourceRole?._id) {
        queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.role(data.sourceRole._id) });
        queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.childRoles(data.sourceRole._id) });
      }
      toast.push(
        Notification({
          type: 'success',
          title: 'Permissions Updated',
          children: `Include permissions for "${data.name}" have been updated.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to update include permissions',
        })
      );
    },
  });
}

/**
 * Update exclude permissions mutation (for child roles)
 */
export function useUpdateExcludePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      apiUpdateExcludePermissions(id, permissions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.role(data._id) });
      if (typeof data.sourceRole === 'object' && data.sourceRole?._id) {
        queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.role(data.sourceRole._id) });
        queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.childRoles(data.sourceRole._id) });
      }
      toast.push(
        Notification({
          type: 'success',
          title: 'Permissions Updated',
          children: `Exclude permissions for "${data.name}" have been updated.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to update exclude permissions',
        })
      );
    },
  });
}

/**
 * Recalculate permissions mutation (for child roles)
 */
export function useRecalculatePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiRecalculatePermissions,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.role(data._id) });
      if (typeof data.sourceRole === 'object' && data.sourceRole?._id) {
        queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.role(data.sourceRole._id) });
        queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.childRoles(data.sourceRole._id) });
      }
      toast.push(
        Notification({
          type: 'success',
          title: 'Permissions Recalculated',
          children: `Permissions for "${data.name}" have been recalculated from source.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to recalculate permissions',
        })
      );
    },
  });
}

/**
 * Get child roles query
 */
export function useChildRoles(roleId: string | undefined) {
  return useQuery({
    queryKey: ROLES_QUERY_KEYS.childRoles(roleId || ''),
    queryFn: () => apiGetChildRoles(roleId!),
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// PERMISSION HOOKS
// ============================================

/**
 * Get all permissions
 */
export function usePermissions(params?: { grouped?: boolean }) {
  return useQuery({
    queryKey: [...ROLES_QUERY_KEYS.permissions, params],
    queryFn: () => apiGetPermissions(params),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get permission groups
 */
export function usePermissionGroups(params?: { search?: string }) {
  return useQuery({
    queryKey: [...ROLES_QUERY_KEYS.permissionGroups, params],
    queryFn: () => apiGetPermissionGroups(params),
    staleTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep previous data while loading to prevent re-renders
  });
}

/**
 * Seed permissions mutation
 */
export function useSeedPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiSeedPermissions,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.permissions });
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.permissionGroups });
      toast.push(
        Notification({
          type: 'success',
          title: 'Permissions Seeded',
          children: `Created ${data.created} new permissions. Total: ${data.total}`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: error.message || 'Failed to seed permissions',
        })
      );
    },
  });
}

// ============================================
// TEMPLATE HOOKS
// ============================================

/**
 * Get permission templates
 */
export function usePermissionTemplates() {
  return useQuery({
    queryKey: ROLES_QUERY_KEYS.templates,
    queryFn: apiGetPermissionTemplates,
    staleTime: 30 * 60 * 1000,
  });
}

// ============================================
// AUDIT HOOKS
// ============================================

/**
 * Get audit logs
 */
export function useAuditLogs(params?: {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: [...ROLES_QUERY_KEYS.auditLogs, params],
    queryFn: () => apiGetAuditLogs(params),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Get audit logs for a specific role
 */
export function useRoleAuditLogs(
  roleId: string | undefined,
  params?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: [...ROLES_QUERY_KEYS.roleAuditLogs(roleId || ''), params],
    queryFn: () => apiGetRoleAuditLogs(roleId!, params),
    enabled: !!roleId,
    staleTime: 1 * 60 * 1000,
  });
}
