import { useMemo } from 'react';
import { RouteInfo } from './useRouteDetection';

export interface HeaderVisibility {
  shouldHideHeaderTitle: boolean;
  shouldHideHeaderSubtitle: boolean;
}

/**
 * Hook to determine header visibility based on route
 * Centralized logic for showing/hiding header elements
 */
export function useHeaderVisibility(routeInfo: RouteInfo): HeaderVisibility {
  return useMemo(() => {
    const {
      isProjectDetailsPage,
      isAdminUsersCreatePage,
      isAdminBanksDetailPage,
      isLeadDetailsPage,
    } = routeInfo;

    const shouldHideHeaderTitle =
      isProjectDetailsPage || isAdminUsersCreatePage || isAdminBanksDetailPage;

    const shouldHideHeaderSubtitle = shouldHideHeaderTitle || isLeadDetailsPage;

    return {
      shouldHideHeaderTitle,
      shouldHideHeaderSubtitle,
    };
  }, [routeInfo]);
}

