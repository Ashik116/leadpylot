/**
 * Side effects for UnifiedDashboard: agent notifications, API URL store, back URL, debug helpers.
 */
import { useEffect, useCallback } from 'react';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { isProgressDashboardType } from '@/utils/dashboardUtils';
import { DashboardType } from '../dashboardTypes';
import { EXPECTED_MULTI_LEVEL_GROUPING, VALID_PROGRESS_FILTERS } from './unifiedDashboardConstants';

interface UseUnifiedDashboardEffectsParams {
  pathname: string | null;
  searchParamsKey: string;
  dashboardType: string;
  isMultiTableMode: boolean;
  shouldSkipFlatViewApi: boolean;
  selectedGroupByLength: number;
  apiData: { data?: any[]; meta?: any } | null;
  domainFilters: any[];
  buildApiUrl: () => string | null;
  setBackUrl: (url: string) => void;
  setHasManuallyClearedGroupFilter: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsMultiLevelGroupingApplied: (value: boolean | ((prev: boolean) => boolean)) => void;
  sessionRole?: string;
  isOffersPage: boolean;
  isOpeningsPage: boolean;
  isConfirmationsPage: boolean;
  isPaymentsPage: boolean;
  selectedGroupBy: string[];
  isMultiLevelGroupingApplied: boolean;
}

export function useUnifiedDashboardEffects({
  pathname,
  searchParamsKey,
  dashboardType,
  isMultiTableMode,
  shouldSkipFlatViewApi,
  selectedGroupByLength,
  apiData,
  domainFilters,
  buildApiUrl,
  setBackUrl,
  setHasManuallyClearedGroupFilter,
  setIsMultiLevelGroupingApplied,
  sessionRole,
  isOffersPage,
  isOpeningsPage,
  isConfirmationsPage,
  isPaymentsPage,
  selectedGroupBy,
  isMultiLevelGroupingApplied,
}: UseUnifiedDashboardEffectsParams) {
  const isDashboardPage = isOffersPage || isOpeningsPage || isConfirmationsPage || isPaymentsPage;

  useEffect(() => {
    if (sessionRole === Role?.AGENT && isDashboardPage && selectedGroupBy?.length > 0) {
      const hasShownNotification = sessionStorage.getItem('agent-dashboard-filters-notification');
      if (!hasShownNotification) {
        sessionStorage.setItem('agent-dashboard-filters-notification', 'true');
      }
    }
    return () => {
      if (sessionRole === Role?.AGENT && isDashboardPage) {
        sessionStorage.setItem('agent-dashboard-filters-notification-clear', 'true');
      }
    };
  }, [sessionRole, isDashboardPage, selectedGroupBy?.length]);

  useEffect(() => {
    const shouldClear = sessionStorage.getItem('agent-dashboard-filters-notification-clear');
    if (shouldClear === 'true') {
      sessionStorage.removeItem('agent-dashboard-filters-notification');
      sessionStorage.removeItem('agent-dashboard-filters-notification-clear');
    }
    setHasManuallyClearedGroupFilter(false);
  }, [pathname, setHasManuallyClearedGroupFilter]);

  useEffect(() => {
    const expectedMultiLevelGrouping = [...EXPECTED_MULTI_LEVEL_GROUPING];
    const currentGroupBy = selectedGroupBy || [];
    const isExactMatch =
      currentGroupBy?.length === expectedMultiLevelGrouping?.length &&
      currentGroupBy?.every(
        (item: string, index: number) => item === expectedMultiLevelGrouping?.[index]
      );
    if (!isExactMatch && isMultiLevelGroupingApplied) {
      setIsMultiLevelGroupingApplied(false);
    }
  }, [selectedGroupBy, isMultiLevelGroupingApplied, setIsMultiLevelGroupingApplied]);

  useEffect(() => {
    const isProgressPage = isProgressDashboardType(dashboardType);
    if (
      (dashboardType !== DashboardType.OFFER && !isProgressPage) ||
      isMultiTableMode ||
      shouldSkipFlatViewApi ||
      selectedGroupByLength > 0
    )
      return;

    if (apiData?.data && apiData?.meta) {
      const apiUrl = buildApiUrl();
      if (apiUrl) useApiUrlStore.getState().setApiUrl(apiUrl);
    } else if (domainFilters && domainFilters.length > 0) {
      const apiUrl = buildApiUrl();
      if (apiUrl) useApiUrlStore.getState().setApiUrl(apiUrl);
    }
  }, [
    dashboardType,
    isMultiTableMode,
    shouldSkipFlatViewApi,
    selectedGroupByLength,
    apiData?.data,
    apiData?.meta,
    buildApiUrl,
    domainFilters,
  ]);

  useEffect(() => {
    if (pathname) {
      const backUrl = searchParamsKey ? `${pathname}?${searchParamsKey}` : pathname;
      setBackUrl(backUrl);
    }
  }, [pathname, searchParamsKey, setBackUrl]);

  const clearAllDashboardFilters = useCallback(() => {
    if (typeof window === 'undefined') return;
    VALID_PROGRESS_FILTERS.forEach((key) =>
      localStorage.removeItem(`dashboard_filter_${key}`)
    );
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).checkDashboardFilters = () => {
        const results: Record<string, string | null> = {};
        VALID_PROGRESS_FILTERS.forEach((key) => {
          results[`dashboard_filter_${key}`] = localStorage.getItem(`dashboard_filter_${key}`);
        });
        return results;
      };
      (window as any).clearDashboardFilters = clearAllDashboardFilters;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).checkDashboardFilters;
        delete (window as any).clearDashboardFilters;
      }
    };
  }, [clearAllDashboardFilters]);
}
