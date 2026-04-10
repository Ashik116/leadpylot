import type { NavigationTree } from '@/@types/navigation';
import adminNavigationConfig from './admin.navigation.config';
import dashboardsNavigationConfig from './dashboards.navigation.config';

const navigationConfig: NavigationTree[] = [
  ...dashboardsNavigationConfig,
  ...adminNavigationConfig,
];

export default navigationConfig;
