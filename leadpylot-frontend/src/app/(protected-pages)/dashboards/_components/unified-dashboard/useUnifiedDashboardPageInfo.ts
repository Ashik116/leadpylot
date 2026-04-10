/**
 * Sync page header (title, total, subtitle) with dashboard data.
 */
import { useEffect } from 'react';

interface UseUnifiedDashboardPageInfoParams {
  effectiveGroupByLength: number;
  shouldForceGroupedView: boolean;
  groupedDataLoading: boolean;
  groupedTotal: number;
  preFetchedIsLoading?: boolean;
  isLoading: boolean;
  flatTotal: number;
  getDynamicTitle: () => string;
  getDynamicSubtitle: (total: number) => string;
  setPageInfo: (info: any) => void;
}

export function useUnifiedDashboardPageInfo({
  effectiveGroupByLength,
  shouldForceGroupedView,
  groupedDataLoading,
  groupedTotal,
  preFetchedIsLoading,
  isLoading,
  flatTotal,
  getDynamicTitle,
  getDynamicSubtitle,
  setPageInfo,
}: UseUnifiedDashboardPageInfoParams) {
  useEffect(() => {
    const isGroupedView = effectiveGroupByLength > 0 || shouldForceGroupedView;
    if (isGroupedView) {
      if (groupedDataLoading) return;
      setPageInfo({
        title: getDynamicTitle(),
        total: groupedTotal,
        subtitle: getDynamicSubtitle(groupedTotal),
      } as any);
    } else {
      const currentLoading = preFetchedIsLoading !== undefined ? preFetchedIsLoading : isLoading;
      if (currentLoading) return;
      setPageInfo({
        title: getDynamicTitle(),
        total: flatTotal,
        subtitle: getDynamicSubtitle(flatTotal),
      } as any);
    }
  }, [
    effectiveGroupByLength,
    shouldForceGroupedView,
    groupedDataLoading,
    groupedTotal,
    preFetchedIsLoading,
    isLoading,
    flatTotal,
    getDynamicTitle,
    getDynamicSubtitle,
    setPageInfo,
  ]);
}
