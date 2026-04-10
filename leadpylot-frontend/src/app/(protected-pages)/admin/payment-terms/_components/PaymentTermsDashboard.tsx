// 'use client';

// import ConfirmDialog from '@/components/shared/ConfirmDialog';
// import Button from '@/components/ui/Button';
// import Card from '@/components/ui/Card';
// import Table from '@/components/ui/Table';
// import { usePaymentTerms } from '@/services/hooks/settings/usePaymentsTerm';
// import { useState } from 'react';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import useNotification from '@/utils/hooks/useNotification';
// import ApolloIcon from '@/components/ui/ApolloIcon';
// import PaymentTermFormWrapper from './PaymentTermFormWrapper';
// import { apiDeletePaymentTerm } from '@/services/settings/PaymentsTerm';
// import { TableShimmer } from '@/components/shared/loaders';
// import { useDrawerStore } from '@/stores/drawerStore';

// const { Tr, Th, Td, THead, TBody } = Table;

// const PaymentTermsDashboard = () => {
//   const { isOpen, sidebarType, selectedId, sidebarKey, resetDrawer, onOpenSidebar, onHandleSidebar } = useDrawerStore();

//   const { data: paymentTermsData = [], isLoading } = usePaymentTerms();
//   const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
//   const [selected, setSelected] = useState<{ name: string; id: string } | null>(null);
//   const queryClient = useQueryClient();
//   const { openNotification } = useNotification();

//   const deleteMutation = useMutation({
//     mutationFn: (id: string) => apiDeletePaymentTerm(id),
//     onMutate: async (deletedId) => {
//       // Cancel any outgoing refetches
//       await queryClient.cancelQueries({ queryKey: ['payment-terms'] });

//       // Get the exact query key used by the dashboard
//       const queryKey = ['payment-terms', undefined];

//       // Snapshot the previous value
//       const previousTerms = queryClient.getQueryData(queryKey);

//       // Optimistically remove the term from cache
//       queryClient.setQueryData(queryKey, (old: any) => {
//         if (!old) return old;
//         return old.filter((term: any) => term._id !== deletedId);
//       });

//       return { previousTerms, queryKey };
//     },
//     onSuccess: () => {
//       // Show success toast
//       openNotification({ type: 'success', massage: 'Payment Term deleted successfully' });
//       setDeleteConfirmDialogOpen(false);
//       setSelected(null);
//     },
//     onError: (err, deletedId, context) => {
//       // Rollback on error
//       if (context?.queryKey) {
//         queryClient.setQueryData(context.queryKey, context.previousTerms);
//       }
//       openNotification({ type: 'danger', massage: 'Failed to delete Payment Term' });
//     },
//     // Removed onSettled invalidation for faster UI updates
//     // The optimistic updates handle immediate UI feedback
//   });

//   if (isLoading) {
//     return (
//       <div className="flex flex-col gap-4">
//         <div className="flex flex-col gap-4 overflow-hidden lg:flex-row">
//           <div className="w-full">
//             <TableShimmer
//               rows={6}
//               headers={['Type', 'Name', 'Months', 'Description', 'Actions']}
//               showCard={true}
//             />
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-4 px-2 xl:px-0">
//       <div>
//         <Card className="mb-2">
//           <div className="flex items-center justify-between">
//             <div className="mb-4">
//               <h1>Payment Terms</h1>
//             </div>
//             <div className="mb-4 flex sm:flex-row flex-col items-center gap-2">
//               <Button
//                 variant="solid"
//                 icon={<ApolloIcon name="plus" className="text-md" />}
//                 onClick={() => onHandleSidebar()}
//               >
//                 Add  <span className="hidden md:inline">Payment Term</span>
//               </Button>
//               {isOpen && (
//                 <Button
//                   variant="secondary"
//                   size="sm"
//                   onClick={onOpenSidebar}
//                   icon={
//                     <ApolloIcon
//                       name={isOpen ? 'arrow-right' : 'arrow-left'}
//                       className="text-md"
//                     />
//                   }
//                 >
//                   {isOpen ? 'Hide' : 'Show'} <span className="hidden md:inline">Details</span>
//                 </Button>
//               )}
//             </div>
//           </div>
//         </Card>
//         <div className="flex flex-col-reverse gap-4 overflow-hidden lg:flex-row">
//           {/* Main content */}
//           <div
//             className={`w-full transition-all duration-300 ease-in-out ${isOpen ? 'lg:w-1/2' : 'w-full'}`}
//           >
//             <Card>

