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
// import { usePaymentTerms, useDeletePaymentTerm } from '@/services/hooks/settings/usePaymentsTerm';
// import ApolloIcon from '@/components/ui/ApolloIcon';

// const { Tr, Th, Td, THead, TBody } = Table;

// const PaymentTermsWrapper = () => {
//   const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
//   const [selected, setSelected] = useState<{ name: string; id: string } | null>(null);
//   const router = useRouter();

//   const { data: paymentTermsData, isLoading } = usePaymentTerms();
//   const deletePaymentTerm = useDeletePaymentTerm();

//   const terms = paymentTermsData || [];

//   if (isLoading) {
//     return <Loading className="absolute inset-0" loading={true} />;
//   }

//   return (
//     <div className="flex flex-col gap-4">
//       <Card>
//         <div className="flex items-center justify-between">
//           <div className="mb-4">
//             <h1>Payment Terms</h1>
//           </div>
//           <Link href="/admin/payment-terms/create" className="mb-4">
//             <Button variant="solid" icon={<ApolloIcon name="plus" className="text-md" />}>
//               Add Payment Term
//             </Button>
//           </Link>
//         </div>
//         <ScrollBar>
//           <div className="min-w-max">
//             <Table>
//               <THead>
//                 <Tr>
//                   <Th>Type</Th>
//                   <Th>Name</Th>
//                   <Th>Months</Th>
//                   <Th> </Th>
//                 </Tr>
//               </THead>
//               <TBody>
//                 {terms.map((term) => (
//                   <Tr key={term._id} className="cursor-pointer">
//                     <Td>{term.info?.type}</Td>
//                     <Td>{term.name}</Td>
//                     <Td>{term.info?.info?.months}</Td>
//                     <Td>
//                       <Button
//                         variant="plain"
//                         size="xs"
//                         className="text-gray-500 hover:text-blue-700"
//                         icon={<ApolloIcon name="pen" className="text-md" />}
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           router.push(`/admin/payment-terms/${term._id}`);
//                         }}
//                       ></Button>

//                       <Button
//                         variant="plain"
//                         size="xs"
//                         className="text-gray-500 hover:text-red-700"
//                         icon={<ApolloIcon name="trash" className="text-md" />}
//                         onClick={() => {
//                           setSelected({ name: term.name, id: term._id });
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
//               deletePaymentTerm.mutate(selected.id, {
//                 onSuccess: () => {
//                   setDeleteConfirmDialogOpen(false);
//                   setSelected(null);
//                 },
//               });
//             }
//           }}
//         >
//           <p>Are you sure you want to delete {selected?.name}?</p>
//         </ConfirmDialog>
//       </Card>
//     </div>
//   );
// };

// export default PaymentTermsWrapper;
