import {
  LoadAndOpeningDropdown,
  StatusDropdown,
} from '@/app/(protected-pages)/dashboards/_components/SharedColumnConfig';
import { DashboardType } from '@/app/(protected-pages)/dashboards/_components/dashboardTypes';
import { FileHandler } from '@/app/(protected-pages)/dashboards/accepted-offers/_components/FileHandler';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { DOCUMENT_TYPES } from '@/components/shared/DocumentTypeOptions';
import StatusBadge from '@/components/shared/StatusBadge';
import Badge from '@/components/ui/Badge';
import Dialog from '@/components/ui/Dialog';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import Tooltip from '@/components/ui/Tooltip';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentHandler } from '@/hooks/useDocumentHandler';
import { useFileUploadHook } from '@/hooks/useFileUploadHook';
import { useOfferHighlight } from '@/hooks/useOfferHighlight';
import { hasRole } from '@/services/AuthService';
import { apiBulkDownloadDocuments } from '@/services/DocumentService';
import { Offer, TLead } from '@/services/LeadsService';
import { useDocument } from '@/services/hooks/useDocument';
import { useRestoreOffer } from '@/services/hooks/useLeads';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import classNames from '@/utils/classNames';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import {
  BULK_DOWNLOAD_COLUMN_LABELS,
  extractDocumentIdsFromItems,
} from '@/utils/extractDocumentIds';
import { useTableHeader } from '@/utils/hooks/useTableHeader';
import { parseKNumber } from '@/utils/utils';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLeadDetailsContextOptional } from '../LeadDetailsContext';
import { LeadDetailsActionButtons } from '../v2/LeadDetailsActionButtons';
import { LEAD_TABLE_NAMES } from '../v2/LeadDetailsBulkActionsContext';
import DeleteOfferDialog from './DeleteOfferDialog';
import EditLeadOfferDialog from './EditLeadOfferDialog';
import NotFoundData from './NotFoundData';
import { OfferEmailCell } from './OfferEmailCell';

// Memoized to prevent re-renders (and repeated GET /document-slots/offers/[offerId]) on row click, checkbox, etc.
const MemoizedOfferEmailCell = React.memo(OfferEmailCell);
import ViewOfferDialog from './ViewOfferDialog';

const SEND_COLUMN_TOOLTIP_ADMIN =
  'SEND: whether the offer email is still pending or already sent. Admins use the dropdown to set Pending or Sent so reporting and workflows stay accurate.';

const SEND_COLUMN_TOOLTIP_AGENT =
  "SEND: shows this offer's send status (e.g. Pending or Sent). Your role can view it only; ask an admin to change it.";

type OffersTableProps = {
  lead?: TLead;
  handleAddOpeningClick?: () => void;
  highlightedOfferId?: string | null;
  leftAction?: React.ReactNode;
  showInDialog?: boolean;
  actionBarPortalTargetId?: string;
  headerActionsPortalTargetId?: string;
  onRegisterColumnCustomization?: (open: () => void) => void;
  externalCustomizeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  selectionResetKey?: string | number;
};

