// 'use client';

// import ConfirmDialog from '@/components/shared/ConfirmDialog';
// import { TableShimmer } from '@/components/shared/loaders';
// import ApolloIcon from '@/components/ui/ApolloIcon';
// import Button from '@/components/ui/Button';
// import Card from '@/components/ui/Card';
// import Table from '@/components/ui/Table';
// import { useVoipServers } from '@/services/hooks/useSettings';
// import { apiDeleteVoipServer } from '@/services/SettingsService';
// import useNotification from '@/utils/hooks/useNotification';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { useState } from 'react';
// import VoipFromWrapperComponent from './_components/VoipFromWrapperComponent';
// import { useDrawerStore } from '@/stores/drawerStore';

// const { Tr, Th, Td, THead, TBody } = Table;

// const VoipServersWrapper = () => {
//   const { isOpen, sidebarType, selectedId, sidebarKey, resetDrawer, onOpenSidebar, onHandleSidebar } = useDrawerStore();

//   const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
//   const [selected, setSelected] = useState<{ name: string; id: string } | null>(null);
//   const queryClient = useQueryClient();
//   const { openNotification } = useNotification();

//   const { data: servers, isLoading } = useVoipServers();

//   const deleteMutation = useMutation({
//     mutationFn: (id: string) => apiDeleteVoipServer(id),
//     onMutate: async (deletedId) => {
//       // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
//       await queryClient.cancelQueries({ queryKey: ['voip-servers'] });

//       // Snapshot the previous value
//       const previousServers = queryClient.getQueryData(['voip-servers']);

//       // Optimistically update to the new value
//       queryClient.setQueryData(['voip-servers'], (oldData: any) => {
//         if (!oldData) return oldData;
//         return oldData.filter((server: any) => server._id !== deletedId);
//       });

//       // Return a context object with the snapshotted value
//       return { previousServers };
//     },
//     onSuccess: () => {
//       openNotification({ type: 'success', massage: 'Voip Server deleted successfully' });
//       setDeleteConfirmDialogOpen(false);
//       setSelected(null);
//       // Ensure cache is consistent
//       queryClient.invalidateQueries({ queryKey: ['voip-servers'] });
//     },
//     onError: (err, deletedId, context) => {
//       // If the mutation fails, use the context returned from onMutate to roll back
//       if (context?.previousServers) {
//         queryClient.setQueryData(['voip-servers'], context.previousServers);
//       }
//       openNotification({ type: 'danger', massage: 'Failed to delete Voip Server' });
//     },
//     onSettled: () => {
//       // Always refetch after error or success to ensure consistency
//       queryClient.invalidateQueries({ queryKey: ['voip-servers'] });
//     },
//   });

//   if (isLoading) {
//     return (
//       <div className="flex flex-col gap-4">
//         <div className="flex flex-col gap-4 overflow-hidden lg:flex-row">
//           <div className="w-full">
//             <TableShimmer
//               rows={6}
//               headers={['Name', 'Domain', 'Address', 'Actions']}
//               showCard={true}
//             />
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-4">
//       <div className="">
//         <Card className="mb-2">
//           <div className="flex items-center justify-between">
//             <div className="mb-4">
//               <h1>VOIP Servers</h1>
//             </div>
//             <div className="mb-4 flex flex-col items-center gap-2 sm:flex-row">
//               <Button
//                 variant="solid"
//                 icon={<ApolloIcon name="plus" className="text-md" />}
//                 onClick={() => onHandleSidebar(undefined)}
//               >
//                 Add <span className="hidden md:inline">Server</span>
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
//                   {isOpen ? 'Hide' : 'Show'}{' '}
//                   <span className="hidden md:inline">Details</span>
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
//                         <Th>Name</Th>
//                         <Th>Domain</Th>
//                         <Th>Address</Th>
//                         <Th>Action</Th>
//                       </Tr>
//                     </THead>
//                     <TBody>
//                       {servers?.map((server) => (
//                         <Tr
//                           key={server?._id}
//                           className="hover:bg-sand-5 cursor-pointer" // Old: "cursor-pointer hover:bg-gray-50"
//                           onClick={() => onHandleSidebar(server?._id)}
//                         >
//                           <Td>{server.name}</Td>
//                           <Td>{server?.info?.domain}</Td>
//                           <Td>{server?.info?.websocket_address}</Td>

//                           <Td>
//                             <Button
//                               variant="plain"
//                               size="xs"
//                               className="text-sand-2 hover:text-ocean-2" // Old: "text-gray-500 hover:text-blue-700"
//                               icon={<ApolloIcon name="pen" className="text-md" />}
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 onHandleSidebar(server?._id);
//                               }}
//                             ></Button>

//                             <Button
//                               variant="plain"
//                               size="xs"
//                               className="text-sand-2 hover:text-rust" // Old: "text-gray-500 hover:text-red-700"
//                               icon={<ApolloIcon name="trash" className="text-md" />}
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 setSelected({ name: server.name, id: server._id });
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
//                 title={`Warning`}
//                 onCancel={() => {
//                   setDeleteConfirmDialogOpen(false);
//                   setSelected(null);
//                 }}
//                 onConfirm={async () => {
//                   if (selected) {
//                     deleteMutation.mutate(selected?.id);
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
//             className={`w-full transform space-y-4 transition-all duration-300 ease-in-out lg:w-1/2 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
//               }`}
//             style={{ display: isOpen ? 'block' : 'none' }}
//           >
//             <Card className="w-full">
//               <div className="flex h-full flex-col">
//                 <div className="mb-4 flex items-center justify-between">
//                   <h2>{sidebarType === 'create' ? 'Add New VOIP Server' : 'Edit VOIP Server'}</h2>
//                   <Button
//                     variant="plain"
//                     size="xs"
//                     icon={<ApolloIcon name="times" className="text-md" />}
//                     onClick={resetDrawer}
//                   />
//                 </div>

//                 {sidebarType && (
//                   <div className="w-full">
//                     <VoipFromWrapperComponent
//                       key={`voip-server-${sidebarType}-${selectedId}-${sidebarKey}`}
//                       type={sidebarType}
//                       id={selectedId || undefined}
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

// export default VoipServersWrapper;
