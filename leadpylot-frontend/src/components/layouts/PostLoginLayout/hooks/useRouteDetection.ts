import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { ROUTE_PATTERNS, matchesPattern } from '../utils/routePatterns';

export interface RouteInfo {
  isProjectDetailsPage: boolean;
  isAgentDetailPage: boolean;
  isAdminUsersCreatePage: boolean;
  isAdminBanksDetailPage: boolean;
  isLeadDetailsPage: boolean;
}

/**
 * Hook for detecting current route type
 * Centralizes route pattern matching logic
 */
export function useRouteDetection(finalPageInfo?: { title?: string }): RouteInfo {
  const pathname = usePathname();

  return useMemo(() => {
    // Detect project details page
    const isProjectDetailsPage = Boolean(
      pathname && matchesPattern(pathname, ROUTE_PATTERNS.PROJECTS_DETAIL)
    );

    // Detect agent detail page in reportings
    const isAgentDetailPage = Boolean(
      pathname?.startsWith('/admin/reportings') &&
      finalPageInfo?.title &&
      finalPageInfo.title.includes('Performance') &&
      !finalPageInfo.title.includes('Agent Performance Reports')
    );

    // Hide header title/subtitle on Admin Create User page
    const isAdminUsersCreatePage = Boolean(
      pathname && matchesPattern(pathname, ROUTE_PATTERNS.USERS_CREATE)
    );

    // Hide header title/subtitle on Admin Banks detail page
    const isAdminBanksDetailPage = Boolean(
      pathname && matchesPattern(pathname, ROUTE_PATTERNS.BANKS_DETAIL)
    );

    // Hide header title/subtitle on Lead details page
    const isLeadDetailsPage = Boolean(
      pathname && matchesPattern(pathname, ROUTE_PATTERNS.LEADS_DETAIL)
    );

    return {
      isProjectDetailsPage,
      isAgentDetailPage,
      isAdminUsersCreatePage,
      isAdminBanksDetailPage,
      isLeadDetailsPage,
    };
  }, [pathname, finalPageInfo?.title]);
}

