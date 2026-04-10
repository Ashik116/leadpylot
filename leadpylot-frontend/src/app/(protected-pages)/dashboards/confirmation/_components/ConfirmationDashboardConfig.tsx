import { useOffersProgress } from '@/services/hooks/useOffersProgress';
import OpeningShortDetails from '../../openings/_components/OpeningShortDetails';
import { ColumnDef } from '@/components/shared/DataTable';
import { apiGetOffersProgress } from '@/services/OffersProgressService';
import SharedColumnConfig from '../../_components/SharedColumnConfig';
import { TDashboardType } from '../../_components/dashboardTypes';
import { transformConfirmationsData } from '../../_components/DataTransformUtils';

// Column configuration for confirmations
export const getConfirmationsColumns = (props: {
  expandedRowId: string;
  handleExpanderToggle: (id: string) => void;
  onOpenDocsModal: (rowData: any) => void;
  onEditOffer?: (rowData: any) => void;
  dashboardType: TDashboardType;
  userRole?: string;
}): ColumnDef<any>[] => {
  return SharedColumnConfig(props);
};

// Configuration object for confirmations dashboard
export const confirmationsConfig = {
  pageSize: 50,
  tableName: 'confirmations',
  searchPlaceholder: 'Search all confirmations',
  title: 'Confirmations',
  description: 'Total confirmations',
  invalidateQueries: ['offers', 'openings', 'confirmations', 'payment-vouchers', 'offers-progress'],
  bulkActionsConfig: {
    entityName: 'confirmations',
    deleteUrl: '/confirmations/',
    invalidateQueries: ['confirmations', 'leads', 'offers-progress'],
  },
  // Action buttons configuration
  showCreateOpening: false,
  showCreateConfirmation: false,
  showCreatePaymentVoucher: true,
  showProgressFilter: true,
  showNetto: true,
  showBulkNetto: true,
  initialProgressFilter: 'confirmation' as TDashboardType,
  // File upload configuration
  fileUploadTableName: 'offers',
  // Row click configuration
  enableRowClick: true,
  getRowClickPath: (row: any) => `/dashboards/leads/${row?.leadId}`,
  defaultColumn: ['source_id'],
};

// Hook configuration for confirmations
export const confirmationsHookConfig = {
  useDataHook: useOffersProgress,
  apiFn: apiGetOffersProgress,
  dataHookParams: { has_progress: 'confirmation' },
  transformData: transformConfirmationsData,
  getColumns: getConfirmationsColumns,
  ExpandedRowComponent: OpeningShortDetails,
  config: confirmationsConfig,
};
