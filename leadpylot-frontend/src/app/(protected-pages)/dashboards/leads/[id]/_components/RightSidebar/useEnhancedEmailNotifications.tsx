// import { useInfiniteNotifications } from '@/services/hooks/notifications/useNotifications';
// import { useInfiniteAgentEmails } from '@/services/hooks/useEmailSystem';
// import { useInView } from 'react-intersection-observer';
// import { useEffect, useMemo } from 'react';
// import { formatEmailForDisplay } from '@/services/emailSystem/EmailSystemService';

// export const useEnhancedEmailNotifications = (leadId: string | undefined) => {
//   // Setup react-intersection-observer for email notifications
//   const { ref: loadMoreEmailRef, inView: emailInView } = useInView({
//     threshold: 0.1,
//     triggerOnce: false,
//   });

//   // Use infinite query for legacy email notifications
//   const {
//     data: infiniteEmailNotificationsData,
//     isLoading: emailNotificationsLoading,
//     error: emailNotificationsError,
//     fetchNextPage: fetchNextEmailPage,
//     hasNextPage: hasNextEmailPage,
//     isFetchingNextPage: isFetchingNextEmailPage,
//   } = useInfiniteNotifications({
//     lead_id: leadId,
//     type: 'email',
//     limit: 10,
//   });

//   // Use infinite query for new email system emails (only approved emails for agents)
//   const {
//     data: infiniteAgentEmailsData,
//     isLoading: agentEmailsLoading,
//     error: agentEmailsError,
//     fetchNextPage: fetchNextAgentEmailPage,
//     hasNextPage: hasNextAgentEmailPage,
//     isFetchingNextPage: isFetchingNextAgentEmailPage,
//   } = useInfiniteAgentEmails({
//     lead_id: leadId,
//     limit: 10,
//   });

//   // Load more emails when the load more element comes into view
//   useEffect(() => {
//     if (emailInView && !isFetchingNextEmailPage && !isFetchingNextAgentEmailPage) {
//       if (hasNextEmailPage) {
//         fetchNextEmailPage();
//       }
//       if (hasNextAgentEmailPage) {
//         fetchNextAgentEmailPage();
//       }
//     }
//   }, [
//     emailInView,
//     hasNextEmailPage,
//     hasNextAgentEmailPage,
//     isFetchingNextEmailPage,
//     isFetchingNextAgentEmailPage,
//     fetchNextEmailPage,
//     fetchNextAgentEmailPage,
//   ]);

//   // Transform and group both legacy notifications and new email system emails by date
//   const groupedEmailNotifications = useMemo(() => {
//     const result: Record<string, any[]> = {};

//     // Process legacy email notifications
//     if (infiniteEmailNotificationsData?.pages) {
//       infiniteEmailNotificationsData.pages.forEach((page) => {
//         if (!page.data) return;

//         page.data.forEach((notification) => {
//           // Format the date for display
//           const notificationDate = new Date(notification.created_at);
//           const dateStr = notificationDate.toLocaleDateString('en-US', {
//             year: 'numeric',
//             month: 'long',
//             day: 'numeric',
//           });

//           // Transform notification to match our UI structure
//           const transformedNotification = {
//             id: notification._id,
//             actor: notification.info.project_id?.agents?.[0]?.alias_name || 'System',
//             timestamp: notificationDate.toLocaleTimeString('en-US', {
//               hour: '2-digit',
//               minute: '2-digit',
//               hour12: false,
//             }),
//             type: notification.inbox === 'incoming' ? 'email_received' : 'email_sent',
//             details: {
//               subject: notification.metadata?.subject || 'No Subject',
//               content: notification.metadata?.body || 'No content',
//               from_address: notification.metadata?.from_address,
//               to: notification.metadata?.to,
//             },
//             source: 'legacy', // Mark as legacy notification
//           };

//           if (!result[dateStr]) {
//             result[dateStr] = [];
//           }

//           result[dateStr].push(transformedNotification);
//         });
//       });
//     }

//     // Process new email system emails (only approved emails visible to agents)
//     if (infiniteAgentEmailsData?.pages) {
//       infiniteAgentEmailsData.pages.forEach((page) => {
//         if (!page.emails) return;

//         page.emails.forEach((email) => {
//           // Only show approved emails to agents
//           if (email.approval_status !== 'approved') return;

//           const formattedEmail = formatEmailForDisplay(email);
//           const emailDate = new Date(email.created_at);
//           const dateStr = emailDate.toLocaleDateString('en-US', {
//             year: 'numeric',
//             month: 'long',
//             day: 'numeric',
//           });

//           // Transform email to match our UI structure
//           const transformedEmail = {
//             id: email._id,
//             actor: email.assigned_to || 'System',
//             timestamp: emailDate.toLocaleTimeString('en-US', {
//               hour: '2-digit',
//               minute: '2-digit',
//               hour12: false,
//             }),
//             type: email.from_address.includes('@') ? 'email_received' : 'email_sent',
//             details: {
//               subject: formattedEmail.subject,
//               content: email.body,
//               from_address: email.from_address,
//               to: email.to_address,
//             },
//             source: 'email_system', // Mark as new email system
//             approval_status: email.approval_status,
//             attachment_approval_status: email.attachment_approval_status,
//             attachments: email.attachments,
//           };

//           if (!result[dateStr]) {
//             result[dateStr] = [];
//           }

//           result[dateStr].push(transformedEmail);
//         });
//       });
//     }

//     // Sort emails within each date group by timestamp (newest first)
//     Object.keys(result).forEach((dateStr) => {
//       result[dateStr].sort((a, b) => {
//         const timeA = new Date(`${dateStr} ${a.timestamp}`).getTime();
//         const timeB = new Date(`${dateStr} ${b.timestamp}`).getTime();
//         return timeB - timeA;
//       });
//     });

//     return result;
//   }, [infiniteEmailNotificationsData?.pages, infiniteAgentEmailsData?.pages]);

//   // Combined loading and error states
//   const combinedLoading = emailNotificationsLoading || agentEmailsLoading;
//   const combinedError = emailNotificationsError || agentEmailsError;
//   const combinedHasNextPage = hasNextEmailPage || hasNextAgentEmailPage;
//   const combinedIsFetchingNextPage = isFetchingNextEmailPage || isFetchingNextAgentEmailPage;

//   return {
//     groupedEmailNotifications,
//     emailNotificationsLoading: combinedLoading,
//     emailNotificationsError: combinedError,
//     hasNextEmailPage: combinedHasNextPage,
//     isFetchingNextEmailPage: combinedIsFetchingNextPage,
//     loadMoreEmailRef,
//   };
// }; 