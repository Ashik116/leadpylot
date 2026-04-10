'use client';

import { useMemo } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import RecentImportTab from '../recent-imports/components/RecentImportTab';
import {
  UnifiedImportDashboardProvider,
  useUnifiedImportDashboardContext,
} from '@/app/(protected-pages)/dashboards/_components/unified-dashboard/UnifiedDashboardContext';

interface UnifiedImportDashboardProps {
  dashboardType: 'recent-imports' | 'offers-import-history';
  // Data fetching
  useDataHook: any;
  dataHookParams?: any;
  // Data transformation
  transformData: (data: any) => any[];
  // Column configuration
  getColumns: (props: {
    onRevertClick?: (objectId: string, fileName: string) => void;
    dashboardType: 'recent-imports' | 'offers-import-history';
  }) => ColumnDef<any>[];
  // Configuration
  config: {
    pageSize: number;
    tableName: string;
    searchPlaceholder: string;
    title: string;
    description: string;
    // Actions
    onRevertClick?: (objectId: string, fileName: string) => void;
  };
  // Custom actions
  customActions?: React.ReactNode;
  headerTabs?: boolean;
  // Table display options
  showPagination?: boolean;
}

const UnifiedImportDashboard = ({
  dashboardType,
  useDataHook,
  dataHookParams = {},
  transformData,
  getColumns,
  config,
  customActions,
  showPagination = true,
  headerTabs = false,
}: UnifiedImportDashboardProps) => {
  return (
    <UnifiedImportDashboardProvider
      dashboardType={dashboardType}
      config={config}
      dataHookParams={dataHookParams}
      customActions={customActions}
      headerTabs={headerTabs}
      showPagination={showPagination}
    >
      <UnifiedImportDashboardContent
        useDataHook={useDataHook}
        transformData={transformData}
        getColumns={getColumns}
      />
    </UnifiedImportDashboardProvider>
  );
};

export default UnifiedImportDashboard;

const UnifiedImportDashboardContent = ({
  useDataHook,
  transformData,
  getColumns,
}: Pick<UnifiedImportDashboardProps, 'useDataHook' | 'transformData' | 'getColumns'>) => {
  const {
    dashboardType,
    config,
    customActions,
    headerTabs,
    showPagination,
    isOffersTab,
    pageIndex,
    pageSize,
    search,
    hookParams,
    handleTabChange,
  } = useUnifiedImportDashboardContext();

  // Fetch data using the provided hook
  const { data: apiData, isLoading } = useDataHook(hookParams);

  // Transform data for the table
  const transformedData = useMemo(() => {
    if (!apiData) return [];
    return transformData(apiData);
  }, [apiData, transformData]);

  // Define columns for DataTable
  const columns: ColumnDef<any>[] = useMemo(
    () =>
      getColumns({
        onRevertClick: config?.onRevertClick,
        dashboardType,
      }),
    [getColumns, config?.onRevertClick, dashboardType]
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: config?.tableName,
    data: transformedData,
    loading: isLoading,
    totalItems: apiData?.meta?.total || apiData?.data?.meta?.total || 0,
    pageSize: pageSize,
    showActionsDropdown: false,
    pageIndex: pageIndex,
    headerSticky: false,
    search: search || undefined,
    columns: columns,
    searchPlaceholder: config?.searchPlaceholder,
    selectable: false,
    // title: config?.title,
    // description: `${config?.description}: ${apiData?.meta?.total || apiData?.data?.meta?.total || 0}`,
    extraActions: (
      <div className="flex items-center gap-2">
        {customActions}
        {headerTabs && (
          <RecentImportTab isOffersTab={isOffersTab} handleTabChange={handleTabChange} />
        )}
      </div>
    ),
    showPagination: showPagination,
    fixedHeight: 'auto',
    // headerActions: headerTabs ? (
    //   <RecentImportTab isOffersTab={isOffersTab} handleTabChange={handleTabChange} />
    // ) : undefined,
    cardClassName: 'border-none',
  });

  return <BaseTable {...tableConfig} />;
};
