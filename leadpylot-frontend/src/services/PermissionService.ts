/**
 * Permission Service
 * Handles fetching and managing user permissions from the backend
 */

import ApiService from './ApiService';

export interface PermissionResponse {
  role: string;
  permissions: string[];
}

/**
 * Fetch current user's permissions from backend
 * @returns Promise<PermissionResponse> - User's role and permissions array
 * @throws Error if request fails
 */
export const fetchUserPermissions = async (): Promise<PermissionResponse> => {
  try {
    const response = await ApiService.fetchDataWithAxios<PermissionResponse>({
      url: '/auth/me/permissions',
      method: 'GET',
    });

    return response;
  } catch (error) {
    // if (error instanceof Error) {
    //   throw error;
    // }
    console.error('Error fetching permissions:', (error as Error)?.message);
    throw new Error('An unexpected error occurred while fetching permissions');
  }
};

/**
 * Check if a user has a specific permission
 * @param userPermissions - Array of user's permissions
 * @param requiredPermission - Permission string to check
 * @returns boolean - True if user has the permission
 */
export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission);
};

/**
 * Check if a user has ANY of the required permissions
 * @param userPermissions - Array of user's permissions
 * @param requiredPermissions - Array of permission strings to check
 * @returns boolean - True if user has at least one of the permissions
 */
export const hasAnyPermission = (
  userPermissions: string[],
  requiredPermissions: string[]
): boolean => {
  if (requiredPermissions.length === 0) {
    return true;
  }
  return requiredPermissions.some((perm) => userPermissions.includes(perm));
};

/**
 * Check if a user has ALL of the required permissions
 * @param userPermissions - Array of user's permissions
 * @param requiredPermissions - Array of permission strings to check
 * @returns boolean - True if user has all of the permissions
 */
export const hasAllPermissions = (
  userPermissions: string[],
  requiredPermissions: string[]
): boolean => {
  if (requiredPermissions.length === 0) {
    return true;
  }
  return requiredPermissions.every((perm) => userPermissions.includes(perm));
};

/**
 * Check if user has wildcard permission (e.g., 'offer:*')
 * This matches permissions like 'offer:create', 'offer:read:all', etc.
 * @param userPermissions - Array of user's permissions
 * @param wildcardPermission - Wildcard permission pattern (e.g., 'offer:*')
 * @returns boolean - True if user has any permission matching wildcard
 */
export const hasWildcardPermission = (
  userPermissions: string[],
  wildcardPermission: string
): boolean => {
  const basePermission = wildcardPermission.replace('*', '');
  return userPermissions.some((perm) => perm.startsWith(basePermission));
};
