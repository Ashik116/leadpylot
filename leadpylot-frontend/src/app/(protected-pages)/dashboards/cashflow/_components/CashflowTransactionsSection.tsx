'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useAllTransactions } from '@/services/hooks/useCashflow';
import { useGroupedSummary } from '@/services/hooks/useLeads';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { ColumnDef } from '@/components/shared/DataTable';
import { dateFormateUtils, DateFormatType } from '@/utils/dateFormateUtils';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { FilterProvider } from '@/contexts/FilterContext';
import { useTableScopedFilters } from '@/stores/multiTableFilterStore';
import { normalizeDomainFiltersForApi, toDomainFiltersJson, toFilterRules } from '@/utils/filterUtils';
import TransactionActionDialog, { TransactionActionType } from './TransactionActionDialog';
import { useTransactionActions } from './useTransactionActions';
import { TransactionStatusDropdown } from './TransactionStatusDropdown';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';

// Transform transactions data for the table
const transformTransactionsData = (data: any[]) => {
  return (
    data?.map((tx: any) => {
      const fromBank = tx.bank_id || tx.from_bank_id;
      const toBank = tx.counterparty_bank_id || tx.to_bank_id;

      return {
        _id: tx._id,
        transaction_type: tx.transaction_type,
        direction: tx.direction,
        amount: tx.amount || 0,
        currency: tx.currency || 'EUR',
        fees: tx.fees || 0,
        net_amount: tx.net_amount || 0,
        status: tx.status,
        fromBankName: fromBank?.name || 'N/A',
        fromBankNickName: fromBank?.nickName || '',
        fromBankId: fromBank?._id,
        toBankName: toBank?.name || 'N/A',
        toBankNickName: toBank?.nickName || '',
        toBankId: toBank?._id,
        createdBy: tx.created_by?.login || 'N/A',
        createdAt: dateFormateUtils(tx.created_at, DateFormatType.SHOW_DATE),
        notes: tx.notes || '',
        originalData: tx,
      };
    }) || []
  );
};

// Base transactions table columns (without checkbox - that's added dynamically)
// Note: Status column needs isAdmin prop, so we'll create columns inside the component
const createBaseTransactionsColumns = (isAdmin: boolean): ColumnDef<any>[] => [
  {
    id: 'direction',
    header: 'Direction',
    accessorKey: 'direction',
    cell: ({ row }: any) => (
      <span
        className={`rounded px-2 py-1 text-xs font-medium ${
          row.original.direction === 'incoming'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {row.original.direction === 'incoming' ? '↓ IN' : '↑ OUT'}
      </span>
    ),
    size: 80,
  },
  {
    id: 'transaction_type',
    header: 'Type',
    accessorKey: 'transaction_type',
    cell: ({ row }: any) => <span className="capitalize">{row.original.transaction_type}</span>,
    size: 100,
  },
  {
    id: 'fromBank',
    header: 'From Bank',
    accessorKey: 'fromBankName',
    cell: ({ row }: any) => {
      const nickname = row.original.fromBankNickName;
      return nickname ? `${row.original.fromBankName} (${nickname})` : row.original.fromBankName;
    },
    size: 150,
  },
  {
    id: 'toBank',
    header: 'To Bank',
    accessorKey: 'toBankName',
    cell: ({ row }: any) => {
      const nickname = row.original.toBankNickName;
      return nickname ? `${row.original.toBankName} (${nickname})` : row.original.toBankName;
    },
    size: 150,
  },
  {
    id: 'amount',
    header: 'Amount',
    accessorKey: 'amount',
    cell: ({ row }: any) => `${row.original.currency} ${row.original.amount?.toLocaleString()}`,
    size: 120,
  },
  {
    id: 'fees',
    header: 'Fees',
    accessorKey: 'fees',
    cell: ({ row }: any) =>
      row.original.fees > 0 ? `${row.original.currency} ${row.original.fees}` : '-',
    size: 80,
  },
  {
    id: 'net_amount',
    header: 'Net',
    accessorKey: 'net_amount',
    cell: ({ row }: any) => `${row.original.currency} ${row.original.net_amount?.toLocaleString()}`,
    size: 120,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }: any) => {
      const transactionId = row.original._id;
      const currentStatus = row.original.status || 'sent';

      if (!transactionId) return <span className="text-gray-500">-</span>;

      return (
        <div className="w-fit">
          {isAdmin ? (
            <TransactionStatusDropdown
              transactionId={transactionId}
              currentStatus={currentStatus}
            />
          ) : (
            <span
              className={`rounded px-2 py-1 text-xs ${
                currentStatus === 'received'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {currentStatus}
            </span>
          )}
        </div>
      );
    },
    size: 100,
  },
  {
    id: 'createdBy',
    header: 'Created By',
    accessorKey: 'createdBy',
    size: 100,
  },
  {
    id: 'createdAt',
    header: 'Date',
    accessorKey: 'createdAt',
    size: 100,
  },
  {
    id: 'notes',
    header: 'Notes',
    accessorKey: 'notes',
    cell: ({ row }: any) => (
      <span className="block max-w-[200px] truncate" title={row.original.notes}>
        {row.original.notes || '-'}
      </span>
    ),
    size: 200,
  },
];

