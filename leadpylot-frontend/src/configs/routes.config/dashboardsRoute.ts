import type { Routes } from '@/@types/routes';
import { buildRoutesFromNavigation, mergeRoutes } from './buildRoutesFromNavigation';
import dashboardsNavigationConfig from '../navigation.config/dashboards.navigation.config';
import { hiddenRoutes } from './hiddenRoutes';

/**
 * Dynamic server-side route configuration for dashboard routes
 *
 * Combines:
 * 1. Routes from navigation config (shown in UI)
 * 2. Hidden routes (not shown in UI, but need permission checking)
 *
 * This eliminates duplicate configuration - just update navigation config or add to hiddenRoutes!
 */
const dashboardsRoute: Routes = mergeRoutes(
  buildRoutesFromNavigation(dashboardsNavigationConfig),
  hiddenRoutes
);

export default dashboardsRoute;
