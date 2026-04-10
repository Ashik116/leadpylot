// 'use client';

// import CommonActionBar from '@/components/shared/ActionBar/CommonActionBar';
// import ConfirmDialog from '@/components/shared/ConfirmDialog';
// import DataTable, { ColumnDef } from '@/components/shared/DataTable';
// import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
// import ApolloIcon from '@/components/ui/ApolloIcon';
// import Card from '@/components/ui/Card';
// import Notification from '@/components/ui/Notification';
// import ScrollBar from '@/components/ui/ScrollBar';
// import toast from '@/components/ui/toast';
// import { useColumnCustomization } from '@/hooks/useColumnCustomization';
// import { useSearchAndPaganation } from '@/hooks/useSearchPagination';
// import { useOffers, useUpdateOffer } from '@/services/hooks/useLeads';
// import { useCreateOpeningWithoutFiles } from '@/services/hooks/useOpenings';
// import { useDocumentHandler } from '@/hooks/useDocumentHandler';
// import { useBulkActions } from '@/hooks/useBulkActions';
// import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
// import { FileHandler } from '../../accepted-offers/_components/FileHandler';
// import { OfferApiResponse } from '@/services/LeadsService';
// import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
// import { getPaginationOptions } from '@/utils/paginationNumber';
// import { useRouter, useSearchParams } from 'next/navigation';
// import React, { useCallback, useMemo, useRef, useState } from 'react';
// import EditOfferDialog from './EditOfferDialog';
// import OfferShortDetails from './OfferShortDetails';
// import { ActionButton } from '@/components/shared/ActionBar/ActionDropDown';
// import { isDev } from '@/utils/utils';

// // Types & Constants
// interface OfferTableData {
//   _id: string;
//   leadId: string;
//   leadName: string;
//   createdOn: string;
//   email: string;
//   contact: string;
//   signedContract: string;
//   idDocs: string;
//   acceptedOffer: string;
//   sentStatus: string;
//   investmentVolume: number;
//   interestRate: number;
//   paymentTerms: string;
//   projectName: string;
//   agent: string;
//   status: string;
// }

// const STATUS_COLORS = {
//   accepted: 'bg-green-100 text-green-800',
//   rejected: 'bg-red-100 text-red-800',
//   pending: 'bg-yellow-100 text-yellow-800',
//   default: 'bg-gray-100 text-gray-800',
// } as const;

// // Memoized Components
// const StatusBadge = React.memo<{ status: string }>(({ status }) => (
//   <span
//     className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default}`}
//   >
//     {status.charAt(0).toUpperCase() + status.slice(1)}
//   </span>
// ));
// StatusBadge.displayName = 'StatusBadge';

// const ActionCell = React.memo<{ icon: string; onClick: () => void; children: React.ReactNode }>(
//   ({ icon, onClick, children }) => (
//     <div
//       onClick={(e) => {
//         e.stopPropagation();
//         e.preventDefault();
//       }}
//       data-no-navigate="true"
//     >
//       <Button
//         icon={<ApolloIcon name={icon as any} className="text-md" />}
//         className="gap-2"
//         size="xs"
//         onClick={onClick}
//       >
//         {children}
//       </Button>
//     </div>
//   )
// );
// ActionCell.displayName = 'ActionCell';

// const ExpanderCell = React.memo<{ isExpanded: boolean; onToggle: () => void }>(
//   ({ isExpanded, onToggle }) => (
//     <div
//       onClick={(e) => {
//         e.stopPropagation();
//         e.preventDefault();
//         onToggle();
//       }}
//       data-no-navigate="true"
//       className="flex h-full cursor-pointer items-center justify-center"
//     >
//       <ApolloIcon
//         name={isExpanded ? 'chevron-arrow-down' : 'chevron-arrow-right'}
//         className="text-2xl"
//       />
//     </div>
//   )
// );
// ExpanderCell.displayName = 'ExpanderCell';

// // Main Component
// export const OffersDashboard = React.memo(() => {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { onAppendQueryParams } = useAppendQueryParams();

//   // State
//   const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
//   const [editDialogOpen, setEditDialogOpen] = useState(false);
//   const [createOpeningOpen, setCreateOpeningOpen] = useState(false);
//   const [selectedOffer, setSelectedOffer] = useState<OfferApiResponse | null>(null);
//   const [isColumnOrderOpen, setIsColumnOrderOpen] = useState(false);
//   const customizeButtonRef = useRef<HTMLButtonElement>(null);

//   const { page, pageSize, setPage, setPageSize, search } = useSearchAndPaganation();
//   const limit = pageSize;
//   const status = searchParams.get('status') || undefined;

