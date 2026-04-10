'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useCashflowEntries } from '@/services/hooks/useCashflow';
import { useGroupedSummary } from '@/services/hooks/useLeads';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { ColumnDef } from '@/components/shared/DataTable';
import { dateFormateUtils, DateFormatType } from '@/utils/dateFormateUtils';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { useTableScopedFilters } from '@/stores/multiTableFilterStore';
import { normalizeDomainFiltersForApi, toDomainFiltersJson, toFilterRules } from '@/utils/filterUtils';
import { FilterProvider } from '@/contexts/FilterContext';

// Transform entries data for the table
const transformEntriesData = (data: any[]) => {
  return (
    data?.map((entry: any) => {
      // New API structure: nested under offer_id
      // Old API structure: direct properties on entry
      const offer = entry.offer_id || {};
      const lead = offer.lead_id || entry.lead_id || {};
      const project = offer.project_id || entry.project_id || {};
      const agent = offer.agent_id || entry.agent_id || {};
      const bank = entry.current_bank_id || entry.initial_bank_id || entry.bank_id || {};

      return {
      _id: entry._id,
        title: offer.title || entry.title || 'N/A',
      reference_no: entry.reference_no || '-',
        leadName: lead.contact_name || 'N/A',
        leadId: lead._id,
        projectName: project.name || 'N/A',
        projectId: project._id,
        agentLogin: agent.login || 'N/A',
        agentId: agent._id,
        bankName: bank.name || 'N/A',
        bankNickName: bank.nickName || '',
        bankId: bank._id,
        investmentVolume: offer.investment_volume || entry.investment_volume || 0,
      amount: entry.amount || 0,
      currency: entry.currency || 'EUR',
      status: entry.status || 'active',
      createdAt: dateFormateUtils(entry.createdAt, DateFormatType.SHOW_DATE),
      originalData: entry,
      };
    }) || []
  );
};

// Entries table columns
const entriesColumns: ColumnDef<any>[] = [
  {
    id: 'reference_no',
    header: 'Reference',
    accessorKey: 'reference_no',
    size: 100,
  },
  {
    id: 'leadName',
    header: 'Lead',
    accessorKey: 'leadName',
    size: 150,
  },
  {
    id: 'title',
    header: 'Offer',
    accessorKey: 'title',
    size: 200,
  },
  {
    id: 'amount',
    header: 'Amount',
    accessorKey: 'amount',
    cell: ({ row }: any) => `${row.original.currency} ${row.original.amount?.toLocaleString()}`,
    size: 120,
  },
  {
    id: 'projectName',
    header: 'Project',
    accessorKey: 'projectName',
    size: 100,
  },
  {
    id: 'agentLogin',
    header: 'Agent',
    accessorKey: 'agentLogin',
    size: 100,
  },
  {
    id: 'bankName',
    header: 'Bank',
    accessorKey: 'bankName',
    cell: ({ row }: any) => {
      const nickname = row.original.bankNickName;
      return nickname ? `${row.original.bankName} (${nickname})` : row.original.bankName;
    },
    size: 150,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }: any) => (
      <span
        className={`rounded px-2 py-1 text-xs ${
          row.original.status === 'active'
            ? 'bg-green-100 text-green-800'
            : row.original.status === 'completed'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
        }`}
      >
        {row.original.status}
      </span>
    ),
    size: 100,
  },
  {
    id: 'createdAt',
    header: 'Created',
    accessorKey: 'createdAt',
    size: 100,
  },
];

