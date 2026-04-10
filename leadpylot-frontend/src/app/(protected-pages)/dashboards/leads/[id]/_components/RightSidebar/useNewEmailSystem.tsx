import { useInfiniteEmailsForLead } from '@/services/hooks/useEmailSystem';
import { useInView } from 'react-intersection-observer';
import { useEffect, useMemo } from 'react';
import { formatEmailForDisplay } from '@/services/emailSystem/EmailSystemService';

export const useNewEmailSystem = (leadId: string | undefined) => {
  // Setup react-intersection-observer for email loading
  const { ref: loadMoreEmailRef, inView: emailInView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Use infinite query for new email system emails for specific lead
  const {
    data: infiniteEmailsData,
    isLoading: emailsLoading,
    error: emailsError,
    fetchNextPage: fetchNextEmailPage,
    hasNextPage: hasNextEmailPage,
    isFetchingNextPage: isFetchingNextEmailPage,
    refetch: refetchEmails,
  } = useInfiniteEmailsForLead(leadId || '', {
    limit: 100,
  });

  // Load more emails when the load more element comes into view
  useEffect(() => {
    if (emailInView && hasNextEmailPage && !isFetchingNextEmailPage) {
      fetchNextEmailPage();
    }
  }, [emailInView, hasNextEmailPage, isFetchingNextEmailPage, fetchNextEmailPage]);

  // Transform and group email system emails by date
  const groupedEmailNotifications = useMemo(() => {
    const result: Record<string, any[]> = {};

    if (!infiniteEmailsData?.pages) {
      return result;
    }

    // Process new email system emails for the specific lead
    infiniteEmailsData.pages.forEach((page) => {
      if (!page.emails || !Array.isArray(page.emails)) {
        return;
      }

      page.emails.forEach((email, emailIndex) => {
        // Validate required fields
        if (!email._id || !email.subject || !email.received_at) {
          console.warn(`Email ${emailIndex} missing required fields:`, email);
          return;
        }

        try {
          const formattedEmail = formatEmailForDisplay(email);
          const emailDate = new Date(email.received_at);

          // Validate date
          if (isNaN(emailDate.getTime())) {
            console.warn(`Email ${emailIndex} has invalid date:`, email.received_at);
            return;
          }

          const dateStr = emailDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          // Transform email to match the existing UI structure
          const transformedEmail = {
            id: email._id,
            actor: email.assigned_agent?.login || email.email_approved_by?.login || 'System',
            timestamp: emailDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            type: email.direction === 'incoming' ? 'email_received' : 'email_sent',
            details: {
              subject: formattedEmail.subject || 'No Subject',
              content: email.body || '',
              from_address: email?.from_address || '',
              to: email?.to || '',
              from: email?.from,
              received_at: email?.received_at,
              sent_at: email?.sent_at,
            },
            // Additional new email system fields
            approval_status: email.email_approved ? 'approved' : 'pending',
            attachment_approval_status: email.attachment_approved ? 'approved' : 'pending',
            attachments: email.attachments || [],
            assigned_to: email.assigned_agent?.login,
            lead_id: {
              _id: email.lead_id?._id,
              contact_name: email.lead_id?.contact_name,
              email_from: email.lead_id?.email_from,
            },
            project_id: {
              _id: email.project_id?._id,
              name: email.project_id?.name,
            },
            // New fields for UI
            direction: email.direction,
            priority: email.priority,
            category: email.category,
            sentiment: email.sentiment,
            spam_score: email.spam_score,
            is_spam: email.is_spam,
            agent_viewed: email.agent_viewed,
            admin_viewed: email.admin_viewed,
            conversation: email.conversation,

          };

          if (!result[dateStr]) {
            result[dateStr] = [];
          }

          result[dateStr].push(transformedEmail);
        } catch (error) {
          console.error(`Error processing email ${emailIndex}:`, error, email);
        }
      });
    });

    // Sort emails within each date group by timestamp (newest first)
    Object.keys(result).forEach((dateStr) => {
      result[dateStr].sort((a, b) => {
        const timeA = new Date(`${dateStr} ${a.timestamp}`).getTime();
        const timeB = new Date(`${dateStr} ${b.timestamp}`).getTime();
        return timeB - timeA;
      });
    });

    return result;
  }, [infiniteEmailsData?.pages, leadId]);

  // Get total unseen emails count from the first page metadata
  const totalUnseenEmails = useMemo(() => {
    if (infiniteEmailsData?.pages?.[0]?.metadata?.total_unseen_emails) {
      return infiniteEmailsData?.pages[0]?.metadata?.total_unseen_emails;
    }
    return 0;
  }, [infiniteEmailsData?.pages]);

  return {
    groupedEmailNotifications,
    emailNotificationsLoading: emailsLoading,
    emailNotificationsError: emailsError,
    hasNextEmailPage: hasNextEmailPage,
    isFetchingNextEmailPage: isFetchingNextEmailPage,
    loadMoreEmailRef,
    totalUnseenEmails,
    refetchEmails,
  };
};
