import { buildRoutePermissions, setRoutePermissions } from './auth.route.config';
import dashboardsNavigationConfig from './dashboards.navigation.config';
import adminNavigationConfig from './admin.navigation.config';
import { hiddenRoutes } from '../routes.config/hiddenRoutes';
import { Role } from './auth.route.config';
// Initialize route permissions from navigation configs AND hidden routes
// This should be called once during app initialization
export const initializeRoutePermissions = () => {
  // Build permissions from navigation configs
  const permissions = buildRoutePermissions(dashboardsNavigationConfig, adminNavigationConfig);

  // Add hidden routes (routes that don't appear in navigation but need permission checks)
  Object.entries(hiddenRoutes).forEach(([path, route]) => {
    permissions.push({
      path,
      roles: route.authority as Role[],
      description: `Hidden route: ${path} - Roles: ${route.authority.join(', ')}`,
    });
  });

  setRoutePermissions(permissions);

  // Optional: Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[RoutePermissions] Initialized with', permissions.length, 'routes');
    console.table(
      permissions.map((p) => ({
        path: p.path,
        roles: p.roles.join(', '),
      }))
    );
  }
};

// Auto-initialize on module load
initializeRoutePermissions();