//               <div className="max-h-[80vh] overflow-auto">
//                 <div className="min-w-max">
//                   <Table>
//                     <THead>
//                       <Tr>
//                         <Th>Type</Th>
//                         <Th>Name</Th>
//                         <Th>Months</Th>
//                         <Th>Description</Th>
//                         <Th>Actions</Th>
//                       </Tr>
//                     </THead>
//                     <TBody>
//                       {paymentTermsData.map((term) => (
//                         <Tr
//                           key={term._id}
//                           className="cursor-pointer hover:bg-blue-50"
//                           // className="cursor-pointer hover:bg-gray-50"
//                           onClick={() => onHandleSidebar(term._id)}
//                         >
//                           <Td>{term.info?.type}</Td>
//                           <Td>{term.name}</Td>
//                           <Td>{term.info?.info?.months}</Td>
//                           <Td>
//                             <div className="max-w-xs truncate" title={term.info?.info?.description}>
//                               {term.info?.info?.description || 'N/A'}
//                             </div>
//                           </Td>
//                           <Td>
//                             <Button
//                               variant="plain"
//                               size="xs"
//                               className="text-slate-600 hover:text-green-600"
//                               // className="text-gray-500 hover:text-blue-700"
//                               icon={<ApolloIcon name="pen" className="text-md" />}
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 onHandleSidebar(term._id);
//                               }}
//                             ></Button>
//                             <Button
//                               variant="plain"
//                               size="xs"
//                               className="text-slate-600 hover:text-orange-600"
//                               // className="text-gray-500 hover:text-red-700"
//                               icon={<ApolloIcon name="trash" className="text-md" />}
//                               disabled={term._id.startsWith('temp-')}
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 // Prevent deletion of items with temporary IDs
//                                 if (term._id.startsWith('temp-')) {
//                                   openNotification({
//                                     type: 'warning',
//                                     massage: 'Please wait for the item to be saved before deleting',
//                                   });
//                                   return;
//                                 }
//                                 setSelected({ name: term.name, id: term._id });
//                                 setDeleteConfirmDialogOpen(true);
//                               }}
//                             ></Button>
//                           </Td>
//                         </Tr>
//                       ))}
//                     </TBody>
//                   </Table>
//                 </div>
//               </div>

//               <ConfirmDialog
//                 type="warning"
//                 isOpen={deleteConfirmDialogOpen}
//                 title="Warning"
//                 onCancel={() => {
//                   setDeleteConfirmDialogOpen(false);
//                   setSelected(null);
//                 }}
//                 onConfirm={async () => {
//                   if (selected) {
//                     // Additional safeguard: prevent deletion of temporary IDs
//                     if (selected.id.startsWith('temp-')) {
//                       openNotification({
//                         type: 'warning',
//                         massage: 'Cannot delete temporary item. Please wait for it to be saved.',
//                       });
//                       setDeleteConfirmDialogOpen(false);
//                       setSelected(null);
//                       return;
//                     }
//                     deleteMutation.mutate(selected.id);
//                   }
//                 }}
//                 confirmButtonProps={{ disabled: deleteMutation.isPending }}
//               >
//                 <p>Are you sure you want to delete {selected?.name}?</p>
//               </ConfirmDialog>
//             </Card>
//           </div>

//           {/* Right sidebar for create/edit */}
//           <div
//             className={`mt-4 xl:mt-0 w-full transform space-y-4 transition-all duration-300 ease-in-out lg:w-1/2 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
//               }`}
//             style={{ display: isOpen ? 'block' : 'none' }}
//           >
//             <Card className="w-full">
//               <div className="flex h-full flex-col">
//                 <div className="mb-4 flex items-center justify-between">
//                   <h2>{sidebarType === 'create' ? 'Add New Payment Term' : 'Edit Payment Term'}</h2>
//                   <Button
//                     variant="plain"
//                     size="xs"
//                     icon={<ApolloIcon name="times" className="text-md" />}
//                     onClick={resetDrawer}
//                   />
//                 </div>

//                 {sidebarType && (
//                   <div className="w-full">
//                     <PaymentTermFormWrapper
//                       key={`payment-term-${sidebarType}-${selectedId}-${sidebarKey}`}
//                       type={sidebarType}
//                       id={selectedId || undefined}
//                       // existingData={selectedTermData}
//                       isPage={false}
//                       onSuccess={onOpenSidebar}
//                     />
//                   </div>
//                 )}
//               </div>
//             </Card>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PaymentTermsDashboard;
