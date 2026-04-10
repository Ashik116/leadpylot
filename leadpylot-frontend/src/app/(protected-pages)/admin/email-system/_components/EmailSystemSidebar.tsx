// 'use client';

// import React, { useState } from 'react';
// import Button from '@/components/ui/Button';
// import Input from '@/components/ui/Input';
// import ApolloIcon from '@/components/ui/ApolloIcon';
// import Badge from '@/components/ui/Badge';
// import {
//   useEmailSystemEmail,
//   useEmailSystemMutations
// } from '@/services/hooks/useEmailSystem';
// import { formatEmailForDisplay } from '@/services/emailSystem/EmailSystemService';

// interface EmailSystemSidebarProps {
//   emailId?: string;
//   onClose: () => void;
//   onSuccess: () => void;
// }

// export const EmailSystemSidebar: React.FC<EmailSystemSidebarProps> = ({
//   emailId,
//   onClose,
// }) => {
//   const [approvalNotes, setApprovalNotes] = useState('');
//   const [assignedTo, setAssignedTo] = useState('');
//   const [selectedLeadId, setSelectedLeadId] = useState('');

//   const { data: email, isLoading } = useEmailSystemEmail(emailId || '');

//   const {
//     approveContentMutation,
//     rejectContentMutation,
//     approveAttachmentsMutation,
//     rejectAttachmentsMutation,
//     assignToAgentMutation,
//     matchToLeadMutation,
//     downloadAttachmentMutation,
//   } = useEmailSystemMutations();

//   if (!emailId) {
//     return (
//       <div className="flex h-full items-center justify-center">
//         <div className="text-center text-gray-500">
//           <ApolloIcon name="mail" className="mx-auto mb-4 text-4xl" />
//           <p>Select an email to view details</p>
//         </div>
//       </div>
//     );
//   }

//   if (isLoading) {
//     return (
//       <div className="flex h-full items-center justify-center">
//         <div className="text-center">
//           <ApolloIcon name="loading" className="mx-auto mb-4 animate-spin text-4xl" />
//           <p>Loading email details...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!email) {
//     return (
//       <div className="flex h-full items-center justify-center">
//         <div className="text-center text-gray-500">
//           <ApolloIcon name="times" className="mx-auto mb-4 text-4xl" />
//           <p>Email not found</p>
//         </div>
//       </div>
//     );
//   }

//   const formattedEmail = formatEmailForDisplay(email);

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

//   const handleApproveContent = () => {
//     approveContentMutation.mutate({
//       id: email._id,
//       approval_notes: approvalNotes,
//     });
//     setApprovalNotes('');
//   };

//   const handleRejectContent = () => {
//     rejectContentMutation.mutate({
//       id: email._id,
//       approval_notes: approvalNotes,
//     });
//     setApprovalNotes('');
//   };

//   const handleApproveAttachments = () => {
//     approveAttachmentsMutation.mutate({
//       id: email._id,
//       approval_notes: approvalNotes,
//     });
//     setApprovalNotes('');
//   };

//   const handleRejectAttachments = () => {
//     rejectAttachmentsMutation.mutate({
//       id: email._id,
//       approval_notes: approvalNotes,
//     });
//     setApprovalNotes('');
//   };

//   const handleAssignToAgent = () => {
//     if (assignedTo) {
//       assignToAgentMutation.mutate({
//         id: email._id,
//         assigned_to: assignedTo,
//         lead_id: selectedLeadId || undefined,
//       });
//       setAssignedTo('');
//     }
//   };

//   const handleMatchToLead = () => {
//     if (selectedLeadId) {
//       matchToLeadMutation.mutate({
//         id: email._id,
//         lead_id: selectedLeadId,
//       });
//     }
//   };

//   const handleDownloadAttachment = (attachmentId: string, filename: string) => {
//     downloadAttachmentMutation.mutate({
//       emailId: email._id,
//       attachmentId,
//       filename,
//     });
//   };

//   return (
//     <div className="flex h-full flex-col">
//       {/* Header */}
//       <div className="flex items-center justify-between border-b border-gray-200 p-4">
//         <h2 className="text-lg font-semibold">Email Details</h2>
//         <Button
//           variant="plain"
//           size="sm"
//           icon={<ApolloIcon name="cross" />}
//           onClick={onClose}
//         />
//       </div>

//       {/* Content */}
//       <div className="flex-1 overflow-y-auto p-4">
//         <div className="space-y-6">
//           {/* Email Header */}
//           <div className="space-y-3">
//             <div>
//               <label className="text-sm font-medium text-gray-700">Subject</label>
//               <p className="text-sm text-gray-900">{formattedEmail.subject}</p>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="text-sm font-medium text-gray-700">From</label>
//                 <p className="text-sm text-gray-900">{formattedEmail.from}</p>
//               </div>
//               <div>
//                 <label className="text-sm font-medium text-gray-700">To</label>
//                 <p className="text-sm text-gray-900">{formattedEmail.to}</p>
//               </div>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="text-sm font-medium text-gray-700">Date</label>
//                 <p className="text-sm text-gray-900">{formattedEmail.date.dateStr}</p>
//               </div>
//               <div>
//                 <label className="text-sm font-medium text-gray-700">Time</label>
//                 <p className="text-sm text-gray-900">{formattedEmail.date.timeStr}</p>
//               </div>
//             </div>
//           </div>

