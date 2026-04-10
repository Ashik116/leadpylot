/**
 * Build API URL for dashboard data fetching.
 * Used for offers and progress pages (openings, confirmations, payments, netto, lost).
 * Keeps api-url-storage aligned with the actual API request shape.
 */
import { isProgressDashboardType } from '@/utils/dashboardUtils';
import { DashboardType } from '../dashboardTypes';

export interface BuildDashboardApiUrlParams {
  dashboardType: string;
  pageIndex: number;
  pageSize: number;
  search?: string | null;
  status?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
  hasTransferredOffer?: boolean;
  selectedProgressFilter?: string | null;
  domainFilters?: any[];
  dataHookParams?: Record<string, any>;
}

export function buildDashboardApiUrl(params: BuildDashboardApiUrlParams): string | null {
  const {
    dashboardType,
    pageIndex,
    pageSize,
    search,
    status,
    sortBy,
    sortOrder,
    hasTransferredOffer,
    selectedProgressFilter,
    domainFilters,
    dataHookParams,
  } = params;

  if (isProgressDashboardType(dashboardType)) {
    const baseUrl = '/offers/progress';
    const urlParams = new URLSearchParams();

    urlParams.set('page', pageIndex.toString());
    urlParams.set('limit', pageSize.toString());

    Object.entries(dataHookParams || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === 'page' || key === 'limit' || key === 'domain' || key === 'has_progress') return;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        urlParams.set(key, String(value));
      }
    });

    if (selectedProgressFilter) {
      urlParams.set('has_progress', selectedProgressFilter);
    } else if (dashboardType === DashboardType.OPENING) {
      urlParams.set('has_progress', 'opening');
    } else if (dashboardType === DashboardType.CONFIRMATION) {
      urlParams.set('has_progress', 'confirmation');
    } else if (dashboardType === DashboardType.PAYMENT) {
      urlParams.set('has_progress', 'payment');
    } else if (dashboardType === DashboardType.NETTO || dashboardType === DashboardType.NETTO1) {
      urlParams.set('has_progress', 'netto1');
    } else if (dashboardType === DashboardType.NETTO2) {
      urlParams.set('has_progress', 'netto2');
    } else if (dashboardType === DashboardType.LOST) {
      urlParams.set('has_progress', 'lost');
    }

    if (search) urlParams.set('search', search);
    if (sortBy) urlParams.set('sortBy', sortBy);
    if (sortOrder) urlParams.set('sortOrder', sortOrder);

    return `${baseUrl}?${urlParams.toString()}`;
  }

  if (dashboardType === DashboardType.OFFER) {
    const baseUrl = '/offers';
    const urlParams = new URLSearchParams();

    urlParams.set('page', pageIndex.toString());
    urlParams.set('limit', pageSize.toString());

    if (search) urlParams.set('search', search);
    if (status) urlParams.set('status', status);
    if (sortBy) urlParams.set('sortBy', sortBy);
    if (sortOrder) urlParams.set('sortOrder', sortOrder);
    if (hasTransferredOffer) urlParams.set('has_transferred_offer', 'true');

    if (domainFilters && domainFilters.length > 0) {
      urlParams.set('domain', JSON.stringify(domainFilters));
    }

    return `${baseUrl}?${urlParams.toString()}`;
  }

  return null;
}
