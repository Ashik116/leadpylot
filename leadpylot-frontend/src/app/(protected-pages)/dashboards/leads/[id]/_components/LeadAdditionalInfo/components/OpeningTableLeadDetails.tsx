import BaseTable from '@/components/shared/BaseTable/BaseTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { useOffersProgress } from '@/services/hooks/useOffersProgress';
import { OfferWithProgress } from '@/services/OffersProgressService';
import { dateFormateUtils, DateFormatType } from '@/utils/dateFormateUtils';
import type { ColumnDef } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import NotFoundData from '../NotFoundData';
import { useTableHeader } from '@/utils/hooks/useTableHeader';
import classNames from '@/utils/classNames';
import { useAuth } from '@/hooks/useAuth';
import { LeadDetailsActionButtons } from '../../v2/LeadDetailsActionButtons';
import { LEAD_TABLE_NAMES } from '../../v2/LeadDetailsBulkActionsContext';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { useShallow } from 'zustand/react/shallow';
import { Role } from '@/configs/navigation.config/auth.route.config';

type OpeningTableLeadDetailsProps = {
  leadId: string;
  openingsData?: any;
  pinnedOpening?: any | null;
  onViewOpening?: (openingId: string, offerId?: string) => void;
  highlightedOpeningId?: string | null;
  selectedOpeningId?: string | null;
  showInDialog?: boolean;
  actionBarPortalTargetId?: string;
  headerActionsPortalTargetId?: string;
  onRegisterColumnCustomization?: (open: () => void) => void;
  externalCustomizeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  selectionResetKey?: string | number;
};

