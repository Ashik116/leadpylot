import { useOffersProgress } from '@/services/hooks/useOffersProgress';
import { DEFAULT_PAGE_LIMIT } from '@/constants/pagination.constant';
import OpeningShortDetails from './OpeningShortDetails';
import { ColumnDef } from '@/components/shared/DataTable';
import { apiGetOffersProgress } from '@/services/OffersProgressService';
import SharedColumnConfig from '../../_components/SharedColumnConfig';
import { TDashboardType } from '../../_components/dashboardTypes';
import { transformOpeningsData } from '../../_components/DataTransformUtils';

// Column configuration for openings
export const getOpeningsColumns = (props: {
  expandedRowId: string;
  handleExpanderToggle: (id: string) => void;
  onOpenDocsModal: (rowData: any) => void;
  onEditOffer?: (rowData: any) => void;
  dashboardType: TDashboardType;
  userRole?: string;
}): ColumnDef<any>[] => {
  return SharedColumnConfig(props);
};

// Configuration object for openings dashboard
export const openingsConfig = {
  pageSize: DEFAULT_PAGE_LIMIT,
  tableName: 'openings',
  searchPlaceholder: 'Search all openings',
  title: 'Openings',
  description: 'Total openings',
  invalidateQueries: ['offers', 'openings', 'confirmations', 'payment-vouchers', 'offers-progress'],
  bulkActionsConfig: {
    entityName: 'openings',
    deleteUrl: '/openings/',
    invalidateQueries: ['openings', 'leads', 'offers-progress'],
  },
  // Action buttons configuration
  showCreateOpening: false,
  showCreateConfirmation: true,
  showCreatePaymentVoucher: true,
  showProgressFilter: true,
  showBulkUpdate: true,
  showNetto: true,
  showBulkNetto: true,
  showRevert: true,
  initialProgressFilter: 'all' as TDashboardType,
  // File upload configuration
  fileUploadTableName: 'offers',
  // Row click configuration
  enableRowClick: true,
  getRowClickPath: (row: any) => `/dashboards/leads/${row.leadId}`,
  defaultColumn: ['source_id', 'createdAt', 'updatedAt'],
  fixedHeight: '90dvh',
  headerSticky: true,
};

// Hook configuration for openings
export const openingsHookConfig = {
  useDataHook: useOffersProgress,
  apiFn: apiGetOffersProgress,
  dataHookParams: {},
  transformData: transformOpeningsData,
  getColumns: getOpeningsColumns,
  ExpandedRowComponent: OpeningShortDetails,
  config: openingsConfig,
};
