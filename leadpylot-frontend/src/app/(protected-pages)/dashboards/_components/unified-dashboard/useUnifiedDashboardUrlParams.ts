/**
 * Parse URL search params for dashboard pagination, search, sort.
 */
import { useSearchParams } from 'next/navigation';

export function useUnifiedDashboardUrlParams(defaultPageSize: number) {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString() || '';

  const pageIndex = Math.max(1, parseInt(searchParams.get('pageIndex') || '1', 10) || 1);
  const pageSize = Math.max(
    1,
    parseInt(searchParams.get('pageSize') || String(defaultPageSize), 10) || defaultPageSize
  );
  const search = searchParams.get('search');
  const status = searchParams.get('status') || undefined;
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  return {
    searchParams,
    searchParamsKey,
    pageIndex,
    pageSize,
    search,
    status,
    sortBy,
    sortOrder,
  };
}