const OffersTable = ({
  lead: leadProp,
  handleAddOpeningClick: handleAddOpeningClickProp,
  highlightedOfferId: highlightedOfferIdProp,
  leftAction,
  showInDialog: showInDialogProp,
  actionBarPortalTargetId,
  headerActionsPortalTargetId,
  onRegisterColumnCustomization,
  externalCustomizeButtonRef,
  selectionResetKey,
}: OffersTableProps) => {
  const ctx = useLeadDetailsContextOptional();
  const lead = ctx?.lead ?? leadProp;
  const handleAddOpeningClick = ctx?.handleAddOpeningClick ?? handleAddOpeningClickProp;
  const highlightedOfferId = ctx?.highlightedOfferId ?? highlightedOfferIdProp;
  const showInDialog = ctx?.showInDialog ?? showInDialogProp;

  if (!lead) {
    throw new Error('OffersTable must be used within LeadDetailsProvider or receive a lead prop');
  }
  const { user } = useAuth();
  const isAgent = user?.role === Role.AGENT;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<{
    id: string;
    amount: string | number;
  } | null>(null);
  const [offerToEdit, setOfferToEdit] = useState<Offer | null>(null);
  const [offerToView, setOfferToView] = useState<Offer | null>(null);
  const [openDocumentId, setOpenDocumentId] = useState<string>();
  const { data: documentData } = useDocument(openDocumentId);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [restoringOfferId, setRestoringOfferId] = useState<string | null>(null);
  const restoreOfferMutation = useRestoreOffer({
    onSuccess: () => {
      setRestoringOfferId(null);
    },
    onError: () => {
      setRestoringOfferId(null);
    },
  });
  const searchParams = useSearchParams();
  const highlightIdFromQuery = searchParams.get('highlightOffer');
  const effectiveHighlightId = highlightedOfferId || highlightIdFromQuery;
  const pinnedOfferId = effectiveHighlightId ? String(effectiveHighlightId) : null;

  const bulkSelectedIds = useSelectedItemsStore(
    useShallow((state) =>
      state.getCurrentPage() === LEAD_TABLE_NAMES.OFFERS
        ? state.getSelectedIds(LEAD_TABLE_NAMES.OFFERS)
        : []
    )
  );

  const selectedItems = useSelectedItemsStore(
    useShallow((state) =>
      state.getCurrentPage() === LEAD_TABLE_NAMES.OFFERS
        ? state.getSelectedItems(LEAD_TABLE_NAMES.OFFERS)
        : []
    )
  );

  const [isBulkDownloadConfirmOpen, setIsBulkDownloadConfirmOpen] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkDownloadConfirmData, setBulkDownloadConfirmData] = useState<{
    columnId: string;
    columnLabel: string;
    documentCount: number;
    ids: string[];
  } | null>(null);

  const queryClient = useQueryClient();
  const documentHandler = useDocumentHandler();
  const { uploadFiles, isUploading } = useFileUploadHook(['lead', lead?._id ?? '']);

  const handleFileUpload = useCallback(
    async (id: string, files: File[] | null | undefined, table?: string, fileType?: string) => {
      if (!files?.length || !table) return;
      const fileArray = Array.isArray(files) ? files : [files];
      try {
        await uploadFiles(table, id, fileArray, fileType || DOCUMENT_TYPES.OFFER_CONTRACT);
        queryClient.invalidateQueries({ queryKey: ['lead', lead._id] });
      } catch {
        // Error handled by mutation
      }
    },
    [uploadFiles, queryClient, lead._id]
  );

  const handleDocumentAction = useCallback(
    (item: any, documentType: string, action: 'preview' | 'download' | 'delete') => {
      // Normalize item: offer files may have nested document structure
      const normalized = item?.document
        ? {
          _id: item.document._id,
          filename: item.document.filename,
          type: item.document.type,
          offerId: item.offerId,
        }
        : item;
      documentHandler.handleDocumentAction(normalized, documentType, action);
    },
    [documentHandler]
  );

  const handleBulkDownload = useCallback(
    (columnId: string) => {
      if (!selectedItems?.length) return;
      const ids = extractDocumentIdsFromItems(selectedItems, columnId);
      if (!ids.length) {
        toast.push(<Notification type="warning">No documents to download</Notification>);
        return;
      }
      const columnLabel = BULK_DOWNLOAD_COLUMN_LABELS[columnId] ?? columnId;
      setBulkDownloadConfirmData({
        columnId,
        columnLabel,
        documentCount: ids.length,
        ids,
      });
      setIsBulkDownloadConfirmOpen(true);
    },
    [selectedItems]
  );

  const handleConfirmBulkDownload = useCallback(async (ids: string[], columnLabel?: string) => {
    if (!ids?.length) return;
    setIsBulkDownloading(true);
    try {
      await apiBulkDownloadDocuments(ids, columnLabel);
      toast.push(<Notification type="success">Download started</Notification>);
    } catch {
      toast.push(<Notification type="danger">Failed to download documents</Notification>);
    } finally {
      setIsBulkDownloading(false);
      setBulkDownloadConfirmData(null);
      setIsBulkDownloadConfirmOpen(false);
    }
  }, []);

  useEffect(() => {
    if (documentHandler.deleteAttachmentMutation.isSuccess && lead._id) {
      queryClient.invalidateQueries({ queryKey: ['lead', lead._id] });
    }
  }, [documentHandler.deleteAttachmentMutation.isSuccess, queryClient, lead._id]);

  const handleEditOffer = useCallback(
    (offer: Offer) => {
      const offerData = {
        ...offer,
        investment_volume: parseKNumber(offer.investment_volume),
        contact_name: lead.contact_name,
        lead_source_no: lead.lead_source_no,
        stage: lead.stage,
      };
      setOfferToEdit(offerData);
      setIsEditDialogOpen(true);
    },
    [lead.contact_name, lead.lead_source_no, lead.stage]
  );

  const handleDeleteOffer = (offer: Offer) => {
    setOfferToDelete({
      id: offer?._id,
      amount: offer?.investment_volume,
    });
    setIsDeleteDialogOpen(true);
  };

  const handleRestoreOffer = useCallback(
    (offer: Offer) => {
      if (!offer?._id) return;
      setRestoringOfferId(offer?._id);
      restoreOfferMutation.mutate(offer?._id);
    },
    [restoreOfferMutation]
  );

  const offers = useMemo(() => {
    if (!lead || !Array.isArray(lead.offers)) return [];
    const notOutOffers = lead.offers.filter((offer) => offer?.current_stage !== 'out');
    return notOutOffers.map((offer) => ({
      ...offer,
      agent_name: offer?.agent_id?.login,
      project_name: offer?.project_id?.name,
    }));
  }, [lead, lead?.offers]);

  // Use the offer highlight hook
  const { highlightedRowRef, isOfferHighlighted } = useOfferHighlight({
    highlightedOfferId,
    offers,
  });

  useEffect(() => {
    if (!effectiveHighlightId) return;

    setSelectedOfferId(effectiveHighlightId);
  }, [effectiveHighlightId]);

  const renderHeader = useTableHeader();

  const columns = useMemo<ColumnDef<Offer & { agent_name?: string; project_name?: string }>[]>(
    () => [
      // {
      //   // Expander column
      //   id: 'expander',
      //   header: () => null,
      //   cell: ({ row }) => (
      //     <>
      //       {row.getCanExpand() ? (
      //         <button className="text-lg" onClick={row.getToggleExpandedHandler()}>
      //           {row.getIsExpanded() ? (
      //             <ApolloIcon name="chevron-arrow-down" />
      //           ) : (
      //             <ApolloIcon name="chevron-arrow-right" />
      //           )}
      //         </button>
      //       ) : null}
      //     </>
      //   ),
      //   subCell: () => null,
      // },

      {
        id: 'agent',
        header: () => renderHeader('Agent'),
        accessorKey: 'agent_name',
        enableSorting: false,
        columnWidth: 62,
      },
      {
        id: 'investment_volume',
        header: () => renderHeader('Amount'),
        accessorKey: 'investment_volume',
        enableSorting: false,
        columnWidth: 73,
        cell: ({ row }) => <span>{row.original?.investment_volume || '-'}</span>,
      },
      {
        id: 'month',
        header: () => renderHeader('Month'),
        accessorKey: 'month',
        enableSorting: false,
        columnWidth: 66,
        cell: ({ row }) => <span>{row.original?.payment_terms?.info?.info?.months || '-'}</span>,
      },
      {
        id: 'rate',
        header: () => renderHeader('Rate'),
        accessorKey: 'rate',
        enableSorting: false,
        columnWidth: 59,
        cell: ({ row }) => <span>{row.original?.interest_rate}%</span>,
      },
      {
        id: 'bonusAmount',
        header: () => renderHeader('Bonus'),
        accessorKey: 'bonus_amount.name',
        enableSorting: false,
        columnWidth: 83,
        cell: ({ row }) => <span>{row.original?.bonus_amount?.name || '-'}</span>,
      },
      {
        id: 'bankName',
        header: () => renderHeader('Bank'),
        accessorKey: 'bank.name',
        enableSorting: false,
        columnWidth: 123,
        cell: ({ row }) => {
          return <span className="text-nowrap">{row.original.bank_id?.name || '-'}</span>;
        },
      },
      {
        id: 'stage',
        header: () => renderHeader('Stage'),
        accessorKey: 'stage',
        enableSorting: false,
        columnWidth: 110,
        cell: ({ row }: any) => {
          const stage = row?.original?.current_stage;
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
        id: 'send',
        header: () => renderHeader('Send'),
        accessorKey: 'status',
        enableSorting: false,
        columnWidth: 72,
        cell: ({ row }: any) => (
          <Tooltip
            title={user?.role === Role.ADMIN ? SEND_COLUMN_TOOLTIP_ADMIN : SEND_COLUMN_TOOLTIP_AGENT}
            placement="top"
            wrapperClass="inline-flex"
            className="max-w-sm! text-xs leading-snug"
          >
            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
              {user?.role === Role.ADMIN ? (
                <StatusDropdown
                  offerId={row.original?._id}
                  currentStatus={row.original?.status || ''}
                />
              ) : (
                <StatusBadge status={row.original?.status} />
              )}
            </div>
          </Tooltip>
        ),
      },
      {
        id: 'bankNickName',
        header: () => renderHeader(isAgent ? 'Bank' : 'BN. Name'),
        accessorKey: 'bank.nickname',
        enableSorting: false,
        columnWidth: 73,
        cell: ({ row }) => (
          <span className="text-nowrap">{row.original.bank_id?.nickName || '-'}</span>
        ),
      },
      {
        id: 'load_and_opening',
        header: () => <span className="whitespace-nowrap">O/L</span>,
        accessorKey: 'load_and_opening',
        enableSorting: false,
        columnWidth: 108,
        cell: ({ row }: any) => {
          const O_L_Status = row.original?.load_and_opening;
          const offerId = row.original?._id;
          if (!offerId) return <span className="text-gray-500">-</span>;
          return (
            <div className="w-fit" onClick={(e) => e.stopPropagation()}>
              {user?.role === Role.ADMIN ? (
                <LoadAndOpeningDropdown offerId={offerId} currentStatus={O_L_Status || ''} />
              ) : (
                <span className="text-gray-500">{O_L_Status || '-'}</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'offerType',
        header: () => renderHeader('Type'),
        accessorKey: 'offerType',
        enableSorting: false,
        columnWidth: 77,
        cell: ({ row }) => <span>{row?.original?.offerType || '-'}</span>,
      },
      {
        id: 'flex_option',
        header: () => renderHeader('Flex'),
        accessorKey: 'flex_option',
        enableSorting: false,
        columnWidth: 64,
        cell: ({ row }) => (
          <span>
            <Badge
              className={classNames(
                'bg-evergreen border-evergreen flex h-5 w-12 items-center justify-center rounded-full text-center text-xs text-white',
                row.original?.flex_option ? 'bg-evergreen' : 'bg-rust'
              )}
              content={row?.original?.flex_option ? 'True' : 'False'}
            ></Badge>
          </span>
        ),
      },
      {
        id: 'nametitle',
        header: () => renderHeader('Title'),
        accessorKey: 'nametitle',
        enableSorting: false,
        columnWidth: 58,
        cell: ({ row }) => <span>{row.original?.nametitle || '-'}</span>,
      },
      {
        id: 'createdAt',
        header: () => renderHeader('Created'),
        accessorKey: 'created_at',
        enableSorting: false,
        columnWidth: 92,
        cell: ({ row }) => (
          <span>
            {row.original?.created_at
              ? dateFormateUtils(row.original?.created_at, DateFormatType.SHOW_DATE)
              : '-'}
          </span>
        ),
      },
      {
        id: 'scheduled_date',
        header: () => renderHeader('Scheduled Date'),
        accessorKey: 'scheduled_date',
        enableSorting: false,
        columnWidth: 125,
        cell: ({ row }) => (
          <span>
            {row.original?.scheduled_date
              ? dateFormateUtils(row.original?.scheduled_date, DateFormatType.SHOW_DATE)
              : '-'}
          </span>
        ),
      },
      {
        id: 'scheduled_time',
        header: () => renderHeader('Scheduled Time'),
        accessorKey: 'scheduled_time',
        enableSorting: false,
        columnWidth: 129,
        cell: ({ row }) => <span>{row.original?.scheduled_time || '-'}</span>,
      },
      {
        id: 'offer',
        header: () => renderHeader('Offer'),
        accessorKey: 'offer',
        enableSorting: false,
        columnWidth: 88,
        cell: ({ row }) => {
          const rowData = row.original?.files;
          const offerEmail = rowData?.find(
            (file: any) => file?.type === DOCUMENT_TYPES?.OFFER_CONTRACT
          );
          if (user?.role !== Role?.ADMIN && !offerEmail) {
            return <span className="font-4xl font-bold whitespace-nowrap">-</span>;
          }
          return (
            <FileHandler
              offerId={row.original?._id}
              table="offers"
              type={DOCUMENT_TYPES.OFFER_CONTRACT}
              section={offerEmail}
              isFileUploading={isUploading}
              headerInfo={{
                column: 'contract',
                leadName: lead.contact_name ?? '-',
                table: DashboardType.OFFER,
              }}
              handleFileUpload={handleFileUpload}
              handleDocumentAction={handleDocumentAction}
              selectedItems={selectedItems}
              onBulkDownload={handleBulkDownload}
              columnId="offer"
            />
          );
        },
      },
      {
        id: 'email',
        header: () => renderHeader('Email'),
        accessorKey: 'email',
        enableSorting: false,
        columnWidth: 120,
        cell: ({ row }) => (
          <MemoizedOfferEmailCell
            offerId={row.original?._id ?? ''}
            lead={lead}
            opening={row.original?.opening}
            slotKey="offer_email"
            slotLabel="Offer Email"
            selectedItems={selectedItems}
            onBulkDownload={handleBulkDownload}
            columnId="email"
          />
        ),
      },
      {
        id: 'handover_notes',
        header: () => renderHeader('Notes'),
        accessorKey: 'handover_notes',
        enableSorting: false,
        columnWidth: 56,
        cell: ({ row }) => (
          <p className="line-clamp-1" title={row.original?.handover_notes || '-'}>
            {row.original?.handover_notes || '-'}
          </p>
        ),
      },
      // {
      //   header: 'Payment Terms',
      //   accessorKey: 'payment_terms.name',
      //   cell: ({ row }) => <span>{row.original.payment_terms?.name || '-'}</span>,
      // },
      /*
      {
        id: 'offer_actions',
        header: () => renderHeader('Actions'),
        enableSorting: false,
        cell: ({ row }) => {
          const isInactive = row.original?.active === false;
          const isRestoring = restoringOfferId === row.original?._id;
          return (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {isInactive ? (
                <Tooltip title="Restore Offer" wrapperClass="flex items-center">
                  <Button
                    onClick={() => handleRestoreOffer(row.original)}
                    disabled={isRestoring}
                    variant="solid"
                    className="bg-green-600 text-white hover:bg-green-700"
                    size="sm"
                  >
                    {isRestoring ? 'Restoring...' : 'Restore'}
                  </Button>
                </Tooltip>
              ) : (
                <span className="text-gray-400 text-sm">—</span>
              )}
            </div>
          );
        },
      },
      */
    ],
    [
      renderHeader,
      user?.role,
      isAgent,
      isUploading,
      lead,
      handleFileUpload,
      handleDocumentAction,
      selectedItems,
      handleBulkDownload,
    ]
  );

  // Row styling function for conditional styling (bulk selection + offerType + highlighted/pinned)
  const getRowClassName = useCallback(
    (row: any) => {
      const offer = row.original || row;
      const offerId = String(offer?._id ?? '');
      const isHighlighted = isOfferHighlighted(offer?._id);
      const isPinned = pinnedOfferId ? pinnedOfferId === offerId : false;
      const isSelected = selectedOfferId === offer?._id;
      const isActive = isSelected || isPinned;
      const isBulkSelected = bulkSelectedIds.includes(offerId);

      const offerTypeValue = offer?.offerType || offer?.offer_type || offer?.offer_type_name || '';
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
        'border-l-4 border-amber-400': isPinned,
        'border-l-4 border-ocean-2': !isPinned && isSelected,
        'bg-ocean-3/20 shadow-ocean-3 animate-bounce shadow-inner': isHighlighted,
        'bg-gray-300 dark:bg-[var(--dm-bg-elevated)] dark:text-[var(--dm-text-primary)]': isBulkSelected,
        'bg-gray-100 dark:bg-[var(--dm-bg-hover)] dark:text-[var(--dm-text-primary)]': isActive && !isHighlighted && !isBulkSelected,
        'bg-red-50 hover:bg-red-100':
          offer?.active === false && !isHighlighted && !isActive && !isBulkSelected,
        'hover:brightness-95': offerTypeClass && !isHighlighted && !isActive && !isBulkSelected,
        'hover:bg-gray-50 hover:shadow-sm':
          !offerTypeClass &&
          offer?.active !== false &&
          !isHighlighted &&
          !isActive &&
          !isBulkSelected,
      });
    },
    [pinnedOfferId, selectedOfferId, bulkSelectedIds, isOfferHighlighted]
  );

  // Expanded row functionality - commented out
  // const renderOpeningDetails = (row: any) => {
  //   const offer = row.original || row;
  //   const opening = offer?.opening;

  //   if (!opening) return <NotFoundData message="No opening information available." />;

  //   return (
  //     <div className="rounded px-6">
  //       <h5 className="mb-2 font-medium">Opening Details</h5>
  //       <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
  //         <div>
  //           <p className="text-sm text-gray-500">Created At</p>
  //           <p>
  //             {opening?.createdAt
  //               ? dateFormateUtils(opening?.createdAt, DateFormatType.SHOW_TIME)
  //               : 'N/A'}
  //           </p>
  //         </div>
  //         <div>
  //           <p className="text-sm text-gray-500">Status</p>
  //           <p>{opening?.active ? 'Active' : 'Inactive'}</p>
  //         </div>
  //       </div>

  //       {opening?.files && opening?.files?.length > 0 ? (
  //         <div className="mt-4">
  //           <h6 className="mb-2 font-medium">Files</h6>
  //           <ul className="flex flex-wrap gap-4">
  //             {opening?.files?.map((file: any) => {
  //               return (
  //                 <button onClick={() => handleDocumentClick(file?.document?._id)} key={file?._id}>
  //                   <li className="flex items-center rounded border border-gray-200 p-2">
  //                     <ApolloIcon name="picture" className={`mr-2 h-5 w-5 text-gray-400`} />
  //                     <p>{file?.document?.filename}</p>
  //                   </li>
  //                 </button>
  //               );
  //             })}
  //           </ul>
  //         </div>
  //       ) : (
  //         <div className="mt-4">
  //           <p className="text-sm text-gray-500">No files attached</p>
  //         </div>
  //       )}
  //     </div>
  //   );
  // };

  return (
    <div className="">
      <BaseTable
        tableName={LEAD_TABLE_NAMES.OFFERS}
        columns={columns}
        data={offers}
        loading={false}
        onRowClick={(row) => {
          const id = (row as any)?._id || (row as any)?.original?._id;
          if (id) setSelectedOfferId(id);
          handleEditOffer(row as any);
        }}
        totalItems={offers.length}
        pageIndex={1}
        pageSize={offers.length}
        showPagination={false}
        showSearchInActionBar={false}
        showActionsDropdown={true}
        showActionComponent={true}
        styleColumnSorting={
          actionBarPortalTargetId
            ? ''
            : showInDialog
              ? 'absolute right-8 -top-8.5'
              : 'absolute right-2 -top-8.5'
        }
        selectable={true}
        returnFullObjects={true}
        showSelectAllButton={false}
        customActions={
          <LeadDetailsActionButtons
            tableName={LEAD_TABLE_NAMES.OFFERS}
          // Edit and Delete commented out per product request
          // onEditSelected={(items) => {
          //   if (items?.length === 1) handleEditOffer(items[0]);
          // }}
          // onDeleteSelected={(items) => {
          //   if (items?.length === 1) handleDeleteOffer(items[0]);
          // }}
          />
        }
        actionBarPortalTargetId={actionBarPortalTargetId}
        headerActionsPortalTargetId={headerActionsPortalTargetId}
        onRegisterColumnCustomization={onRegisterColumnCustomization}
        externalCustomizeButtonRef={externalCustomizeButtonRef}
        selectionResetKey={selectionResetKey}
        compactSelectionButtons={!!actionBarPortalTargetId}
        rowClassName={getRowClassName}
        noData={offers.length === 0}
        customNoDataIcon={<NotFoundData message="No offers available for this lead." />}
        tableClassName="max-h-full"
        enableColumnResizing={hasRole(Role.AGENT) ? false : true}
        enableZoom={false}
        headerSticky={true}
        isBackendSortingReady={false}
        fixedHeight="auto"
        tableLayout="fixed"
        dynamicallyColumnSizeFit={true}
        commonActionBarClasses="mt-0 mb-0"
        leftCommonActions={leftAction}
      />
      {/* Expanded row functionality commented out - use renderExpandedRow prop if needed */}
      {/* renderExpandedRow={renderOpeningDetails} */}

      {/* Dialogs for this component */}
      <DeleteOfferDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        offer={offerToDelete}
      />

      <EditLeadOfferDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setOfferToEdit(null);
          setSelectedOfferId(null);
        }}
        offer={offerToEdit}
        projectId={lead?.project?.[0]?._id || ''}
      />

      <ViewOfferDialog
        isOpen={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false);
          setOfferToView(null);
        }}
        offer={offerToView}
        lead={lead}
      />

      <Dialog isOpen={isDocumentDialogOpen} onClose={() => setIsDocumentDialogOpen(false)}>
        {documentData && (
          <Image
            src={URL.createObjectURL(documentData)}
            alt="Document"
            width={window.innerWidth}
            height={window.innerHeight}
          />
        )}
      </Dialog>

      <DocumentPreviewDialog {...documentHandler.dialogProps} title="Offer Document" />

      <ConfirmDialog
        type="warning"
        isOpen={documentHandler.deleteConfirmOpen}
        title="Delete Document"
        onCancel={() => documentHandler.setDeleteConfirmOpen(false)}
        onConfirm={documentHandler.handleDeleteConfirm}
        confirmButtonProps={{ disabled: documentHandler.deleteAttachmentMutation.isPending }}
      >
        <p>
          Are you sure you want to delete the document &ldquo;
          {documentHandler.documentToDelete?.filename}&rdquo;?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      <ConfirmDialog
        type="info"
        isOpen={isBulkDownloadConfirmOpen}
        title="Bulk Download Documents"
        cancelText="Cancel"
        confirmText="Download"
        onCancel={() => {
          if (!isBulkDownloading) {
            setIsBulkDownloadConfirmOpen(false);
            setBulkDownloadConfirmData(null);
          }
        }}
        onConfirm={() => {
          const ids = bulkDownloadConfirmData?.ids ?? [];
          const columnLabel = bulkDownloadConfirmData?.columnLabel;
          handleConfirmBulkDownload(ids, columnLabel);
        }}
        confirmButtonProps={{
          disabled: isBulkDownloading,
          loading: isBulkDownloading,
        }}
        cancelButtonProps={{
          disabled: isBulkDownloading,
        }}
      >
        {bulkDownloadConfirmData && (
          <div className="space-y-2">
            <p>
              You are about to download <strong>{bulkDownloadConfirmData.documentCount}</strong>{' '}
              document
              {bulkDownloadConfirmData.documentCount !== 1 ? 's' : ''} from the{' '}
              <strong>{bulkDownloadConfirmData.columnLabel}</strong> column.
            </p>
            <p className="text-sm text-gray-600">
              Documents from all selected rows will be bundled into a single zip file.
            </p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
};

export default OffersTable;
