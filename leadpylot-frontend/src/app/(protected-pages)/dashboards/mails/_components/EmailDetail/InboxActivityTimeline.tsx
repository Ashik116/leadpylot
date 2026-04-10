'use client';

/**
 * InboxActivityTimeline Component
 * Displays activity timeline for email inbox tab
 * Shows updates from full lead details and email cards for main updates
 */

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { formatDistanceToNow, format } from 'date-fns';
import { useLeadDetails, useEmailDetail } from '../../_hooks/useEmailData';
import {
  ExtendedActivity,
  ActivityType,
} from '@/app/(protected-pages)/dashboards/leads/[id]/_components/UpdatesActivity';
import UpdatesActivitySkeleton from '@/app/(protected-pages)/dashboards/leads/[id]/_components/UpdatesActivitySkeleton';
import Spinner from '@/components/ui/Spinner';
import ApolloIcon from '@/components/ui/ApolloIcon';
import EmailCard from '@/app/(protected-pages)/dashboards/leads/[id]/_components/EmailCard';
import EmailDetail from '../EmailLayout/EmailDetail';

const UpdatesActivity = dynamic(
  () => import('@/app/(protected-pages)/dashboards/leads/[id]/_components/UpdatesActivity'),
  {
    ssr: false,
    loading: () => <UpdatesActivitySkeleton />,
  }
);

interface InboxActivityTimelineProps {
  leadId: string | undefined;
}

// Helper function to map update type to ActivityType
const mapUpdateTypeToActivityType = (type: string): ActivityType => {
  const typeMap: Record<string, ActivityType> = {
    opening_created: 'lead_created',
    opening_updated: 'lead_updated',
    email_sent: 'email_sent',
    email_received: 'email_received',
    call_inbound: 'call_inbound',
    call_outbound: 'call_outbound',
    call_missed: 'call_missed',
    task_pending: 'task_pending',
    task_in_progress: 'task_in_progress',
    task_completed: 'task_completed',
    note_added: 'note_added',
    stage_changed: 'stage_changed',
    lead_assigned: 'lead_assigned',
  };
  return typeMap[type] || 'lead_updated';
};

// Transform update to ExtendedActivity format
const transformUpdateToActivity = (update: any): ExtendedActivity => {
  const updateDate = new Date(update.createdAt || update.timestamp || Date.now());
  const dateStr = updateDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format the action to be readable
  const rawAction = update.action || update.type || '';
  const formattedAction = formatActionToReadable(rawAction);

  // Normalize message to fix duplicate "Re:" in email subjects
  let message = update.message || update.description || '';
  if (message) {
    // Fix duplicate "Re:" prefixes in email subjects within the message
    // Pattern: "Email received: Re: Re: Subject from..." -> "Email received: Re: Subject from..."
    message = message.replace(/Email (?:received|sent|assigned to lead):\s*((?:Re:\s*)+)/gi, (match: string) => {
      // Replace multiple "Re:" with a single "Re: "
      return match.replace(/(Re:\s*)+/gi, 'Re: ');
    });
  }

  return {
    id: update._id || update.id || `update-${Date.now()}-${Math.random()}`,
    type: mapUpdateTypeToActivityType(update.type),
    actor: update.creator?.login || update.actor || update.user?.login || 'System',
    timestamp: formatDistanceToNow(updateDate, { addSuffix: true }),
    date: dateStr,
    message: message,
    action: formattedAction,
    metadata: update.metadata || {},
    details: {
      subject: normalizeSubject(update.subject || ''),
      email: update.email || update.from_email || update.to_email,
      content: update.content || update.body,
      title: update.title,
      ...(update.details || {}),
    },
  };
};

// Helper: Normalize subject to fix "Re: Re:" issue - keep first "Re:", remove duplicates
const normalizeSubject = (subject: string): string => {
  if (!subject) return '(no subject)';
  // Remove duplicate "Re:" prefixes (e.g., "Re: Re: Subject" -> "Re: Subject")
  // This regex matches one or more "Re:" at the start and replaces with a single "Re: "
  let normalized = subject.trim();
  // Match "Re:" (case insensitive) with optional spaces, one or more times at the start
  // Replace all occurrences with a single "Re: "
  normalized = normalized.replace(/^(Re:\s*)+/i, 'Re: ');
  return normalized || '(no subject)';
};