const CashflowTransactionsSection = () => {
  // Get user session for role checking
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Selection state
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);

  // Dialog state
  const [dialogActionType, setDialogActionType] = useState<TransactionActionType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Use multi-table store for independent state management
  // Each table identified by unique tableId: 'cashflow-entries' and 'cashflow-transactions'
  const tableFilters = useTableScopedFilters('cashflow-transactions');

  // Set default grouping by bank_id on mount
  React.useEffect(() => {
    if (tableFilters.groupBy.length === 0) {
      tableFilters.setGroupBy(['bank_id']);
      tableFilters.setEntityType('CashflowTransaction');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - tableFilters is stable

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

  // Fetch transactions (only when NOT grouping)
  const { data: transactionsData, isLoading: transactionsLoading } = useAllTransactions({
    limit: pageSize,
    page: page + 1,
    sortField: sorting.sortBy || 'created_at',
    sortOrder: sorting.sortOrder || 'desc',
    domain: domainFiltersJson, // Pass domain filters for flat view
    enabled: !isGroupingActive, // Disable when grouping is active
  });

  // Fetch grouped summary (only when grouping IS active)
  const { data: groupedData, isLoading: groupedLoading } = useGroupedSummary({
    entityType: 'CashflowTransaction',
    domain: normalizeDomainFiltersForApi(tableFilters.userDomainFilters), // Normalize at API boundary
    groupBy: tableFilters.groupBy,
    page: page + 1,
    limit: pageSize,
    sortBy: sorting.sortBy || 'created_at',
    sortOrder: sorting.sortOrder || 'desc',
    enabled: isGroupingActive, // Enable when grouping is active
  });

  // Transform regular data
  const transactions = useMemo(() => {
    return transformTransactionsData(transactionsData?.data || []);
  }, [transactionsData?.data]);

  // Transform grouped data for GroupSummary component
  const groupedSummaryData = useMemo(() => {
    if (!groupedData?.data) return [];
    return groupedData.data;
  }, [groupedData]);

  // Determine loading state and total items based on mode
  const isLoading = isGroupingActive ? groupedLoading : transactionsLoading;
  const totalItems = isGroupingActive
    ? groupedData?.meta?.total || 0
    : transactionsData?.pagination?.total || 0;

  // Handlers
  const handlePaginationChange = useCallback((pageIndex: number, newPageSize: number) => {
    setPage(pageIndex);
    setPageSize(newPageSize);
  }, []);

  // Multi-table grouping handlers - isolated to this table only
  const handleGroupByChange = useCallback(
    (newGroupBy: string[]) => {
      tableFilters.setGroupBy(newGroupBy);
      tableFilters.setEntityType('CashflowTransaction');
      // Reset page to 1 when grouping changes
      setPage(0);
    },
    [tableFilters]
  );

  const handleClearGroupBy = useCallback(() => {
    tableFilters.clearGrouping();
    // Reset page to 1 when clearing grouping
    setPage(0);
  }, [tableFilters]);

  const handleGroupByArrayChangeWithReset = useCallback(
    (newGroupBy: string[]) => {
      handleGroupByChange(newGroupBy);
    },
    [handleGroupByChange]
  );

  // Selection handlers
  const handleSelectedRowsChange = useCallback(
    (rows: any[]) => {
      // BaseTable passes IDs, so we need to map them to full row objects
      const selectedRowObjects = transactions.filter((tx) => rows.includes(tx._id));
      setSelectedRows(selectedRowObjects);
    },
    [transactions]
  );

  // Transactions table columns - recreate when isAdmin changes
  const transactionsColumns: ColumnDef<any>[] = useMemo(
    () => createBaseTransactionsColumns(isAdmin),
    [isAdmin]
  );

  // Action handlers to open dialog
  const handleTransferClick = useCallback(() => {
    setDialogActionType('transfer');
    setIsDialogOpen(true);
  }, []);

  const handleRefundClick = useCallback(() => {
    setDialogActionType('refund');
    setIsDialogOpen(true);
  }, []);

  const handleBouncedClick = useCallback(() => {
    setDialogActionType('bounced');
    setIsDialogOpen(true);
  }, []);

  const handleBulkUpdateClick = useCallback(() => {
    setDialogActionType('bulk_update');
    setIsDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setDialogActionType(null);
  }, []);

  // Use the modular transaction actions hook
  const { handleAction } = useTransactionActions({
    onSuccess: () => {
      // Close dialog on success (notification is handled by the mutation hooks)
      handleDialogClose();
      // Clear selection after successful action by updating reset key
      setSelectionResetKey((prev) => prev + 1);
      setSelectedRows([]);
    },
    onError: () => {
      // Error notification is handled by the mutation hooks
      // Dialog remains open on error so user can retry or cancel
    },
  });

  const handleDialogSubmit = useCallback(
    async (actionType: TransactionActionType, formData: any, rows: any[]) => {
      try {
        await handleAction(actionType, formData, rows);
        // Dialog close is handled by onSuccess callback in useTransactionActions
      } catch {
        // Error handling is done by the hook's onError callback
      }
    },
    [handleAction]
  );

  // Extra actions to show beside selection buttons
  const extraActionsContent =
    selectedRows.length > 0 ? (
      <div className="flex items-center gap-1">
        <Button
          variant="default"
          size="sm"
          onClick={handleTransferClick}
          className="border-0 shadow-none"
          icon={<ApolloIcon name="exchange" />}
        >
          Transfer
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleRefundClick}
          className="border-0 shadow-none"
          icon={<ApolloIcon name="arrow-left" />}
        >
          Refund
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleBouncedClick}
          className="border-0 shadow-none"
          icon={<ApolloIcon name="ban" />}
        >
          Bounced
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleBulkUpdateClick}
          className="border-0 shadow-none"
          icon={<ApolloIcon name="refresh" />}
        >
          Bulk Update
        </Button>
      </div>
    ) : null;

  return (
    <FilterProvider
      value={{
        buildApiFilters,
        handleGroupByArrayChangeWithReset,
        handleClearGroupByFilter: handleClearGroupBy,
        onGroupByArrayChange: handleGroupByArrayChangeWithReset,
      }}
    >
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">All Transactions</h2>
        <BaseTable
        tableName="cashflow-transactions"
        tableId="cashflow-transactions"
        data={isGroupingActive ? [] : transactions} // Pass empty data when in grouped mode
        columns={transactionsColumns}
        loading={isLoading}
        totalItems={totalItems}
        pageIndex={page}
        pageSize={pageSize}
        pageSizes={[10, 25, 50, 100]}
        onPaginationChange={handlePaginationChange}
        showNavigation={!isGroupingActive && totalItems > pageSize} // Hide navigation in grouped mode (handled by GroupSummary)
        fixedHeight="50dvh"
        showSearchInActionBar={true}
        searchPlaceholder="Search transactions..."
        showActionsDropdown={true}
        // Row selection
        selectable={true}
        onSelectedRowsChange={handleSelectedRowsChange}
        selectionResetKey={selectionResetKey}
        // Custom actions beside selection buttons (rendered as children in CommonActionBar)
        customActions={extraActionsContent}
        // Local group by functionality - independent from global store
        selectedGroupBy={tableFilters.groupBy}
        onGroupByChange={handleGroupByChange}
        onClearGroupBy={handleClearGroupBy}
        hasSelectedGroupBy={tableFilters.groupBy.length > 0}
        entityType="CashflowTransaction"
        // Custom filter support
        buildApiFilters={buildApiFilters}
        // Grouped mode props - when grouping is active, render GroupSummary
        groupedMode={isGroupingActive}
        groupedData={groupedSummaryData}
        groupByFields={tableFilters.groupBy}
      />

      {/* Transaction Action Dialog */}
      {dialogActionType && (
        <TransactionActionDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          actionType={dialogActionType}
          selectedRows={selectedRows}
          onSubmit={handleDialogSubmit}
        />
      )}
    </div>
    </FilterProvider>
  );
};

export default CashflowTransactionsSection;
