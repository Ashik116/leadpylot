/**
 * usePermissions Hook
 * Convenient hook for components to access permission checking methods
 */

import { usePermissionStore } from '@/stores/permissionStore';

export const usePermissions = () => {
  const {
    permissions,
    role,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  } = usePermissionStore();

  return {
    permissions,
    role,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};
