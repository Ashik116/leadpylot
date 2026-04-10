import { useOffers } from '@/services/hooks/useLeads';
import { DEFAULT_PAGE_LIMIT } from '@/constants/pagination.constant';
import { apiGetOffers } from '@/services/LeadsService';
import { transformOffersData } from '../../_components/DataTransformUtils';
import { DashboardType } from '../../_components/dashboardTypes';
import OfferShortDetails from './OfferShortDetails';

// Column configuration for offers
// export const getOffersColumns = (props: {
//   expandedRowId: string;
//   handleExpanderToggle: (id: string) => void;
//   onOpenDocsModal: (rowData: any) => void;
//   onEditOffer?: (rowData: any) => void;
//   bonusAmountOptions?: any;
//   dashboardType: TDashboardType;
//   userRole?: string;
//   handleFileUpload?: (
//     id: string,
//     files: File[] | null | undefined,
//     table?: string,
//     fileType?: string,
//     fullItem?: any
//   ) => void;
//   handleDocumentAction?: (
//     item: any,
//     documentType: string,
//     action: 'preview' | 'download' | 'delete'
//   ) => void;
// }): ColumnDef<any>[] => {
//   return SharedColumnConfig(props);
// };

// Configuration object for offers dashboard
export const offersConfig = {
  pageSize: DEFAULT_PAGE_LIMIT,
  tableName: 'offers',
  searchPlaceholder: 'Search all offers',
  title: 'Offers',
  description: 'Total offers',
  invalidateQueries: ['offers', 'openings', 'confirmations', 'payment-vouchers', 'offers-progress'],
  bulkActionsConfig: {
    entityName: 'offers',
    deleteUrl: '/offers/',
    invalidateQueries: ['offers', 'leads'],
  },
  // Action buttons configuration
  showCreateOpening: true,
  showCreateConfirmation: true,
  showCreatePaymentVoucher: true,
  showBulkUpdate: true,
  showNetto: true,
  showBulkNetto: true,
  showProgressFilter: false,
  showRevert: false,
  initialProgressFilter: DashboardType?.OFFER,
  // File upload configuration
  fileUploadTableName: 'offers',
  // Row click configuration
  enableRowClick: true,
  getRowClickPath: (row: any) => `/dashboards/leads/${row?.leadId}`,
  defaultColumn: ['pdf', 'source_id', 'createdAt', 'updatedAt'],
  fixedHeight: '90dvh',
  headerSticky: true,
  tableLayout: 'fixed' as const,
  dynamicallyColumnSizeFit: false as const,
};

// Hook configuration for offers
export const offersHookConfig = {
  useDataHook: useOffers,
  apiFn: apiGetOffers,
  dataHookParams: {},
  transformData: transformOffersData,
  ExpandedRowComponent: OfferShortDetails,
  config: offersConfig,
};
