import type { Routes } from '@/@types/routes';
import type { NavigationTree } from '@/@types/navigation';
import { Role } from '../navigation.config/auth.route.config';

/**
 * Transform navigation config to server-side route config
 * This eliminates the need to maintain duplicate route configurations
 */
export const buildRoutesFromNavigation = (
  navigationConfig: NavigationTree[]
): Routes => {
  const routes: Routes = {};

  // Helper function to recursively extract routes
  const extractRoutes = (navItems: NavigationTree[], parentPath = '') => {
    navItems.forEach((item) => {
      const fullPath = item.path || parentPath;

      // If item has a path, add it to routes
      if (item.path && item.authority && item.path !== '') {
        // Check if it's a dynamic route
        const isDynamicRoute = item.path.includes('[') && item.path.includes(']');

        routes[item.path] = {
          key: item.key,
          authority: item.authority as Role[],
          meta: {
            pageContainerType: 'default',
          },
          ...(isDynamicRoute && { dynamicRoute: true }),
        };
      }

      // Recursively process submenu items
      if (item.subMenu && item.subMenu.length > 0) {
        extractRoutes(item.subMenu, fullPath);
      }
    });
  };

  extractRoutes(navigationConfig);
  return routes;
};

/**
 * Merge multiple route configurations
 */
export const mergeRoutes = (...routeConfigs: Routes[]): Routes => {
  const merged: Routes = {};

  routeConfigs.forEach((config) => {
    Object.entries(config).forEach(([path, routeConfig]) => {
      merged[path] = routeConfig;
    });
  });

  return merged;
};
