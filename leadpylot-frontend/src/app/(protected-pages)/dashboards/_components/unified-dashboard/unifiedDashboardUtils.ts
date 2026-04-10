/**
 * Utility functions for UnifiedDashboard.
 * Dynamic titles and subtitles based on progress filter selection.
 */
import { DashboardType, TDashboardType } from '../dashboardTypes';

export interface DashboardConfig {
  title?: string;
  description?: string;
  showProgressFilter?: boolean;
}

/**
 * Get dynamic page title based on selected progress filter (for openings, confirmations, payments).
 */
export function getDynamicTitle(
  dashboardType: TDashboardType,
  selectedProgressFilter: TDashboardType,
  config: DashboardConfig
): string {
  const isProgressPage =
    dashboardType === DashboardType.OPENING ||
    dashboardType === DashboardType.CONFIRMATION ||
    dashboardType === DashboardType.PAYMENT;

  if (isProgressPage && config?.showProgressFilter) {
    switch (selectedProgressFilter) {
      case DashboardType.OPENING:
        return 'Openings';
      case DashboardType.PAYMENT:
        return 'Payment Vouchers';
      case DashboardType.CONFIRMATION:
        return 'Confirmations';
      case DashboardType.NETTO1:
        return 'Netto 1';
      case DashboardType.NETTO2:
        return 'Netto 2';
      case DashboardType.LOST:
        return 'Lost';
      default:
        return 'Openings';
    }
  }
  return config?.title ?? '';
}

/**
 * Get dynamic subtitle based on total count and progress filter.
 */
export function getDynamicSubtitle(
  total: number,
  dashboardType: TDashboardType,
  selectedProgressFilter: TDashboardType,
  config: DashboardConfig
): string {
  const isProgressPage =
    dashboardType === DashboardType.OPENING ||
    dashboardType === DashboardType.CONFIRMATION ||
    dashboardType === DashboardType.PAYMENT ||
    dashboardType === DashboardType.NETTO;

  if (isProgressPage && config?.showProgressFilter) {
    switch (selectedProgressFilter) {
      case DashboardType.OPENING:
        return `Showing ${total} opening${total !== 1 ? 's' : ''}`;
      case DashboardType.PAYMENT:
        return `Showing ${total} payment voucher${total !== 1 ? 's' : ''}`;
      case DashboardType.CONFIRMATION:
        return `Showing ${total} confirmation${total !== 1 ? 's' : ''}`;
      case DashboardType.NETTO1:
        return `Showing ${total} netto-1 item${total !== 1 ? 's' : ''}`;
      case DashboardType.NETTO2:
        return `Showing ${total} netto-2 item${total !== 1 ? 's' : ''}`;
      case DashboardType.LOST:
        return `Showing ${total} lost item${total !== 1 ? 's' : ''}`;
      default:
        return `${config?.description ?? ''}: ${total}`;
    }
  }
  return `${config?.description ?? ''}: ${total}`;
}
