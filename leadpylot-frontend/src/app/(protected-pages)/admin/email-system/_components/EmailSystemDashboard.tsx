// 'use client';

// import { useMemo, useState } from 'react';
// import { ColumnDef } from '@/components/shared/DataTable';
// import Button from '@/components/ui/Button';
// import ApolloIcon from '@/components/ui/ApolloIcon';
// import { useEmailSystemEmails, useEmailSystemMutations } from '@/services/hooks/useEmailSystem';
// import { EmailSystemEmail } from '@/services/emailSystem/EmailSystemService';
// import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
// import BaseTable from '@/components/shared/BaseTable/BaseTable';
// import { useDrawerStore } from '@/stores/drawerStore';
// import Card from '@/components/ui/Card';
// import Badge from '@/components/ui/Badge';
// import { EmailSystemSidebar } from './EmailSystemSidebar';

// const EmailSystemDashboard = () => {
//   const {
//     isOpen,
//     sidebarType,
//     selectedId,
//     sidebarKey,
//     resetDrawer,
//     onOpenSidebar,
//     onHandleSidebar,
//   } = useDrawerStore();

//   const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

//   const { data: emailsData, isLoading } = useEmailSystemEmails({
//     limit: 50,
//     page: 1,
//     ...(filterStatus !== 'all' && { approval_status: filterStatus }),
//   });

//   const { approveEmail, rejectEmail } = useEmailSystemMutations();

//   // Quick action handlers
//   const handleQuickApprove = (email: EmailSystemEmail) => {
//     approveEmail.mutate({
//       id: email._id,
//       comments: 'Quick approval from dashboard',
//     });
//   };

//   const handleQuickReject = (email: EmailSystemEmail) => {
//     rejectEmail.mutate({
//       id: email._id,
//       reason: 'Quick rejection from dashboard',
//     });
//   };

//   // Status badge component
//   const StatusBadge = ({ status }: { status: 'pending' | 'approved' | 'rejected' }) => {
//     const variants = {
//       pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
//       approved: 'bg-green-100 text-green-800 border-green-200',
//       rejected: 'bg-red-100 text-red-800 border-red-200',
//     };

//     return (
//       <Badge className={`${variants[status]} border`}>
//         {status.charAt(0).toUpperCase() + status.slice(1)}
//       </Badge>
//     );
//   };

//   // Define columns for the DataTable
//   const columns: ColumnDef<EmailSystemEmail>[] = useMemo(
//     () => [
//       {
//         id: 'subject',
//         header: 'Subject',
//         accessorKey: 'subject',
//         cell: (props) => (
//           <div className="max-w-xs">
//             <p className="truncate font-medium">{props.row.original.subject || 'No Subject'}</p>
//             <p className="text-xs text-gray-500 truncate">{props.row.original.from_address}</p>
//           </div>
//         ),
//       },
//       {
//         id: 'status',
//         header: 'Content Status',
//         accessorKey: 'approval_status',
//         cell: (props) => <StatusBadge status={props.row.original.approval_status} />,
//       },
//       {
//         id: 'attachment_status',
//         header: 'Attachment Status',
//         accessorKey: 'attachment_approval_status',
//         cell: (props) => (
//           <div className="flex items-center gap-2">
//             <StatusBadge status={props.row.original.attachment_approval_status} />
//             {props.row.original.attachments?.length > 0 && (
//               <span className="text-xs text-gray-500">
//                 ({props.row.original.attachments.length})
//               </span>
//             )}
//           </div>
//         ),
//       },
//       {
//         id: 'assigned_to',
//         header: 'Assigned To',
//         accessorKey: 'assigned_to',
//         cell: (props) => (
//           <div className="text-sm">
//             {props.row.original.assigned_to ? (
//               <span className="text-blue-600">{props.row.original.assigned_to}</span>
//             ) : (
//               <span className="text-gray-400">Unassigned</span>
//             )}
//           </div>
//         ),
//       },
//       {
//         id: 'created_at',
//         header: 'Received',
//         accessorKey: 'created_at',
//         cell: (props) => (
//           <div className="text-sm text-gray-600">
//             {new Date(props.row.original.created_at).toLocaleDateString('en-US', {
//               month: 'short',
//               day: 'numeric',
//               hour: '2-digit',
//               minute: '2-digit',
//             })}
//           </div>
//         ),
//       },
//       {
//         id: 'actions',
//         header: 'Quick Actions',
//         cell: (props) => (
//           <div className="flex items-center gap-1">
//             {props.row.original.approval_status === 'pending' && (
//               <>
//                 <Button
//                   variant="plain"
//                   size="xs"
//                   className="text-green-600 hover:text-green-700"
//                   icon={<ApolloIcon name="check" className="text-sm" />}
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     handleQuickApprove(props.row.original);
//                   }}
//                   disabled={approveEmail.isPending}
//                 />
//                 <Button
//                   variant="plain"
//                   size="xs"
//                   className="text-red-600 hover:text-red-700"
//                   icon={<ApolloIcon name="x" className="text-sm" />}
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     handleQuickReject(props.row.original);
//                   }}
//                   disabled={rejectEmail.isPending}
//                 />
//               </>
//             )}
//             <Button
//               variant="plain"
//               size="xs"
//               className="text-sand-2 hover:text-ocean-2"
//               icon={<ApolloIcon name="eye-filled" className="text-sm" />}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onHandleSidebar(props.row.original._id);
//               }}
//             />
//           </div>
//         ),
//       },
//     ],
//     [onHandleSidebar, approveEmail.isPending, rejectEmail.isPending]
//   );