const OpeningTableLeadDetails = ({
  leadId,
  openingsData,
  pinnedOpening,
  onViewOpening,
  highlightedOpeningId,
  selectedOpeningId,
  showInDialog,
  actionBarPortalTargetId,
  headerActionsPortalTargetId,
  onRegisterColumnCustomization,
  externalCustomizeButtonRef,
  selectionResetKey,
}: OpeningTableLeadDetailsProps) => {
  const { hasRole } = useAuth();
  const [animatingOpeningId, setAnimatingOpeningId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const pinnedOpeningId = pinnedOpening?._id
    ? String(pinnedOpening?._id)
    : highlightedOpeningId
      ? String(highlightedOpeningId)
      : null;
  const { data: openings, isLoading } = useOffersProgress({
    search: leadId,
    has_progress: 'all',
    page: 1,
    limit: 80,
    enabled: !openingsData,
  });
  const { tableData, addedPinned } = useMemo(() => {
    const baseData = openingsData?.data || openings?.data || [];
    if (!pinnedOpening) return { tableData: baseData, addedPinned: false };
    const pinnedId = String(pinnedOpening?._id ?? pinnedOpening?.id ?? '');
    if (!pinnedId) return { tableData: baseData, addedPinned: false };
    const exists = baseData.some((item: any) => String(item?._id ?? item?.id ?? '') === pinnedId);
    if (exists) {
      return { tableData: baseData, addedPinned: false };
    }
    return { tableData: [pinnedOpening, ...baseData], addedPinned: true };
  }, [openingsData?.data, openings?.data, pinnedOpening]);

  const renderHeader = useTableHeader();

  useEffect(() => {
    if (!highlightedOpeningId) return;
    const timeoutId = setTimeout(() => {
      setAnimatingOpeningId(highlightedOpeningId);
      setSelectedRowId(highlightedOpeningId);
    }, 0);

    const dismissTimeoutId = setTimeout(() => {
      setAnimatingOpeningId(null);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(dismissTimeoutId);
    };
  }, [highlightedOpeningId]);

  useEffect(() => {
    if (!selectedOpeningId) return;
    setTimeout(() => {
      setSelectedRowId(selectedOpeningId);
    }, 0);
  }, [selectedOpeningId]);

  const bulkSelectedIds = useSelectedItemsStore(
    useShallow((state) =>
      state.getCurrentPage() === LEAD_TABLE_NAMES.OPENINGS
        ? state.getSelectedIds(LEAD_TABLE_NAMES.OPENINGS)
        : []
    )
  );

  const columns = useMemo<ColumnDef<OfferWithProgress>[]>(
    () => [
      {
        id: 'agent',
        header: () => renderHeader('Agent'),
        accessorKey: 'agent_id.login',
        enableSorting: false,
        columnWidth: 60,
        cell: ({ row }) => <span>{row.original.agent_id?.login || '-'}</span>,
      },
      {
        id: 'investment_volume',
        header: () => renderHeader('Investment'),
        accessorKey: 'investment_volume',
        enableSorting: false,
        columnWidth: 75,
        cell: ({ row }) => <span>{row.original.investment_volume || '-'}</span>,
      },
      {
        id: 'month',
        header: () => renderHeader('Month'),
        accessorKey: 'payment_terms.info.info.months',
        enableSorting: false,
        columnWidth: 59,
        cell: ({ row }) => <span>{row.original.payment_terms?.info?.info?.months || '-'}</span>,
      },
      {
        id: 'interest_rate',
        header: () => renderHeader('Rate'),
        accessorKey: 'interest_rate',
        enableSorting: false,
        columnWidth: 50,
        cell: ({ row }) => <span>{row.original.interest_rate}%</span>,
      },
      {
        id: 'bonusAmount',
        header: () => renderHeader('Bonus'),
        accessorKey: 'bonus_amount.info.amount',
        enableSorting: false,
        columnWidth: 39,
        cell: ({ row }) => <span>{row.original.bonus_amount?.info?.amount ?? '-'}</span>,
      },
      {
        id: 'bankName',
        header: () => renderHeader('Bank'),
        accessorKey: 'bank_id.name',
        enableSorting: false,
        columnWidth: 112,
        cell: ({ row }) => <span className="text-nowrap">{row.original.bank_id?.name || '-'}</span>,
      },
      {
        id: 'stage',
        header: () => renderHeader('Stage'),
        accessorKey: 'stage',
        enableSorting: false,
        columnWidth: 110,
        cell: ({ row }) => {
          const stage = row.original.current_stage;
          if (!stage) return <span>-</span>;
          const displayStage = (stage === 'opening' ? 'Contract' : stage).replace('_', ' ');
          return (
            <div className="flex items-center gap-2">
              <StatusBadge status={displayStage} />
            </div>
          );
        },
      },
      {
        id: 'createdAt',
        header: () => renderHeader('Created'),
        accessorKey: 'created_at',
        enableSorting: false,
        columnWidth: 80,
        cell: ({ row }) => (
          <span>
            {row.original.created_at
              ? dateFormateUtils(row.original.created_at, DateFormatType.SHOW_DATE)
              : '-'}
          </span>
        ),
      },
      //   {
      //     id: 'actions',
      //     header: () => renderHeader('ACTIONS'),
      //     enableSorting: false,
      //     cell: ({ row }) => (
      //       <Button
      //         size="xs"
      //         variant="plain"
      //         onClick={() => onViewOpening?.(row.original._id)}
      //         title="View Details"
      //       >
      //         <ApolloIcon name="eye-filled" className="text-sm" />
      //       </Button>
      //     ),
      //   },
    ],
    [onViewOpening, renderHeader]
  );

  const getRowClassName = useCallback(
    (row: any) => {
      const opening = row.original || row;
      const openingId = String(opening?._id ?? opening?.id ?? opening?.offer_id?._id ?? '');
      const isHighlighted = animatingOpeningId && String(animatingOpeningId) === openingId;
      const isPinned = pinnedOpeningId ? String(pinnedOpeningId) === openingId : false;
      const isSelected = selectedRowId && String(selectedRowId) === openingId;
      const isActive = isSelected || isPinned;
      const isBulkSelected = bulkSelectedIds.includes(openingId);

      const offerTypeValue =
        opening?.offerType ||
        opening?.offer_id?.offerType ||
        opening?.offer_type ||
        opening?.offer_type_name ||
        '';
      const offerTypeClass =
        !isBulkSelected && !isActive && !isHighlighted
          ? offerTypeValue === 'ETF'
            ? 'bg-pink-50'
            : offerTypeValue === 'Festgeld'
              ? 'bg-blue-50'
              : offerTypeValue === 'Tagesgeld'
                ? 'bg-green-50'
                : ''
          : '';

      return classNames('transition-all duration-300 cursor-pointer', offerTypeClass, {
        'border-l-4 border-ocean-2': isSelected,
        'border-l-4 border-amber-400': !isSelected && isPinned,
        'bg-ocean-3/20 shadow-ocean-3 animate-bounce shadow-inner': isHighlighted,
        'bg-gray-300': isBulkSelected,
        'bg-gray-100': isActive && !isHighlighted && !isBulkSelected,
        'hover:brightness-95': offerTypeClass && !isHighlighted && !isActive && !isBulkSelected,
        'hover:bg-gray-50 hover:shadow-sm':
          !offerTypeClass && !isHighlighted && !isActive && !isBulkSelected,
      });
    },
    [animatingOpeningId, pinnedOpeningId, selectedRowId, bulkSelectedIds]
  );

  return (
    <div className="">
      <BaseTable
        tableName={LEAD_TABLE_NAMES.OPENINGS}
        columns={columns}
        data={tableData}
        loading={isLoading}
        loadingRowSize={10}
        totalItems={
          (openingsData?.meta?.total || openings?.meta?.total || 0) + (addedPinned ? 1 : 0)
        }
        pageIndex={openingsData?.meta?.page || openings?.meta?.page || 1}
        pageSize={openingsData?.meta?.limit || openings?.meta?.limit || 10}
        showPagination={false}
        showSearchInActionBar={false}
        showActionsDropdown={true}
        showActionComponent={true}
        selectable={true}
        returnFullObjects={true}
        showSelectAllButton={false}
        customActions={<LeadDetailsActionButtons tableName={LEAD_TABLE_NAMES.OPENINGS} />}
        actionBarPortalTargetId={actionBarPortalTargetId}
        headerActionsPortalTargetId={headerActionsPortalTargetId}
        onRegisterColumnCustomization={onRegisterColumnCustomization}
        externalCustomizeButtonRef={externalCustomizeButtonRef}
        selectionResetKey={selectionResetKey}
        compactSelectionButtons={!!actionBarPortalTargetId}
        rowClassName={getRowClassName}
        styleColumnSorting={
          actionBarPortalTargetId
            ? ''
            : showInDialog
              ? 'absolute right-8 -top-10'
              : 'absolute right-0 -top-10'
        }
        noData={openings?.data.length === 0}
        customNoDataIcon={<NotFoundData message="No openings available for this lead." />}
        tableClassName="max-h-full"
        enableColumnResizing={hasRole(Role.AGENT) ? false : true}
        enableZoom={false}
        headerSticky={false}
        isBackendSortingReady={false}
        fixedHeight="auto"
        tableLayout="fixed"
        commonActionBarClasses="mt-0 mb-0"
        onRowClick={(row) => {
          const opening = (row as any)?.original ?? (row as any);
          const openingId = opening?._id ?? opening?.id;
          const offerId = opening?.offer_id?._id ?? opening?.offer_id ?? opening?.offerId;
          if (openingId) setSelectedRowId(openingId);
          if (openingId) onViewOpening?.(openingId, offerId ? String(offerId) : undefined);
        }}
      />
    </div>
  );
};

export default OpeningTableLeadDetails;
