import { useMemo } from 'react';
import type { MoreMenuSection } from './useMoreMenuSections';
import { hasActiveChild, isPathActive } from '../utils/navMenuHelpers';
import { NavigationTree } from '@/@types/navigation';

/**
 * Hook to check if More menu is active
 */
export const useMoreMenuActive = (moreMenuSections: MoreMenuSection[], pathname: string) => {
  return useMemo(() => {
    return moreMenuSections.some((section) =>
      section.items.some((item) => {
        const hasActive = hasActiveChild(pathname, item.subMenu);
        return pathname === item.path || hasActive;
      })
    );
  }, [moreMenuSections, pathname]);
};

/**
 * Hook to check if a navigation item is active
 */
export const useNavItemActive = (
  pathname: string,
  navPath: string,
  subMenu?: NavigationTree[],
  activedRoute?: any,
  parentKey?: string
) => {
  return useMemo(() => {
    const isActive = pathname === navPath;
    const hasActive = hasActiveChild(pathname, subMenu);
    return isActive || activedRoute?.parentKey === parentKey || hasActive;
  }, [pathname, navPath, subMenu, activedRoute, parentKey]);
};

/**
 * Check if submenu item is active
 */
export const isSubItemActive = (pathname: string, subItemPath: string): boolean => {
  return isPathActive(pathname, subItemPath);
};
