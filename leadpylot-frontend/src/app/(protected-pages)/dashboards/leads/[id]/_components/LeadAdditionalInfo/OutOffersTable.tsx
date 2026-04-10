import BaseTable from '@/components/shared/BaseTable/BaseTable';
import RoleGuard from '@/components/shared/RoleGuard';
import StatusBadge from '@/components/shared/StatusBadge';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Tooltip from '@/components/ui/Tooltip';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useAuth } from '@/hooks/useAuth';
import { useOfferHighlight } from '@/hooks/useOfferHighlight';
import { Offer, TLead } from '@/services/LeadsService';
import { useDocument } from '@/services/hooks/useDocument';
import { useRestoreOffer } from '@/services/hooks/useLeads';
import { useQueryClient } from '@tanstack/react-query';
import { useDocumentHandler } from '@/hooks/useDocumentHandler';
import { useFileUploadHook } from '@/hooks/useFileUploadHook';
import classNames from '@/utils/classNames';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import { parseKNumber } from '@/utils/utils';
import { useTableHeader } from '@/utils/hooks/useTableHeader';
import type { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DeleteOfferDialog from './DeleteOfferDialog';
import EditLeadOfferDialog from './EditLeadOfferDialog';
import NotFoundData from './NotFoundData';
import ViewOfferDialog from './ViewOfferDialog';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { FileHandler } from '@/app/(protected-pages)/dashboards/accepted-offers/_components/FileHandler';
import { DOCUMENT_TYPES } from '@/components/shared/DocumentTypeOptions';
import { DashboardType } from '@/app/(protected-pages)/dashboards/_components/dashboardTypes';
import { useLeadDetailsContext } from '../LeadDetailsContext';
import { LeadDetailsActionButtons } from '../v2/LeadDetailsActionButtons';
import { LEAD_TABLE_NAMES } from '../v2/LeadDetailsBulkActionsContext';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { useShallow } from 'zustand/react/shallow';
import { hasRole } from '@/services/AuthService';

interface OutOffersTableProps {
  actionBarPortalTargetId?: string;
  headerActionsPortalTargetId?: string;
  onRegisterColumnCustomization?: (open: () => void) => void;
  externalCustomizeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  selectionResetKey?: string | number;
}

const OutOffersTable = ({
  actionBarPortalTargetId,
  headerActionsPortalTargetId,
  onRegisterColumnCustomization,
  externalCustomizeButtonRef,
  selectionResetKey,
}: OutOffersTableProps) => {
  const { lead, handleAddOpeningClick, highlightedOfferId, showInDialog } = useLeadDetailsContext();
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
      state.getCurrentPage() === LEAD_TABLE_NAMES.OUT_OFFERS
        ? state.getSelectedIds(LEAD_TABLE_NAMES.OUT_OFFERS)
        : []
    )
  );

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
    const outOffers = lead.offers.filter((offer) => offer?.current_stage === 'out');
    return outOffers.map((offer) => ({
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        columnWidth: 96,
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
        id: 'interest_rate',
        header: () => renderHeader('Rate'),
        accessorKey: 'interest_rate',
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
        columnWidth: 129,
        cell: ({ row }) => {
          return <span className="text-nowrap">{row.original.bank_id?.name || '-'}</span>;
        },
      },
      {
        id: 'stage',
        header: () => renderHeader('Stage'),
        accessorKey: 'stage',
        enableSorting: false,
        columnWidth: 112,
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
        id: 'bankNickName',
        header: () => renderHeader(isAgent ? 'Bank' : 'BN. Name'),
        accessorKey: 'bank.nickname',
        enableSorting: false,
        columnWidth: 100,
        cell: ({ row }) => (
          <span className="text-nowrap">{row.original.bank_id?.nickName || '-'}</span>
        ),
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
        id: 'status',
        header: () => renderHeader('Status'),
        accessorKey: 'status',
        enableSorting: false,
        columnWidth: 72,
        cell: ({ row }) => <span>{row.original?.status}</span>,
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
        columnWidth: 56,
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
            />
          );
        },
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
      handleEditOffer,
      handleRestoreOffer,
      restoringOfferId,
      isAgent,
      renderHeader,
      user?.role,
      handleFileUpload,
      handleDocumentAction,
      isUploading,
      lead.contact_name,
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
        'bg-gray-300': isBulkSelected,
        'bg-gray-100': isActive && !isHighlighted && !isBulkSelected,
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
        tableName={LEAD_TABLE_NAMES.OUT_OFFERS}
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
            tableName={LEAD_TABLE_NAMES.OUT_OFFERS}
            onEditSelected={(items) => {
              if (items?.length === 1) handleEditOffer(items[0]);
            }}
            onDeleteSelected={(items) => {
              if (items?.length === 1) handleDeleteOffer(items[0]);
            }}
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
        tableLayout="auto"
        dynamicallyColumnSizeFit={true}
        commonActionBarClasses="mt-0 mb-0"
        leftCommonActions={undefined}
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
    </div>
  );
};

export default OutOffersTable;
