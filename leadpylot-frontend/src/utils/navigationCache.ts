import type { NavigationTree } from '@/@types/navigation';
import type { Role } from '@/configs/navigation.config/auth.route.config';

const NAVIGATION_CACHE_KEY = 'navigation-cache';

export interface NavigationCache {
  role: Role;
  navigationTree: NavigationTree[];
  timestamp: number;
}

/**
 * Save navigation cache to sessionStorage
 * @param role - User role
 * @param navigationTree - Navigation tree to cache
 */
export const saveNavigationCache = (
  role: Role | undefined,
  navigationTree: NavigationTree[]
): void => {
  if (!role || !navigationTree || navigationTree.length === 0) {
    return;
  }

  try {
    const cache: NavigationCache = {
      role,
      navigationTree,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(NAVIGATION_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    // Silently fail if sessionStorage is not available
  }
};

/**
 * Get navigation cache from sessionStorage
 * @returns Cached navigation data or null
 */
export const getNavigationCache = (): NavigationCache | null => {
  try {
    const cached = sessionStorage.getItem(NAVIGATION_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as NavigationCache;

    // Validate cache structure
    if (!parsed.role || !parsed.navigationTree || !Array.isArray(parsed.navigationTree)) {
      clearNavigationCache();
      return null;
    }

    return parsed;
  } catch (error) {
    // Clear corrupted cache
    clearNavigationCache();
    return null;
  }
};

/**
 * Clear navigation cache from sessionStorage
 * Called on logout to ensure fresh data on next login
 */
export const clearNavigationCache = (): void => {
  try {
    sessionStorage.removeItem(NAVIGATION_CACHE_KEY);
  } catch (error) {
    // Silently fail if sessionStorage is not available
  }
};
