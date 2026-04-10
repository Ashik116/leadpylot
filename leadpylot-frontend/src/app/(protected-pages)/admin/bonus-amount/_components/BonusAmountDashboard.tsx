// 'use client';
// import ConfirmDialog from '@/components/shared/ConfirmDialog';
// import Button from '@/components/ui/Button';
// import Card from '@/components/ui/Card';
// import Table from '@/components/ui/Table';
// import { useBonusAmounts, useDeleteBonusAmount } from '@/services/hooks/settings/useBonus';
// import { useState } from 'react';
// import ApolloIcon from '@/components/ui/ApolloIcon';
// import BonusAmountFormWrapper from './BonusAmountFormWrapper';
// import useNotification from '@/utils/hooks/useNotification';
// import { TableShimmer } from '@/components/shared/loaders';
// import { useDrawerStore } from '@/stores/drawerStore';

// const { Tr, Th, Td, THead, TBody } = Table;

// const BonusAmountDashboard = () => {
//   const { isOpen, sidebarType, selectedId, sidebarKey, resetDrawer, onOpenSidebar, onHandleSidebar } = useDrawerStore();
//   const { data: bonusAmountsData = [], isLoading } = useBonusAmounts();
//   const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
//   const [selected, setSelected] = useState<{ name: string; id: string } | null>(null);
//   const deleteBonusAmount = useDeleteBonusAmount();
//   const { openNotification } = useNotification();

//   // Sidebar state management
//   // const [sidebarVisible, setSidebarVisible] = useState(false);
//   // const [sidebarType, setSidebarType] = useState<'create' | 'edit' | null>(null);
//   // const [selectedBonusId, setSelectedBonusId] = useState<string | null>(null);
//   // const [selectedBonusData, setSelectedBonusData] = useState<any>(null);
//   // const [sidebarKey, setSidebarKey] = useState(0);

//   // const handleAddBonus = () => {
//   //   setSelectedBonusId(null);
//   //   setSelectedBonusData(null);
//   //   setSidebarType('create');
//   //   setSidebarVisible(true);
//   //   setSidebarKey((prev) => prev + 1);
//   // };

//   // const handleEditBonus = (bonusId: string) => {
//   //   // Find the bonus amount data from the existing list
//   //   const bonusData = bonusAmountsData.find((bonus) => bonus._id === bonusId);
//   //   setSelectedBonusId(bonusId);
//   //   setSelectedBonusData(bonusData);
//   //   setSidebarType('edit');
//   //   setSidebarVisible(true);
//   //   setSidebarKey((prev) => prev + 1);
//   // };

//   // const handleSidebarSuccess = () => {
//   //   setSidebarVisible(false);
//   //   setSidebarType(null);
//   //   setSelectedBonusId(null);
//   //   setSelectedBonusData(null);
//   //   // Cache is now automatically managed by the mutations with optimistic updates
//   // };

//   // const handleCloseSidebar = () => {
//   //   setSidebarVisible(false);
//   //   setSidebarType(null);
//   //   setSelectedBonusId(null);
//   //   setSelectedBonusData(null);
//   // };

