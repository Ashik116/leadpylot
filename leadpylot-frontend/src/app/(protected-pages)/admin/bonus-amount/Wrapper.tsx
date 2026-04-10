// 'use client';

// import ConfirmDialog from '@/components/shared/ConfirmDialog';
// import Loading from '@/components/shared/Loading';
// import Button from '@/components/ui/Button';
// import Card from '@/components/ui/Card';
// import ScrollBar from '@/components/ui/ScrollBar';
// import Table from '@/components/ui/Table';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { useState } from 'react';
// import { useBonusAmounts, useDeleteBonusAmount } from '@/services/hooks/settings/useBonus';
// import ApolloIcon from '@/components/ui/ApolloIcon';

// const { Tr, Th, Td, THead, TBody } = Table;

// const BonusAmountWrapper = () => {
//   const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
//   const [selected, setSelected] = useState<{ bonus_amount: string; id: string } | null>(null);
//   const router = useRouter();

//   const { data: bonusAmountsData, isLoading } = useBonusAmounts();
//   const deleteBonusAmount = useDeleteBonusAmount();

//   const bonuses = bonusAmountsData || [];

//   if (isLoading) {
//     return <Loading className="absolute inset-0" loading={true} />;
//   }

//   return (
//     <div className="flex flex-col gap-4">
//       <Card>
//         <div className="flex items-center justify-between">
//           <div className="mb-4">
//             <h1>Bonus Amounts</h1>
//           </div>
//           <Link href="/admin/bonus-amount/create" className="mb-4">
//             <Button variant="solid" icon={<ApolloIcon name="plus" className="text-md" />}>
//               Add Bonus
//             </Button>
//           </Link>
//         </div>
//         <ScrollBar>
//           <div className="min-w-max">
//             <Table>
//               <THead>
//                 <Tr>
//                   <Th>Bonus Amount</Th>
//                   <Th>Amount</Th>
//                   <Th>Code</Th>
//                   <Th> </Th>
//                 </Tr>
//               </THead>
//               <TBody>
//                 {bonuses.map((bonus) => (
//                   <Tr key={bonus._id}>
//                     <Td>{bonus.name}</Td>
//                     <Td>{bonus?.info?.amount}</Td>
//                     <Td>{bonus?.info?.code}</Td>
//                     <Td>
//                       <Button
//                         variant="plain"
//                         size="xs"
//                         className="text-gray-500 hover:text-blue-700"
//                         icon={<ApolloIcon name="pen" className="text-md" />}
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           router.push(`/admin/bonus-amount/${bonus._id}`);
//                         }}
//                       ></Button>

//                       <Button
//                         variant="plain"
//                         size="xs"
//                         className="text-gray-500 hover:text-red-700"
//                         icon={<ApolloIcon name="trash" className="text-md" />}
//                         onClick={() => {
//                           setSelected({ bonus_amount: bonus.name, id: bonus._id });
//                           setDeleteConfirmDialogOpen(true);
//                         }}
//                       ></Button>
//                     </Td>
//                   </Tr>
//                 ))}
//               </TBody>
//             </Table>
//           </div>
//         </ScrollBar>

//         <ConfirmDialog
//           type="warning"
//           isOpen={deleteConfirmDialogOpen}
//           title={`Warning`}
//           onCancel={() => {
//             setDeleteConfirmDialogOpen(false);
//             setSelected(null);
//           }}
//           onConfirm={async () => {
//             if (selected) {
//               // Use the API service instead of mock delete
//               deleteBonusAmount.mutate(selected.id, {
//                 onSuccess: () => {
//                   setDeleteConfirmDialogOpen(false);
//                   setSelected(null);
//                 },
//               });
//             }
//           }}
//         >
//           <p>Are you sure you want to delete {selected?.bonus_amount}?</p>
//         </ConfirmDialog>
//       </Card>
//     </div>
//   );
// };

// export default BonusAmountWrapper;
