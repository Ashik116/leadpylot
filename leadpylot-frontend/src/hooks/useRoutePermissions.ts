import { useAuthStore } from '@/stores/authStore';
import { hasRouteAccess, getRoutePermission } from '@/configs/navigation.config/auth.route.config';
import { Role } from '@/configs/navigation.config/auth.route.config';

/**
 * Hook to check if the current user has access to a specific route
 * @param route - The route path to check
 * @returns boolean indicating if the user has access
 */
export const useCanAccessRoute = (route: string): boolean => {
  const { user } = useAuthStore();

  if (!user) {
    return false;
  }

  return hasRouteAccess(route, user.role);
};

/**
 * Hook to get the permission details for a specific route
 * @param route - The route path to check
 * @returns RoutePermission object or null
 */
export const useRoutePermission = (route: string) => {
  return getRoutePermission(route);
};

/**
 * Hook to check if the current user has a specific role
 * @param roles - Array of roles to check against
 * @returns boolean indicating if the user has any of the specified roles
 */
export const useHasRole = (roles: Role[]): boolean => {
  const { user } = useAuthStore();

  if (!user) {
    return false;
  }

  return roles.includes(user.role);
};

/**
 * Hook to get the current user's role
 * @returns The current user's role or null
 */
export const useUserRole = (): Role | null => {
  const { user } = useAuthStore();
  return user?.role || null;
};

/**
 * Hook to check if the current user is an Admin
 * @returns boolean indicating if the user is an Admin
 */
export const useIsAdmin = (): boolean => {
  const { user } = useAuthStore();
  return user?.role === Role.ADMIN;
};

/**
 * Hook to check if the current user is an Agent
 * @returns boolean indicating if the user is an Agent
 */
export const useIsAgent = (): boolean => {
  const { user } = useAuthStore();
  return user?.role === Role.AGENT;
};

/**
 * Hook to check if the current user is a Provider
 * @returns boolean indicating if the user is a Provider
 */
export const useIsProvider = (): boolean => {
  const { user } = useAuthStore();
  return user?.role === Role.PROVIDER;
};