//   // API hooks
//   const { data: offersData, isLoading } = useOffers({
//     page,
//     limit,
//     status,
//     search: search || undefined,
//   });
//   const createOpeningMutation = useCreateOpeningWithoutFiles();
//   const updateOfferMutation = useUpdateOffer();

//   // Bulk actions hook
//   const {
//     selectedItems: selectedRow,
//     deleteConfirmOpen,
//     handleCheckboxChange,
//     handleSelectAll,
//     handleClearSelection,
//     setDeleteConfirmOpen,
//     handleDeleteConfirm,
//     isDeleting,
//   } = useBulkActions({
//     entityName: 'offers',
//     deleteUrl: '/offers/',
//     invalidateQueries: ['offers', 'leads'],
//   });

//   // Document handling hook
//   const documentHandler = useDocumentHandler();

//   const offers = useMemo(
//     () =>
//       offersData?.data?.map((offer) => ({
//         _id: offer?._id,
//         leadId: offer?.lead_id?._id,
//         leadName: offer?.lead_id?.contact_name,
//         createdOn: new Date(offer?.created_at).toLocaleString(),
//         email: offer?.lead_id?.email_from,
//         contact: offer?.lead_id?.email_from,
//         signedContract: 'Pending',
//         idDocs: 'Pending',
//         acceptedOffer:
//           offer?.status === 'accepted' ? 'Yes' : offer?.status === 'rejected' ? 'No' : 'Pending',
//         sentStatus: 'Sent',
//         investmentVolume: offer?.investment_volume,
//         interestRate: offer?.interest_rate,
//         paymentTerms: offer?.payment_terms?.name,
//         projectName: offer?.project_id?.name,
//         agent: offer?.agent_id?.login,
//         status: offer?.status,
//       })),
//     [offersData?.data]
//   );

//   // Handlers

//   const handleExpanderToggle = useCallback((id: string) => {
//     setExpandedRowId((prev) => (prev === id ? null : id));
//   }, []);

//   const handleEditOffer = useCallback((offer: OfferApiResponse) => {
//     setSelectedOffer(offer);
//     setEditDialogOpen(true);
//   }, []);

//   const handleCreateOpening = useCallback(async () => {
//     try {
//       await Promise.all(
//         selectedRow.map((id) => createOpeningMutation.mutateAsync({ offer_id: id }))
//       );
//       toast.push(
//         React.createElement(
//           Notification,
//           { title: 'Openings created', type: 'success' },
//           `Successfully created ${selectedRow.length} opening${selectedRow.length > 1 ? 's' : ''}`
//         )
//       );
//       setCreateOpeningOpen(false);
//       handleClearSelection();
//     } catch (error) {
//       isDev && console.log(error);
//       toast.push(
//         React.createElement(
//           Notification,
//           { title: 'Error', type: 'danger' },
//           'Failed to create some openings. Please try again.'
//         )
//       );
//     }
//   }, [selectedRow, createOpeningMutation, handleClearSelection]);

//   // Document action handler - for offers, we'll handle files directly
//   const handleDocumentAction = useCallback(
//     (offer: OfferApiResponse, documentType: string, action: 'preview' | 'download' | 'delete') => {
//       // Use the document handler hook for offer files
//       documentHandler.handleDocumentAction(offer, documentType, action);
//     },
//     [documentHandler]
//   );

//   // File upload handler
//   const handleFileUpload = useCallback(
//     async (offerId: string, files: File[] | null) => {
//       if (!files || files.length === 0) return;

//       try {
//         // Create FormData for file upload
//         const formData = new FormData();
//         files.forEach((file) => {
//           formData.append('files', file);
//         });
//         formData.append('documentType', 'contract');

