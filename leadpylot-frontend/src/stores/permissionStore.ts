/**
 * Permission Store
 * Global state management for user permissions using Zustand
 */

import { create } from 'zustand';

export interface PermissionState {
  permissions: string[];
  role: string;
  isLoading: boolean;
  error: string | null;
  setPermissions: (permissions: string[], role: string) => void;
  clearPermissions: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

/**
 * Permission store created with Zustand
 * Manages user's permissions and role globally
 */
export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  role: '',
  isLoading: false,
  error: null,

  /**
   * Set user's permissions and role
   * @param permissions - Array of permission strings
   * @param role - User's role string
   */
  setPermissions: (permissions, role) =>
    set({
      permissions,
      role,
      isLoading: false,
      error: null,
    }),

  /**
   * Clear all permissions (used on logout)
   */
  clearPermissions: () =>
    set({
      permissions: [],
      role: '',
      isLoading: false,
      error: null,
    }),

  /**
   * Check if user has a specific permission
   * @param permission - Permission string to check
   * @returns boolean - True if user has the permission
   */
  hasPermission: (permission) => {
    const { permissions } = get();
    return permissions.includes(permission);
  },

  /**
   * Check if user has ANY of the required permissions
   * @param permissions - Array of permission strings to check
   * @returns boolean - True if user has at least one of the permissions
   */
  hasAnyPermission: (permissions) => {
    const { permissions: userPermissions } = get();
    if (permissions.length === 0) {
      return true;
    }
    return permissions.some((p) => userPermissions.includes(p));
  },

  /**
   * Check if user has ALL of the required permissions
   * @param permissions - Array of permission strings to check
   * @returns boolean - True if user has all of the permissions
   */
  hasAllPermissions: (permissions) => {
    const { permissions: userPermissions } = get();
    if (permissions.length === 0) {
      return true;
    }
    return permissions.every((p) => userPermissions.includes(p));
  },
}));