// Helper: Convert snake_case action to readable text
const formatActionToReadable = (action: string): string => {
  if (!action) return '';
  // Replace underscores with spaces and capitalize first letter of each word
  return action
    .split('_')
    .map((word) => {
      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Helper: Format date safely
const formatDateSafely = (dateValue: any): string => {
  if (!dateValue) return 'No date';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid date';
    return format(date, 'MMM d, h:mm a');
  } catch {
    return 'Invalid date';
  }
};

// Email Card Wrapper Component with expand/collapse to show EmailDetail
const EmailCardWrapper = ({ email, activity }: { email: any; activity: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const emailId = email?._id || email?.id;

  const { data: emailDetailData, isLoading: isLoadingEmail } = useEmailDetail(
    isExpanded ? emailId : null
  );

  if (!email) return null;

  const conversation = emailDetailData?.email || email;
  const emailSubject = email.subject || activity.details?.subject || '(no subject)';

  const activityData = {
    ...activity,
    id: email._id || email.id,
    direction: email.direction,
    admin_viewed: email.admin_viewed,
    agent_viewed: email.agent_viewed,
    approval_status: email.email_approved ? 'approved' : 'pending',
    attachments: email.attachments || [],
    project_id: email.project_id,
    lead_id: email.lead_id,
    subject: normalizeSubject(emailSubject),
    details: {
      from_address: email.from_address || email.from,
      from: email.from,
      received_at: email.received_at,
      sent_at: email.sent_at,
    },
    timestamp: formatDateSafely(email.received_at || email.sent_at || email.createdAt),
  };

  return (
    <div className="mb-3">
      {/* Collapsed Email Card */}
      {!isExpanded && (
        <div onClick={() => setIsExpanded(true)}>
          <EmailCard activity={activityData} onClick={() => setIsExpanded(true)} />
        </div>
      )}

      {/* Expanded Email Detail */}
      {isExpanded && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div
            onClick={() => setIsExpanded(false)}
            className="flex cursor-pointer items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 transition-colors hover:bg-gray-100"
            title="Click to collapse email"
          >
            <h3 className="font-medium text-gray-900">
              {normalizeSubject(emailDetailData?.email?.subject || email?.subject || '(no subject)')}
            </h3>
            <ApolloIcon name="chevron-arrow-up" className="text-sm text-gray-400" />
          </div>
          <div className="h-[70vh] max-h-[800px] min-h-[500px] overflow-hidden">
            {isLoadingEmail ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size={40} />
              </div>
            ) : (
              <EmailDetail
                conversation={{
                  ...conversation,
                  subject: normalizeSubject(conversation?.subject || ''),
                } as any}
                hideBackButton={true}
                showSingleEmail={true}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const InboxActivityTimeline = ({ leadId }: InboxActivityTimelineProps) => {
  // Fetch full lead details
  const { data: leadDetailsData, isLoading, error } = useLeadDetails(leadId);

  // Extract updates from lead details
  const updates = useMemo(() => {
    if (!leadDetailsData) return [];
    return leadDetailsData.updates || leadDetailsData.data?.updates || [];
  }, [leadDetailsData]);

  // Transform updates to activities
  const transformedActivities = useMemo(() => {
    return updates.map(transformUpdateToActivity);
  }, [updates]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const result: Record<string, ExtendedActivity[]> = {};
    transformedActivities.forEach((activity: ExtendedActivity) => {
      const date = activity.date || 'Unknown Date';
      if (!result[date]) {
        result[date] = [];
      }
      result[date].push(activity);
    });
    return result;
  }, [transformedActivities]);

  // Extract emails from lead details (recent emails array)
  const emails = useMemo(() => {
    if (!leadDetailsData) return [];
    return leadDetailsData.emails?.recent || leadDetailsData.data?.emails?.recent || [];
  }, [leadDetailsData]);

  // Get updates with is_email: true for email cards
  const emailUpdates = useMemo(() => {
    return updates.filter((update: any) => update.is_email === true);
  }, [updates]);

  // Create a map of update ID to email data for quick lookup
  const updateToEmailMap = useMemo(() => {
    const map = new Map<string, any>();

    emailUpdates.forEach((update: any) => {
      const updateId = update._id || update.id;
      if (!updateId) return;

      // Priority 1: Find by email_id
      const emailId = update.email_id || update.metadata?.email_id || update.metadata?.email?._id;
      if (emailId) {
        const email = emails.find(
          (e: any) =>
            e._id === emailId ||
            e.id === emailId ||
            e._id?.toString() === emailId?.toString() ||
            e.id?.toString() === emailId?.toString()
        );
        if (email) {
          map.set(updateId, email);
          return;
        }
      }

      // Priority 2: Find by thread_id (for replies without email_id - use first match, API should provide sorted)
      const threadId = update.thread_id;
      if (threadId && !emailId) {
        const email = emails.find(
          (e: any) =>
            (e.thread_id && e.thread_id.toString() === threadId.toString()) ||
            (e._id && e._id.toString() === threadId.toString())
        );
        if (email) {
          map.set(updateId, email);
          return;
        }
      }

      // Priority 3: Extract email data directly from update
      if (update.email) {
        map.set(updateId, update.email);
        return;
      }
      if (update.email_data) {
        map.set(updateId, update.email_data);
        return;
      }
      if (update.metadata?.email) {
        map.set(updateId, update.metadata.email);
        return;
      }

      // Priority 4: If update itself looks like email data
      if (update.subject || update.from || update.body) {
        map.set(updateId, update);
      }
    });

    return map;
  }, [emailUpdates, emails]);

  // Flatten all activities for cascading logic
  const allActivities = useMemo(() => {
    return Object.values(groupedActivities).flat();
  }, [groupedActivities]);

  // Show message if no leadId
  if (!leadId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-gray-500">No lead ID provided</p>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-rust text-sm">Error loading updates</p>
      </div>
    );
  }

  // Show empty state
  if (updates.length === 0) {
    return (
      <div className="p-3">
        <p className="text-sm text-gray-500">No updates found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Show all updates with email cards inline */}
      {Object.entries(groupedActivities).map(([date, activities]) => (
        <div key={date}>
          <div className="relative text-center">
            <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-gray-400" />
            <span className="relative bg-white px-2 text-sm text-gray-500">
              {date} - {activities[0]?.timestamp}
            </span>
          </div>
          {activities?.map((activity: ExtendedActivity) => {
            // Find the original update to check if it has an email
            const originalUpdate = updates.find((u: any) => (u._id || u.id) === activity.id);

            // Get email data from map, or create minimal email object with email_id if not found
            let emailData = originalUpdate
              ? updateToEmailMap.get(originalUpdate._id || originalUpdate.id)
              : null;

            // If no email found but update has email_id or thread_id, try to find or create email object
            if (originalUpdate?.is_email === true && !emailData) {
              const emailId =
                originalUpdate.email_id ||
                originalUpdate.metadata?.email_id ||
                originalUpdate.metadata?.email?._id;
              const threadId = originalUpdate.thread_id;

              // Try to find email by thread_id if email_id is not available (for replies)
              if (!emailId && threadId) {
                emailData = emails.find(
                  (e: any) =>
                    (e.thread_id && e.thread_id.toString() === threadId.toString()) ||
                    (e._id && e._id.toString() === threadId.toString())
                );
              }

              // If still no email found and we have email_id, create minimal email object
              if (!emailData && emailId) {
                const description = originalUpdate.description || originalUpdate.message || '';
                const metadata = originalUpdate.metadata || {};

                // Extract email address
                const fromMatch = description.match(/(?:from|to)\s+([^\s@]+@[^\s,]+)/i);
                const fromAddress =
                  fromMatch?.[1] ||
                  metadata.from_email ||
                  metadata.from_address ||
                  metadata.from ||
                  metadata.to_email ||
                  metadata.to_address ||
                  '';

                // Determine direction
                const isOutgoing =
                  description.toLowerCase().includes('sent') ||
                  description.toLowerCase().includes('to') ||
                  metadata.direction === 'outgoing';

                // Extract and normalize subject
                let extractedSubject = originalUpdate.metadata?.subject || '';
                if (!extractedSubject && description) {
                  const sentMatch = description.match(
                    /(?:Email sent|Email assigned to lead|Email received):\s*(.+?)(?:\s+(?:from|to)\s+[^\s@]+@[^\s,]+|$)/i
                  );
                  if (sentMatch?.[1]) {
                    extractedSubject = sentMatch[1].trim();
                  } else {
                    const colonMatch = description.match(/:\s*(.+?)(?:\s+(?:from|to)\s+[^\s@]+@[^\s,]+|$)/i);
                    if (colonMatch?.[1]) {
                      extractedSubject = colonMatch[1].trim();
                    }
                  }
                }

                emailData = {
                  _id: emailId,
                  id: emailId,
                  thread_id: threadId,
                  subject: normalizeSubject(extractedSubject || description.split(':')[1]?.trim() || description),
                  direction: isOutgoing ? 'outgoing' : 'incoming',
                  from_address: fromAddress,
                  from: fromAddress,
                  received_at: metadata.received_at || (isOutgoing ? null : originalUpdate.createdAt),
                  sent_at: metadata.sent_at || (isOutgoing ? originalUpdate.createdAt : null),
                  createdAt: originalUpdate.createdAt,
                };
              }
            }

            return (
              <div key={activity.id}>
                <UpdatesActivity
                  activity={activity}
                  allActivities={allActivities}
                  leadExpandView={false}
                />
                {/* Show email card right after the update if it has is_email: true */}
                {originalUpdate?.is_email === true && emailData && (
                  <div className="mt-2 ml-12">
                    <EmailCardWrapper email={emailData} activity={activity} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default InboxActivityTimeline;