//   if (isLoading) {
//     return (
//       <div className="flex flex-col gap-4">
//         <div className="flex flex-col gap-4 overflow-hidden lg:flex-row">
//           <div className="w-full">
//             <TableShimmer
//               rows={6}
//               headers={['Bonus Amount', 'Amount', 'Code', 'Actions']}
//               showCard={true}
//             />
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-4 px-2 xl:px-0">
//       <div className="">
//         <Card className="mb-2">
//           <div className="flex items-center justify-between">
//             <div className="mb-4">
//               <h1>Bonus Amounts</h1>
//             </div>
//             <div className="mb-4 flex sm:flex-row flex-col items-center gap-2">
//               <Button
//                 variant="solid"
//                 icon={<ApolloIcon name="plus" className="text-md" />}
//                 onClick={() => onHandleSidebar()}
//               >
//                 Add  <span className="hidden md:inline">Bonus Amount</span>
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
//                         <Th>Bonus Amount</Th>
//                         <Th>Amount</Th>
//                         <Th>Code</Th>
//                         <Th>Actions</Th>
//                       </Tr>
//                     </THead>
//                     <TBody>
//                       {bonusAmountsData.map((bonus) => (
//                         <Tr
//                           key={bonus._id}
//                           className="cursor-pointer hover:bg-gray-50"
//                           onClick={() => onHandleSidebar(bonus._id)}
//                         >
//                           <Td>{bonus.name}</Td>
//                           <Td>{bonus?.info?.amount}</Td>
//                           <Td>{bonus?.info?.code}</Td>
//                           <Td>
//                             <div className="flex items-center gap-2">
//                               <Button
//                                 variant="plain"
//                                 size="xs"
//                                 className="text-gray-500 hover:text-blue-700"
//                                 icon={<ApolloIcon name="pen" className="text-md" />}
//                                 onClick={(e) => {
//                                   e.stopPropagation();
//                                   onHandleSidebar(bonus._id);
//                                 }}
//                               />
//                               <Button
//                                 variant="plain"
//                                 size="xs"
//                                 className="text-gray-500 hover:text-red-700"
//                                 icon={<ApolloIcon name="trash" className="text-md" />}
//                                 disabled={bonus._id.startsWith('temp-')}
//                                 onClick={(e) => {
//                                   e.stopPropagation();
//                                   // Prevent deletion of items with temporary IDs
//                                   if (bonus._id.startsWith('temp-')) {
//                                     openNotification({
//                                       type: 'warning',
//                                       massage: 'Please wait for the item to be saved before deleting',
//                                     });
//                                     return;
//                                   }
//                                   setSelected({ name: bonus.name, id: bonus._id });
//                                   setDeleteConfirmDialogOpen(true);
//                                 }}
//                               />
//                             </div>
//                           </Td>
//                         </Tr>
//                       ))}
//                     </TBody>
//                   </Table>
//                 </div>
//               </div>
//             </Card>
//           </div>

//           {/* Sidebar */}
//           <div
//             className={`mt-4 xl:mt-0 w-full transform space-y-4 transition-all duration-300 ease-in-out lg:w-1/2 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
//               }`}
//             style={{ display: isOpen ? 'block' : 'none' }}
//           >
//             <Card className="w-full">
//               <div className="flex h-full flex-col">
//                 <div className="mb-4 flex items-center justify-between">
//                   <h2>{sidebarType === 'create' ? 'Add New Bonus Amount' : 'Edit Bonus Amount'}</h2>
//                   <Button
//                     variant="plain"
//                     size="xs"
//                     icon={<ApolloIcon name="times" className="text-md" />}
//                     onClick={resetDrawer}
//                   />
//                 </div>

//                 {sidebarType && (
//                   <div className="w-full">
//                     <BonusAmountFormWrapper
//                       key={`bonus-amount-${sidebarType}-${selectedId}-${sidebarKey}`}
//                       type={sidebarType}
//                       id={selectedId || undefined}
//                       // existingData={selectedBonusData}
//                       isPage={false}
//                       onSuccess={onOpenSidebar}
//                     />
//                   </div>
//                 )}
//               </div>
//             </Card>
//           </div>
//         </div>

//         <ConfirmDialog
//           type="warning"
//           isOpen={deleteConfirmDialogOpen}
//           title="Warning"
//           onCancel={() => {
//             setDeleteConfirmDialogOpen(false);
//             setSelected(null);
//           }}
//           onConfirm={() => {
//             if (selected) {
//               // Additional check to prevent deletion of temporary items
//               if (selected.id.startsWith('temp-')) {
//                 openNotification({
//                   type: 'warning',
//                   massage: 'Cannot delete temporary item. Please wait for it to be saved.',
//                 });
//                 setDeleteConfirmDialogOpen(false);
//                 setSelected(null);
//                 return;
//               }
//               deleteBonusAmount.mutate(selected.id, {
//                 onSuccess: () => {
//                   setDeleteConfirmDialogOpen(false);
//                   setSelected(null);
//                 },
//               });
//             }
//           }}
//           confirmButtonProps={{
//             loading: deleteBonusAmount.isPending,
//             disabled: deleteBonusAmount.isPending,
//           }}
//         >
//           <p>Are you sure you want to delete {selected?.name}?</p>
//         </ConfirmDialog>
//       </div>
//     </div>
//   );
// };

// export default BonusAmountDashboard;
