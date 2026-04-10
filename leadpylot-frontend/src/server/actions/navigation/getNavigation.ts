import navigationConfig from '@/configs/navigation.config';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { filterNavigationByRole } from '@/utils/filterNavigationByRole';

export async function getNavigation(session: any | null) {
  if (session && session?.user?.role?.toUpperCase() === Role.ADMIN.toUpperCase()) {
    return navigationConfig;
  } else if (session) {
    const roleNavigateConfig = filterNavigationByRole(navigationConfig, session?.user?.role);
    return roleNavigateConfig;
  }
}
