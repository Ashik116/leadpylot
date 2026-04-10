import type { NavigationTree } from '@/@types/navigation';

export type Operation = 'read' | 'create' | 'update' | 'delete';
export enum Role {
  ADMIN = 'Admin',
  AGENT = 'Agent',
  PROVIDER = 'Provider',
}

export enum Module {
  users = 'users',
  leads = 'leads',
  admin = 'admin',
  dashboard = 'dashboard',
  reports = 'reports',
}

interface AuthRoute {
  module: keyof typeof Module;
  operation: Operation[];
  role: Role;
  route: string;
}

// Legacy auth route configuration (kept for backward compatibility)
export const authRoute: AuthRoute[] = [
  {
    module: 'users',
    operation: ['read', 'create', 'update', 'delete'],
    role: Role.ADMIN,
    route: '/users',
  },
];

// Route permission configuration
// Defines which routes each role can access
export interface RoutePermission {
  path: string; // Route path (supports wildcards like /admin/*)
  roles: Role[]; // Roles that can access this route
  description?: string; // Optional description
}

// Helper function to recursively extract all routes from navigation config
const extractRoutesFromNav = (
  navItems: NavigationTree[],
  parentPath = ''
): Map<string, Role[]> => {
  const routeMap = new Map<string, Role[]>();

  navItems.forEach((item) => {
    // Skip items without path or authority
    if (!item.path && !item.subMenu?.length) {
      return;
    }

    // If item has a path, add it to the map
    if (item.path && item.authority) {
      // Handle empty path (parent items)
      const fullPath = item.path || parentPath;
      if (fullPath) {
        // Ensure authority is typed as Role[]
        routeMap.set(fullPath, item.authority as Role[]);
      }
    }

    // Recursively process submenu items
    if (item.subMenu && item.subMenu.length > 0) {
      const subRoutes = extractRoutesFromNav(item.subMenu, item.path);
      subRoutes.forEach((roles, path) => {
        routeMap.set(path, roles);
      });
    }
  });

  return routeMap;
};

// Dynamically build route permissions from navigation configs
// This will be called with the actual navigation configs
export const buildRoutePermissions = (
  dashboardsConfig: NavigationTree[],
  adminConfig: NavigationTree[]
): RoutePermission[] => {
  const allRoutes = new Map<string, Role[]>();

  // Extract routes from both configs
  const dashboardRoutes = extractRoutesFromNav(dashboardsConfig);
  const adminRoutes = extractRoutesFromNav(adminConfig);

  // Merge all routes
  dashboardRoutes.forEach((roles, path) => {
    allRoutes.set(path, roles);
  });

  adminRoutes.forEach((roles, path) => {
    allRoutes.set(path, roles);
  });

  // Convert to RoutePermission array
  return Array.from(allRoutes.entries()).map(([path, roles]) => ({
    path,
    roles,
    description: `Route: ${path} - Roles: ${roles.join(', ')}`,
  }));
};

// Global route permissions storage
let globalRoutePermissions: RoutePermission[] = [];

// Setter to update route permissions dynamically
export const setRoutePermissions = (permissions: RoutePermission[]) => {
  globalRoutePermissions = permissions;
};

// Getter for route permissions
export const getRoutePermissionsList = () => globalRoutePermissions;

// Helper function to check if a route matches a pattern
export const matchesRoutePattern = (route: string, pattern: string): boolean => {
  // Exact match
  if (pattern === route) {
    return true;
  }

  // Wildcard match (e.g., /admin/*)
  if (pattern.endsWith('/*')) {
    const basePath = pattern.slice(0, -2);
    return route.startsWith(basePath + '/') || route === basePath;
  }

  // Next.js dynamic route match (e.g., /dashboards/leads/[id])
  if (pattern.includes('[') && pattern.includes(']')) {
    // Split by / and handle each segment
    const patternParts = pattern.split('/');
    const routeParts = route.split('/');

    if (patternParts.length !== routeParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const routePart = routeParts[i];

      // If pattern part is [id], [slug], etc., it matches anything
      if (patternPart.startsWith('[') && patternPart.endsWith(']')) {
        continue; // Skip - matches any segment
      }

      // Otherwise, exact match required
      if (patternPart !== routePart) {
        return false;
      }
    }

    return true;
  }

  return false;
};

// Helper function to get permission for a specific route
export const getRoutePermission = (route: string): RoutePermission | null => {
  // Find exact or wildcard match in the dynamically built permissions
  const permission = globalRoutePermissions.find((perm) =>
    matchesRoutePattern(route, perm.path)
  );

  return permission || null;
};

// Check if a role has access to a route
export const hasRouteAccess = (route: string, userRole: Role): boolean => {
  // Admin has access to ALL routes by default
  if (userRole === Role.ADMIN) {
    return true;
  }

  const permission = getRoutePermission(route);

  // If no specific permission found, default to Admin-only (non-Admin denied)
  if (!permission) {
    return false;
  }

  // Check if user's role is in the allowed roles
  return permission.roles.includes(userRole);
};
