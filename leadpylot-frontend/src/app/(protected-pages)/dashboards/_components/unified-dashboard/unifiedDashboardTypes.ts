/**
 * TypeScript interfaces for UnifiedDashboard.
 */

import { TDashboardType } from '../dashboardTypes';

export interface UnifiedDashboardConfig {
  pageSize: number;
  tableName: string;
  searchPlaceholder: string;
  title: string;
  description: string;
  invalidateQueries: string[];
  bulkActionsConfig: {
    entityName: string;
    deleteUrl: string;
    invalidateQueries: string[];
  };
  showCreateOpening?: boolean;
  showCreateConfirmation?: boolean;
  showCreatePaymentVoucher?: boolean;
  showProgressFilter?: boolean;
  initialProgressFilter?: TDashboardType;
  fileUploadTableName: string;
  enableRowClick?: boolean;
  getRowClickPath?: (row: any) => string;
  defaultColumn?: string[];
  tableClassName?: string;
  fixedHeight?: string | number;
  sectionTitle?: string;
  disableDragDropDialogs?: boolean;
  glowingItemId?: string;
}

export interface UnifiedDashboardDataHookParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  [key: string]: any;
}

export type UseDataHook = (params: UnifiedDashboardDataHookParams) => {
  data: { data?: any[]; meta?: { total?: number } } | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
};

export type ApiFn = (params: any) => Promise<{ data?: any[] }>;