//           {/* Status Section */}
//           <div className="space-y-3">
//             <h3 className="text-sm font-medium text-gray-700">Approval Status</h3>
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="text-xs text-gray-500">Content Status</label>
//                 <div className="mt-1">
//                   <StatusBadge status={email.approval_status} />
//                 </div>
//               </div>
//               <div>
//                 <label className="text-xs text-gray-500">Attachment Status</label>
//                 <div className="mt-1">
//                   <StatusBadge status={email.attachment_approval_status} />
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Email Body */}
//           <div>
//             <label className="text-sm font-medium text-gray-700">Email Content</label>
//             <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-200 p-3">
//               <div
//                 className="text-sm text-gray-900"
//                 dangerouslySetInnerHTML={{ __html: email.body }}
//               />
//             </div>
//           </div>

//           {/* Attachments */}
//           {email.attachments && email.attachments.length > 0 && (
//             <div>
//               <label className="text-sm font-medium text-gray-700">
//                 Attachments ({email.attachments.length})
//               </label>
//               <div className="mt-2 space-y-2">
//                 {email.attachments.map((attachment) => (
//                   <div
//                     key={attachment._id}
//                     className="flex items-center justify-between rounded-md border border-gray-200 p-3"
//                   >
//                     <div className="flex items-center space-x-3">
//                       <ApolloIcon name="file" className="text-gray-400" />
//                       <div>
//                         <p className="text-sm font-medium">{attachment.filename}</p>
//                         <p className="text-xs text-gray-500">
//                           {(attachment.size / 1024).toFixed(1)} KB
//                         </p>
//                       </div>
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <StatusBadge status={attachment.approval_status} />
//                       <Button
//                         variant="plain"
//                         size="xs"
//                         icon={<ApolloIcon name="download" />}
//                         onClick={() => handleDownloadAttachment(attachment._id, attachment.filename)}
//                         disabled={downloadAttachmentMutation.isPending}
//                       />
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Approval Notes */}
//           <div>
//             <label className="text-sm font-medium text-gray-700">Approval Notes</label>
//             <textarea
//               value={approvalNotes}
//               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApprovalNotes(e.target.value)}
//               placeholder="Add notes for approval/rejection..."
//               rows={3}
//               className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
//             />
//           </div>

//           {/* Assignment Section */}
//           <div className="space-y-3">
//             <h3 className="text-sm font-medium text-gray-700">Assignment</h3>
//             <div>
//               <label className="text-xs text-gray-500">Assign to Agent</label>
//               <Input
//                 value={assignedTo}
//                 onChange={(e) => setAssignedTo(e.target.value)}
//                 placeholder="Enter agent ID or email"
//                 className="mt-1"
//               />
//             </div>
//             <div>
//               <label className="text-xs text-gray-500">Match to Lead ID</label>
//               <Input
//                 value={selectedLeadId}
//                 onChange={(e) => setSelectedLeadId(e.target.value)}
//                 placeholder="Enter lead ID"
//                 className="mt-1"
//               />
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Actions Footer */}
//       <div className="border-t border-gray-200 p-4">
//         <div className="space-y-3">
//           {/* Content Approval Actions */}
//           {email.approval_status === 'pending' && (
//             <div className="flex space-x-2">
//               <Button
//                 variant="solid"
//                 size="sm"
//                 className="flex-1 bg-green-600 hover:bg-green-700"
//                 onClick={handleApproveContent}
//                 disabled={approveContentMutation.isPending}
//                 icon={approveContentMutation.isPending ? <ApolloIcon name="loading" className="animate-spin" /> : <ApolloIcon name="check" />}
//               >
//                 Approve Content
//               </Button>
//               <Button
//                 variant="solid"
//                 size="sm"
//                 className="flex-1 bg-red-600 hover:bg-red-700"
//                 onClick={handleRejectContent}
//                 disabled={rejectContentMutation.isPending}
//                 icon={rejectContentMutation.isPending ? <ApolloIcon name="loading" className="animate-spin" /> : <ApolloIcon name="times" />}
//               >
//                 Reject Content
//               </Button>
//             </div>
//           )}

//           {/* Attachment Approval Actions */}
//           {email.attachments && email.attachments.length > 0 && email.attachment_approval_status === 'pending' && (
//             <div className="flex space-x-2">
//               <Button
//                 variant="secondary"
//                 size="sm"
//                 className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
//                 onClick={handleApproveAttachments}
//                 disabled={approveAttachmentsMutation.isPending}
//                 icon={approveAttachmentsMutation.isPending ? <ApolloIcon name="loading" className="animate-spin" /> : <ApolloIcon name="check" />}
//               >
//                 Approve Attachments
//               </Button>
//               <Button
//                 variant="secondary"
//                 size="sm"
//                 className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
//                 onClick={handleRejectAttachments}
//                 disabled={rejectAttachmentsMutation.isPending}
//                 icon={rejectAttachmentsMutation.isPending ? <ApolloIcon name="loading" className="animate-spin" /> : <ApolloIcon name="times" />}
//               >
//                 Reject Attachments
//               </Button>
//             </div>
//           )}

//           {/* Assignment Actions */}
//           <div className="flex space-x-2">
//             <Button
//               variant="secondary"
//               size="sm"
//               onClick={handleAssignToAgent}
//               disabled={!assignedTo || assignToAgentMutation.isPending}
//               icon={assignToAgentMutation.isPending ? <ApolloIcon name="loading" className="animate-spin" /> : <ApolloIcon name="user" />}
//             >
//               Assign to Agent
//             </Button>
//             <Button
//               variant="secondary"
//               size="sm"
//               onClick={handleMatchToLead}
//               disabled={!selectedLeadId || matchToLeadMutation.isPending}
//               icon={matchToLeadMutation.isPending ? <ApolloIcon name="loading" className="animate-spin" /> : <ApolloIcon name="link" />}
//             >
//               Match to Lead
//             </Button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }; 