const CashflowEntriesSection = () => {
  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  // Selection state - commented out for now
  // const [selectedRows, setSelectedRows] = useState<any[]>([]);

  // Use multi-table store for independent state management
  // Each table identified by unique tableId: 'cashflow-entries' and 'cashflow-transactions'
  const tableFilters = useTableScopedFilters('cashflow-entries');

  // Get sorting from store (used for both regular and grouped views)
  const { sorting } = useUniversalGroupingFilterStore();

  // Check if grouping is active
  const isGroupingActive = tableFilters.groupBy.length > 0;

  // Build API filters function for CustomFilterOption (domain → FilterRule)
  const buildApiFilters = useCallback(
    () => toFilterRules(tableFilters.userDomainFilters),
    [tableFilters.userDomainFilters]
  );

  // Convert domain filters to JSON string for API (normalize at boundary)
  const domainFiltersJson = useMemo(
    () => toDomainFiltersJson(tableFilters.userDomainFilters),
    [tableFilters.userDomainFilters]
  );

  // Fetch entries (only when NOT grouping)
  const { data: entriesData, isLoading: entriesLoading } = useCashflowEntries({
    limit: pageSize,
    page: page + 1,
    domain: domainFiltersJson, // Pass domain filters for flat view
    enabled: !isGroupingActive, // Disable when grouping is active
  });

  // Fetch grouped summary (only when grouping IS active)
  const { data: groupedData, isLoading: groupedLoading } = useGroupedSummary({
    entityType: 'CashflowEntry',
    domain: normalizeDomainFiltersForApi(tableFilters.userDomainFilters), // Normalize at API boundary
    groupBy: tableFilters.groupBy,
    page: page + 1,
    limit: pageSize,
    sortBy: sorting.sortBy || undefined,
    sortOrder: sorting.sortOrder || 'desc',
    enabled: isGroupingActive, // Enable when grouping is active
  });

  // Transform regular data
  const entries = useMemo(
    () => transformEntriesData(entriesData?.data || []),
    [entriesData?.data]
  );

  // Transform grouped data for GroupSummary component
  const groupedSummaryData = useMemo(() => {
    if (!groupedData?.data) return [];
    return groupedData.data;
  }, [groupedData]);

  // Determine loading state and total items based on mode
  const isLoading = isGroupingActive ? groupedLoading : entriesLoading;
  const totalItems = isGroupingActive
    ? groupedData?.meta?.total || 0
    : entriesData?.pagination?.total || 0;

  // Handlers
  const handlePaginationChange = useCallback((pageIndex: number, newPageSize: number) => {
    setPage(pageIndex);
    setPageSize(newPageSize);
  }, []);

  // Multi-table grouping handlers - isolated to this table only
  const handleGroupByChange = useCallback((newGroupBy: string[]) => {
    tableFilters.setGroupBy(newGroupBy);
    tableFilters.setEntityType('CashflowEntry');
    // Reset page to 1 when grouping changes
    setPage(0);
  }, [tableFilters]);

  const handleClearGroupBy = useCallback(() => {
    tableFilters.clearGrouping();
    // Reset page to 1 when clearing grouping
    setPage(0);
  }, [tableFilters]);

  // Selection handlers - commented out for now
  // const handleSelectedRowsChange = useCallback((rows: any[]) => {
  //   setSelectedRows(rows);
  // }, []);

  // Extra actions to show beside selection buttons - commented out for now
  // const extraActionsContent =
  //   selectedRows.length > 0 ? (
  //     <div className="flex items-center gap-1">
  //       <Button variant="solid" size="sm" onClick={handleAction1}>
  //         Action 1
  //       </Button>
  //       <Button variant="solid" size="sm" onClick={handleAction2}>
  //         Action 2
  //       </Button>
  //       <Button variant="solid" size="sm" onClick={handleAction3}>
  //         Action 3
  //       </Button>
  //     </div>
  //   ) : null;

  const handleGroupByArrayChangeWithReset = useCallback(
    (newGroupBy: string[]) => {
      handleGroupByChange(newGroupBy);
    },
    [handleGroupByChange]
  );

  return (
    <FilterProvider
      value={{
        buildApiFilters,
        handleGroupByArrayChangeWithReset,
        handleClearGroupByFilter: handleClearGroupBy,
        onGroupByArrayChange: handleGroupByArrayChangeWithReset,
      }}
    >
      <div>
        <h2 className="mb-3 text-lg font-semibold">Cashflow Entries</h2>
        <BaseTable
        tableName="cashflow-entries"
        tableId="cashflow-entries"
        data={isGroupingActive ? [] : entries} // Pass empty data when in grouped mode
        columns={entriesColumns}
        loading={isLoading}
        totalItems={totalItems}
        pageIndex={page}
        pageSize={pageSize}
        pageSizes={[5, 10, 20, 50]}
        onPaginationChange={handlePaginationChange}
        showNavigation={!isGroupingActive && totalItems > pageSize} // Hide navigation in grouped mode (handled by GroupSummary)
        fixedHeight="auto"
        showSearchInActionBar={true}
        searchPlaceholder="Search entries..."
        showActionsDropdown={true}
        // Row selection - commented out for now
        // selectable={true}
        // onSelectedRowsChange={handleSelectedRowsChange}
        // Custom actions beside selection buttons (rendered as children in CommonActionBar)
        // customActions={extraActionsContent}
        // Multi-table group by functionality - isolated to this table
        selectedGroupBy={tableFilters.groupBy}
        onGroupByChange={handleGroupByChange}
        onClearGroupBy={handleClearGroupBy}
        hasSelectedGroupBy={tableFilters.groupBy.length > 0}
        entityType="CashflowEntry"
        // Custom filter support
        buildApiFilters={buildApiFilters}
        // Grouped mode props - when grouping is active, render GroupSummary
        groupedMode={isGroupingActive}
        groupedData={groupedSummaryData}
        groupByFields={tableFilters.groupBy}
      />
    </div>
    </FilterProvider>
  );
};

export default CashflowEntriesSection;
