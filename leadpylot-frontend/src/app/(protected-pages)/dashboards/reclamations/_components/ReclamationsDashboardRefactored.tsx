'use client';

import { ColumnDef } from '@tanstack/react-table';
import { useReclamation } from '@/services/hooks/useReclamation';
import { useGroupedSummary } from '@/services/hooks/useLeads';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useCurrentPageColumnsStore } from '@/stores/currentPageColumnsStore';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { FilterProvider } from '@/contexts/FilterContext';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import dayjs from 'dayjs';
import { useEffect, useMemo, useCallback } from 'react';
// Default page size for reclamations table
const RECLAMATIONS_PER_PAGE = 80;

export interface ReclamationType {
  _id: string;
  project_id: string;
  agent_id: {
    _id: string;
    login?: string;
    info?: {
      email?: string;
    };
  };
  lead_id: {
    _id: string;
    phone: string;
    email_from?: string;
    lead_date?: string;
    lead_source_no?: string;
  } | null;
  reason: string;
  status: number;
  response: string;
  createdAt: string;
  updatedAt: string;
}

const ReclamationsDashboardRefactored = () => {
  const router = useRouter();
  const { setCurrentPageColumns } = useCurrentPageColumnsStore();
  const { onAppendQueryParams } = useAppendQueryParams();

  // Set entityType to Reclamation when on reclamations page
  const setEntityType = useUniversalGroupingFilterStore((state) => state.setEntityType);
  const {
    groupBy: storeGroupBy,
    userDomainFilters,
    lockedDomainFilters,
    pagination,
    setPagination,
    setGroupBy,
    clearGrouping,
  } = useUniversalGroupingFilterStore();

  useEffect(() => {
    setEntityType('Reclamation' as any);
    return () => {
      setEntityType('Lead' as any); // Reset to default when leaving
    };
  }, [setEntityType]);

  // Get URL search params with defaults
  const pageIndex = Math.max(
    1,
    parseInt(useSearchParams().get('pageIndex') || String(pagination.page || 1), 10) || 1
  );
  const pageSize = Math.max(
    1,
    parseInt(useSearchParams().get('pageSize') || String(RECLAMATIONS_PER_PAGE), 10) ||
    RECLAMATIONS_PER_PAGE
  );
  const search = useSearchParams().get('search');
  const sortOrder = useSearchParams().get('sortOrder');
  const sortBy = useSearchParams().get('sortBy');

  // Sync URL to store pagination
  useEffect(() => {
    setPagination({ page: pageIndex, limit: pageSize });
  }, [pageIndex, pageSize, setPagination]);

  // Combine domain filters (locked + user)
  const domainFilters = useMemo(() => {
    return [...(lockedDomainFilters || []), ...(userDomainFilters || [])];
  }, [lockedDomainFilters, userDomainFilters]);

  const isGroupingActive = storeGroupBy && storeGroupBy.length > 0;

  // Fetch grouped summary when grouping is active
  const { data: groupedSummaryData, isLoading: groupedSummaryLoading } = useGroupedSummary({
    entityType: 'Reclamation',
    domain: domainFilters,
    groupBy: storeGroupBy || [],
    page: pageIndex,
    limit: pageSize,
    enabled: isGroupingActive,
    defaultFilters: { includeAll: true },
    search: search || undefined,
  });

  // Fetch flat reclamations when no grouping
  const { data: reclamationsData, isLoading: flatLoading } = useReclamation({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortOrder: sortOrder || undefined,
    sortBy: sortBy || undefined,
    domain: domainFilters.length > 0 ? domainFilters : undefined,
    enabled: !isGroupingActive,
  });

  const handleGroupByChange = useCallback(
    (newGroupBy: string[]) => {
      setGroupBy(newGroupBy);
      onAppendQueryParams({ pageIndex: 1, pageSize: pageSize || RECLAMATIONS_PER_PAGE });
    },
    [setGroupBy, onAppendQueryParams, pageSize]
  );

  const handleClearGroupBy = useCallback(() => {
    clearGrouping();
    onAppendQueryParams({ pageIndex: 1, pageSize: pageSize || RECLAMATIONS_PER_PAGE });
  }, [clearGrouping, onAppendQueryParams, pageSize]);

  const buildApiFilters = useCallback(() => [], []);

  // Define columns for DataTable
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'phone',
        header: () => 'Phone',
        accessorKey: 'lead_id.phone',
        enableSorting: true,
        cell: ({ row }) => (
          <div className="truncate whitespace-nowrap">{row.original.lead_id?.phone || '-'}</div>
        ),
      },
      {
        enableSorting: true,
        id: 'email',
        header: 'Email',
        accessorKey: 'lead_id.email_from',
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.lead_id?.email_from || '-'}</span>
        ),
      },
      {
        enableSorting: true,
        id: 'partnerId',
        header: 'Partner Id',
        accessorKey: 'lead_id.lead_source_no',
        cell: ({ row }) => (
          <div className="truncate whitespace-nowrap">
            {row.original?.lead_id?.lead_source_no || '-'}
          </div>
        ),
      },
      {
        id: 'source',
        header: 'Source ',
        accessorKey: 'lead_id?.source_id?.name',
        cell: ({ row }) => (
          <div className="truncate whitespace-nowrap">{row.original?.lead_id?.source_id?.name || '-'}</div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        enableSorting: false,
        cell: ({ row }) => {
          const status = row.original?.status;
          let text = '';
          let colorClass = '';

          if (status === 1) {
            text = 'Accepted';
            colorClass = 'bg-evergreen';
          } else if (status === 0) {
            text = 'Pending';
            colorClass = 'bg-ember';
          } else {
            text = 'Rejected';
            colorClass = 'bg-rust';
          }

          return (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${colorClass}`}
            >
              {text}
            </span>
          );
        },
      },
      {
        id: 'reason',
        header: 'Reason',
        accessorKey: 'reason',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original?.reason}</span>,
      },
      {
        id: 'response',
        header: 'Response',
        accessorKey: 'response',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original?.response || '-'}</span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Lead Date',
        accessorKey: 'createdAt',
        enableSorting: true,
        cell: ({ row }) => (
          <div className="truncate whitespace-nowrap">
            {dayjs(row.original?.lead_id?.lead_date).format('MMM D, YYYY')}
          </div>
        ),
      },
    ],
    []
  );

  // Set current page columns for export (same pattern as leads page - ExportDialog reads from store)
  useEffect(() => {
    if (columns?.length > 0) {
      setCurrentPageColumns(columns, 'reclamations');
    }
  }, [columns, setCurrentPageColumns]);

  const handleRowClick = (reclamation: ReclamationType) => {
    router.push(`/dashboards/reclamations/${reclamation?._id}`);
  };

  const sortedGroupedData = groupedSummaryData?.data || [];

  const totalItems = isGroupingActive
    ? groupedSummaryData?.meta?.total
    : reclamationsData?.meta?.total || 0;
  const isLoading = isGroupingActive ? groupedSummaryLoading : flatLoading;
  const tableData = isGroupingActive ? [] : reclamationsData?.data || [];

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'reclamations',
    data: tableData,
    isBackendSortingReady: true,
    loading: isLoading,
    selectable: true,
    returnFullObjects: true, // Required for export - full row objects go to selectedItemsStore
    totalItems: totalItems ?? 0,
    pageSize: pageSize,
    pageIndex: pageIndex,
    showActionsDropdown: true,
    search: search || undefined,
    columns,
    searchPlaceholder: 'Search all reclamations',
    bulkActionsConfig: {
      entityName: 'reclamations',
      deleteUrl: '/reclamations/',
      invalidateQueries: ['reclamations', 'grouped-summary'],
    },
    onRowClick: (row) => handleRowClick(row),
    rowClassName: 'cursor-pointer hover:bg-gray-50',
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Reclamations',
    pageInfoSubtitlePrefix: 'Total Reclamations',
    selectedGroupBy: storeGroupBy || [],
    onGroupByChange: handleGroupByChange,
    onClearGroupBy: handleClearGroupBy,
    hasSelectedGroupBy: isGroupingActive,
    showNavigation: !isGroupingActive || ((totalItems ?? 0) > 0 && (totalItems ?? 0) > pageSize),
    fixedHeight: '89dvh',
  });

  return (
    <FilterProvider
      value={{
        buildApiFilters,
        handleGroupByArrayChangeWithReset: handleGroupByChange,
        handleClearGroupByFilter: handleClearGroupBy,
        onGroupByArrayChange: handleGroupByChange,
      }}
    >
      <div className="px-2 xl:px-4">
        <div className="relative z-10 w-full">
          <BaseTable
            {...tableConfig}
            buildApiFilters={buildApiFilters}
            groupedMode={isGroupingActive}
            groupedData={sortedGroupedData}
            entityType="Reclamation"
            groupByFields={storeGroupBy || []}
          />
        </div>
      </div>
    </FilterProvider>
  );
};

export default ReclamationsDashboardRefactored;
