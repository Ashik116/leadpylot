import { apiGetOffersProgress } from '@/services/OffersProgressService';
import { useOffersProgress } from '@/services/hooks/useOffersProgress';
import { transformNettoData } from '../../_components/DataTransformUtils';
import SharedColumnConfig from '../../_components/SharedColumnConfig';
import { TDashboardType } from '../../_components/dashboardTypes';
import OpeningShortDetails from '../../openings/_components/OpeningShortDetails';

// Enhanced column configuration for netto with Netto-specific columns
// export const getNettoColumns = (props: {
//   expandedRowId: string;
//   handleExpanderToggle: (id: string) => void;
//   onOpenDocsModal: (rowData: any) => void;
//   onEditOffer?: (rowData: any) => void;
//   dashboardType: TDashboardType;
//   userRole?: string;
// }): ColumnDef<any>[] => {
//   const baseColumns = SharedColumnConfig(props);

//   // Add Netto-specific columns
//   // const nettoColumns: ColumnDef<any>[] = [
//   //   {
//   //     id: 'Revenue',
//   //     header: 'Revenue',
//   //     accessorKey: 'Revenue',
//   //     size: 170,
//   //     cell: ({ row }: any) => {
//   //       const revenue = row.original.netRevenue;
//   //       const visibleAmounts = row.original.visibleAmounts || [];

//   //       // Only show if user has permission to see revenue
//   //       if (!visibleAmounts.includes('revenue')) {
//   //         return <span className="text-gray-400">-</span>;
//   //       }

//   //       return (
//   //         <span className="font-medium text-gray-900">
//   //           {revenue ? formatCurrency(revenue) : '-'}
//   //         </span>
//   //       );
//   //     },
//   //   },
//   //   {
//   //     id: 'bankRate',
//   //     header: 'Bank Rate',
//   //     size: 140,
//   //     cell: ({ row }: any) => {
//   //       const { bankerRate, bankShare } = row.original;

//   //       return (
//   //         <div className="space-y-1">
//   //           {bankerRate ? (
//   //             <span className="font-mono text-sm text-gray-700">{`${formatCurrency(bankShare)} (${bankerRate}%)`}</span>
//   //           ) : (
//   //             '-'
//   //           )}
//   //         </div>
//   //       );
//   //     },
//   //   },
//   //   // Only show Agent Rate column if user is not an agent
//   //   ...(props?.userRole === Role.AGENT
//   //     ? []
//   //     : [
//   //       {
//   //         id: 'agentRate',
//   //         header: 'Agent Rate',
//   //         size: 140,
//   //         cell: ({ row }: any) => {
//   //           const { agentRate, agentShare } = row.original;

//   //           return (
//   //             <span className="font-mono text-sm text-gray-700">{`${formatCurrency(agentShare)} (${agentRate}%)`}</span>
//   //           );
//   //         },
//   //       },
//   //     ]),
//   // ];

//   return [...baseColumns];
// };

// Enhanced configuration object for netto dashboard
export const nettoConfig = {
  pageSize: 50,
  tableName: 'netto',
  searchPlaceholder: 'Search...',
  title: 'Netto',
  description: 'Total ',
  invalidateQueries: [
    'offers',
    'openings',
    'confirmations',
    'payment-vouchers',
    'offers-progress',
    'netto',
  ],
  bulkActionsConfig: {
    entityName: 'offers',
    deleteUrl: '/offers/',
    invalidateQueries: ['netto', 'leads', 'offers-progress', 'offers'],
  },

  // Action buttons configuration
  showCreateOpening: false,
  showCreateConfirmation: false,
  showCreatePaymentVoucher: false,
  showNetto: true, // Enable Netto functionality
  showProgressFilter: true,
  showBulkUpdate: true,
  showBulkNetto: true,
  showRevert: true,
  initialProgressFilter: 'netto' as TDashboardType,

  // Netto-specific configuration
  nettoConfig: {
    allowBulkNetto: true,
    requireRates: true,
    defaultBankerRate: 30,
    defaultAgentRate: 25,
    enableRevenuePreview: true,
    showCalculationDetails: true,
  },

  // File upload configuration
  fileUploadTableName: 'offers',

  // Row click configuration
  enableRowClick: true,
  getRowClickPath: (row: any) => `/dashboards/leads/${row.leadId}`,
  defaultColumn: ['source_id', 'createdAt', 'updatedAt'],
  // // Custom filters for Netto
  // customFilters: [
  //   {
  //     key: 'nettoStage',
  //     label: 'Netto Stage',
  //     options: [
  //       { value: 'all', label: 'All Stages' },
  //       { value: 'pending', label: 'Pending' },
  //       { value: 'netto1', label: 'Netto1' },
  //       { value: 'netto2', label: 'Netto2' },
  //     ],
  //   },
  //   {
  //     key: 'hasRates',
  //     label: 'Commission Status',
  //     options: [
  //       { value: 'all', label: 'All' },
  //       { value: 'with_rates', label: 'Rates Configured' },
  //       { value: 'without_rates', label: 'Rates Missing' },
  //     ],
  //   },
  //   {
  //     key: 'leadStage',
  //     label: 'Lead Stage',
  //     options: [
  //       { value: 'all', label: 'All Stages' },
  //       { value: 'Opening', label: 'Opening' },
  //       { value: 'Positiv', label: 'Positiv' },
  //     ],
  //   },
  //   {
  //     key: 'offerType',
  //     label: 'Offer Type',
  //     options: [
  //       { value: 'all', label: 'All Types' },
  //       { value: 'ETF', label: 'ETF' },
  //       { value: 'Bond', label: 'Bond' },
  //       { value: 'Stocks', label: 'Stocks' },
  //     ],
  //   },
  // ],

  // Export configuration
  exportConfig: {
    filename: 'netto_offers',
    includeCalculations: true,
    roleBasedExport: true,
  },
};

// Hook configuration for netto
export const nettoHookConfig = {
  useDataHook: useOffersProgress,
  apiFn: apiGetOffersProgress,
  dataHookParams: {},
  transformData: transformNettoData,
  getColumns: SharedColumnConfig,
  ExpandedRowComponent: OpeningShortDetails,
  config: nettoConfig,
};
