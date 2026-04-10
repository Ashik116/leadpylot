import type { Routes } from '@/@types/routes';
import { buildRoutesFromNavigation } from './buildRoutesFromNavigation';
import adminNavigationConfig from '../navigation.config/admin.navigation.config';

/**
 * Dynamic server-side route configuration for admin routes
 * Automatically built from adminNavigationConfig
 *
 * This eliminates duplicate configuration - just update the navigation config!
 */
const adminRoute: Routes = buildRoutesFromNavigation(adminNavigationConfig);

export default adminRoute;