//         // Update offer with files using the existing API
//         await updateOfferMutation.mutateAsync({
//           id: offerId,
//           data: formData as any, // The API expects FormData for file uploads
//         });
//       } catch (error) {
//         isDev && console.error('Error uploading files:', error);
//       }
//     },
//     [updateOfferMutation]
//   );
//   // Columns definition
//   const columns: ColumnDef<OfferTableData>[] = useMemo(
//     () => [
//       {
//         id: 'expander',
//         maxSize: 40,
//         enableResizing: false,
//         header: () => null,
//         cell: ({ row }) => (
//           <ExpanderCell
//             isExpanded={expandedRowId === row.original._id}
//             onToggle={() => handleExpanderToggle(row.original._id)}
//           />
//         ),
//       },
//       {
//         id: 'checkbox',
//         maxSize: 30,
//         enableResizing: false,
//         header: () => {
//           const visibleIds = offers?.map((offer) => offer._id) || [];
//           const allSelected =
//             visibleIds.length > 0 && visibleIds.every((id) => selectedRow.includes(id));
//           return (
//             <div className="flex items-center justify-center">
//               <Checkbox checked={allSelected} onChange={() => handleSelectAll(visibleIds)} />
//             </div>
//           );
//         },
//         cell: ({ row }) => (
//           <div
//             className="flex items-center justify-center"
//             onClick={(e) => {
//               e.stopPropagation();
//               e.preventDefault();
//             }}
//           >
//             <Checkbox
//               checked={selectedRow.includes(row.original._id)}
//               onChange={() => handleCheckboxChange(row.original._id)}
//             />
//           </div>
//         ),
//       },
//       {
//         id: 'leadName',
//         header: () => <span className="whitespace-nowrap">Lead</span>,
//         cell: ({ row }) => <span className="whitespace-nowrap">{row.original.leadName}</span>,
//       },
//       {
//         id: 'projectName',
//         header: () => <span className="whitespace-nowrap">Project</span>,
//         cell: ({ row }) => <span className="whitespace-nowrap">{row.original.projectName}</span>,
//       },
//       {
//         id: 'status',
//         header: () => <span className="whitespace-nowrap">Status</span>,
//         cell: ({ row }) => <StatusBadge status={row.original.status} />,
//       },
//       {
//         id: 'investmentVolume',
//         header: () => <span className="whitespace-nowrap">Investment Volume</span>,
//         cell: ({ row }) => (
//           <span className="whitespace-nowrap">{row.original.investmentVolume.toFixed(2)}</span>
//         ),
//       },
//       {
//         id: 'interestRate',
//         header: () => <span className="whitespace-nowrap">Interest Rate</span>,
//         cell: ({ row }) => <span className="whitespace-nowrap">{row.original.interestRate}%</span>,
//       },
//       {
//         id: 'paymentTerms',
//         header: () => <span className="whitespace-nowrap">Payment Terms</span>,
//         cell: ({ row }) => <span className="whitespace-nowrap">{row.original.paymentTerms}</span>,
//       },
//       {
//         id: 'agent',
//         header: () => <span className="whitespace-nowrap">Agent</span>,
//         cell: ({ row }) => <span className="whitespace-nowrap">{row.original.agent}</span>,
//       },
//       {
//         id: 'editOffer',
//         header: () => <span className="whitespace-nowrap">Edit</span>,
//         cell: ({ row }) => {
//           const apiOffer = offersData?.data?.find((offer) => offer._id === row.original._id);
//           return apiOffer ? (
//             <ActionCell icon="pen" onClick={() => handleEditOffer(apiOffer)}>
//               Edit
//             </ActionCell>
//           ) : null;
//         },
//       },
//       {
//         id: 'createdOn',
//         header: () => <span className="whitespace-nowrap">Created on</span>,
//         cell: ({ row }) => <span className="whitespace-nowrap">{row.original.createdOn}</span>,
//       },
//       {
//         id: 'sentStatus',
//         header: () => <span className="whitespace-nowrap">Sent Status</span>,
//         cell: ({ row }) => <span className="whitespace-nowrap">{row.original.sentStatus}</span>,
//       },
//       {
//         id: 'docs',
//         header: () => <span className="whitespace-nowrap">Docs</span>,
//         cell: ({ row }) => (
//           <FileHandler
//             ObjectData={offersData}
//             id={row.original._id}
//             type="contract"
//             handleDocumentAction={handleDocumentAction}
//             handleFileUpload={handleFileUpload}
//           />
//         ),
//       },
//     ],
//     [
//       expandedRowId,
//       handleExpanderToggle,
//       offers,
//       selectedRow,
//       handleSelectAll,
//       handleCheckboxChange,
//       handleEditOffer,
//       offersData,
//       handleDocumentAction,
//       handleFileUpload,
//     ]
//   );

//   // Use the common column customization hook
//   const { columnVisibility, renderableColumns, handleColumnVisibilityChange } =
//     useColumnCustomization({
//       tableName: 'offers',
//       columns,
//     });

//   return (
//     <Card>
//       <div className="mb-4">
//         <h1>Offers</h1>
//         <p>Total Offers: {offersData?.meta?.total || 0}</p>
//       </div>