//   // BaseTable configuration
//   const tableConfig = useBaseTable({
//     tableName: 'email-system',
//     data: emailsData?.emails || [],
//     loading: isLoading,
//     totalItems: emailsData?.emails?.length || 0,
//     columns,
//     selectable: true,
//     title: 'Email System',
//     headerActions: (
//       <div className="flex items-center gap-2">
//         {/* Filter buttons */}
//         <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
//           {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
//             <Button
//               key={status}
//               variant={filterStatus === status ? 'solid' : 'plain'}
//               size="xs"
//               onClick={() => setFilterStatus(status)}
//               className={filterStatus === status ? 'bg-ocean-2 text-white' : 'text-gray-600'}
//             >
//               {status.charAt(0).toUpperCase() + status.slice(1)}
//             </Button>
//           ))}
//         </div>

//         {isOpen && (
//           <Button
//             variant="secondary"
//             size="sm"
//             onClick={onOpenSidebar}
//             icon={<ApolloIcon name={isOpen ? 'arrow-right' : 'arrow-left'} className="text-md" />}
//           >
//             {isOpen ? 'Hide' : 'Show'} <span className="hidden md:inline">Details</span>
//           </Button>
//         )}
//       </div>
//     ),
//     onRowClick: (row) => onHandleSidebar(row._id),
//     rowClassName: 'hover:bg-sand-5 cursor-pointer',
//   });

//   return (
//     <div className="flex flex-col gap-4">
//       <div>
//         <div className="flex flex-col-reverse gap-4 overflow-hidden lg:flex-row">
//           {/* Main content */}
//           <div
//             className={`w-full transition-all duration-300 ease-in-out ${isOpen ? 'lg:w-1/2' : 'w-full'}`}
//           >
//             <BaseTable {...tableConfig} />
//           </div>

//           {/* Right sidebar for email details and actions */}
//           <div
//             className={`w-full transform space-y-4 transition-all duration-300 ease-in-out lg:w-1/2 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
//               }`}
//             style={{ display: isOpen ? 'block' : 'none' }}
//           >
//             <Card>
//               <EmailSystemSidebar
//                 key={`email-${sidebarType}-${selectedId}-${sidebarKey}`}
//                 emailId={selectedId || undefined}
//                 onClose={resetDrawer}
//                 onSuccess={onOpenSidebar}
//               />
//             </Card>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default EmailSystemDashboard; 