import { useOffersProgress } from '@/services/hooks/useOffersProgress';
import OpeningShortDetails from '../../openings/_components/OpeningShortDetails';
import { ColumnDef } from '@/components/shared/DataTable';
import { apiGetOffersProgress } from '@/services/OffersProgressService';
import SharedColumnConfig from '../../_components/SharedColumnConfig';
import { DashboardType, TDashboardType } from '../../_components/dashboardTypes';
import { transformPaymentData } from '../../_components/DataTransformUtils';

// Column configuration for payment vouchers
export const getPaymentColumns = (props: {
    expandedRowId: string;
    handleExpanderToggle: (id: string) => void;
    onOpenDocsModal: (rowData: any) => void;
    onEditOffer?: (rowData: any) => void;
    dashboardType: TDashboardType;
    userRole?: string;
}): ColumnDef<any>[] => {
    return SharedColumnConfig(props);
};

// Configuration object for payment vouchers dashboard
export const paymentConfig = {
    pageSize: 50,
    tableName: 'payment-vouchers',
    searchPlaceholder: 'Search all payment vouchers',
    title: 'Payment Vouchers',
    description: 'Total payment vouchers',
    invalidateQueries: ['offers', 'openings', 'confirmations', 'payment-vouchers', 'offers-progress'],
    bulkActionsConfig: {
        entityName: 'payment-vouchers',
        deleteUrl: '/payment-vouchers/',
        invalidateQueries: ['payment-vouchers', 'leads', 'offers-progress'],
    },
    // Action buttons configuration
    showCreateOpening: false,
    showCreateConfirmation: false,
    showCreatePaymentVoucher: false,
    showProgressFilter: true,
    showBulkUpdate: true,
    showNetto: true,
    showBulkNetto: true,
    showRevert: true,
    initialProgressFilter: 'payment' as TDashboardType,
    // File upload configuration
    fileUploadTableName: 'offers',
    // Row click configuration
    enableRowClick: true,
    getRowClickPath: (row: any) => `/dashboards/leads/${row.leadId}`,
    defaultColumn: ['source_id'],
};

// Hook configuration for payment vouchers
export const paymentHookConfig = {
    useDataHook: useOffersProgress,
    apiFn: apiGetOffersProgress,
    dataHookParams: { has_progress: DashboardType.PAYMENT },
    transformData: transformPaymentData,
    getColumns: getPaymentColumns,
    ExpandedRowComponent: OpeningShortDetails,
    config: paymentConfig,
}; 