//       <div>
//         <CommonActionBar
//           selectedItems={selectedRow}
//           handleClearSelection={handleClearSelection}
//           onAppendQueryParams={onAppendQueryParams}
//           search={search || ''}
//           allColumns={columns}
//           columnVisibility={columnVisibility}
//           handleColumnVisibilityChange={handleColumnVisibilityChange}
//           setDeleteConfirmDialogOpen={setDeleteConfirmOpen}
//           setIsColumnOrderDialogOpen={setIsColumnOrderOpen}
//           customizeButtonRef={customizeButtonRef}
//           isColumnOrderDialogOpen={isColumnOrderOpen}
//           tableName="offers"
//         >
//           {selectedRow.length > 0 && (
//             <ActionButton
//               icon="send-inclined"
//               onClick={() => setCreateOpeningOpen(true)}
//               disabled={!selectedRow.length}
//             >
//               Create Opening
//             </ActionButton>
//           )}
//         </CommonActionBar>
//         <div className="min-w-max">
//           <style jsx global>{`
//             .offers-table tbody tr {
//               cursor: pointer;
//               position: relative;
//             }
//             .offers-table tbody tr:hover {
//               background-color: rgba(0, 0, 0, 0.04);
//             }
//             .offers-table tbody tr td:first-child {
//               position: relative;
//               z-index: 10;
//             }
//             .offers-table tbody tr td:first-child * {
//               position: relative;
//               z-index: 10;
//             }
//             .offers-table tbody tr[data-expanded='true'] {
//               cursor: default;
//             }
//             .offers-table tbody tr[data-expanded='true']:hover {
//               background-color: transparent;
//             }
//             .offers-table tbody tr.expanded-row:hover {
//               background-color: transparent !important;
//             }
//             .offers-table tbody tr.expanded-row td {
//               background-color: transparent !important;
//             }
//             .offers-table tbody tr.expanded-row:hover td {
//               background-color: transparent !important;
//             }
//           `}</style>
//           <ScrollBar>
//             <div className="offers-table">
//               <DataTable
//                 data={offers || []}
//                 columns={renderableColumns}
//                 loading={isLoading}
//                 pagingData={{
//                   pageIndex: page,
//                   pageSize: pageSize,
//                   total: offersData?.meta?.total || 0,
//                 }}
//                 pageSizes={getPaginationOptions(offersData?.meta?.total || 0)}
//                 onPaginationChange={setPage}
//                 onSelectChange={setPageSize}
//                 noData={!offers?.length || !offersData?.data?.length}
//                 renderExpandedRow={(row) => (
//                   <OfferShortDetails expandedRowId={expandedRowId || ''} row={row} />
//                 )}
//                 onRowClick={(row) => router.push(`/dashboards/leads/${row.original.leadId}`)}
//               />
//             </div>
//           </ScrollBar>
//         </div>
//       </div>

//       <ConfirmDialog
//         type="warning"
//         isOpen={deleteConfirmOpen}
//         title="Delete Offers"
//         onCancel={() => setDeleteConfirmOpen(false)}
//         onConfirm={handleDeleteConfirm}
//         confirmButtonProps={{ disabled: isDeleting }}
//       >
//         <p>Are you sure you want to delete {selectedRow.length} offer(s)?</p>
//         <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
//       </ConfirmDialog>

//       {selectedOffer && (
//         <EditOfferDialog
//           isOpen={editDialogOpen}
//           onClose={() => {
//             setEditDialogOpen(false);
//             setSelectedOffer(null);
//           }}
//           offer={selectedOffer}
//         />
//       )}

//       <ConfirmDialog
//         type="success"
//         isOpen={createOpeningOpen}
//         title="Confirm Creation"
//         onCancel={() => setCreateOpeningOpen(false)}
//         onConfirm={handleCreateOpening}
//         confirmButtonProps={{ disabled: createOpeningMutation.isPending }}
//       >
//         <p>Are you sure you want to create openings?</p>
//       </ConfirmDialog>

//       {/* Document Preview Dialog */}
//       <DocumentPreviewDialog {...documentHandler.dialogProps} title="Offer Document" />

//       {/* Document Delete Confirmation Dialog */}
//       <ConfirmDialog
//         type="warning"
//         isOpen={documentHandler.deleteConfirmOpen}
//         title="Delete Document"
//         onCancel={() => documentHandler.setDeleteConfirmOpen(false)}
//         onConfirm={documentHandler.handleDeleteConfirm}
//         confirmButtonProps={{ disabled: documentHandler.deleteAttachmentMutation.isPending }}
//       >
//         <p>
//           Are you sure you want to delete the document &ldquo;
//           {documentHandler.documentToDelete?.filename}&rdquo;?
//         </p>
//         <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
//       </ConfirmDialog>
//     </Card>
//   );
// });

// OffersDashboard.displayName = 'OffersDashboard';
