import { useInfiniteActivities } from '@/services/hooks/useActivities';
import { useInView } from 'react-intersection-observer';
import { useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ActivityType, ExtendedActivity } from '../UpdatesActivity';
import { FilterType } from './UpdatesFilterTabs';
import { GetActivitiesParams, GetActivitiesResponse } from '@/services/ActivitiesService';
import { useSearchParams } from 'next/navigation';

// Helper to safely extract string from value that may be {value, html, text} or string
const extractString = (value: unknown): string => {
  if (value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text;
    if (typeof o.value === 'string') return o.value;
    if (typeof o.html === 'string') return o.html.replace(/<[^>]+>/g, '').trim();
  }
  return String(value);
};

// Helper function to map API activity types to UI activity types
export const mapActivityTypeToUI = (
  action: string,
  subjectType: string,
  metadata?: any,
  message?: string
): ActivityType => {
  const normalizedSubjectType = subjectType?.toLowerCase?.() || '';
  // Treat as email activity if it has email_id (primary) or subject_type is Email
  const hasEmailId = !!(
    metadata?.email_id ||
    (metadata?.email && (typeof metadata.email === 'object' ? metadata.email._id : metadata.email))
  );
  const isEmailActivity = hasEmailId || subjectType === 'Email';

  if (isEmailActivity) {
    // Sub-type: use action_type only to choose icon/label (assigned vs sent vs received)
    if (metadata?.action_type === 'email_assigned_to_lead') {
      return 'email_assigned_to_lead';
    }
    const direction = metadata?.direction;
    if (direction === 'outgoing' || metadata?.action_type === 'email_reply_sent') {
      return 'email_sent';
    }
    return 'email_received';
  }

  // Check for call activities
  if (metadata?.action_type === 'call_inbound' || metadata?.call_type === 'inbound') {
    return 'call_inbound';
  } else if (metadata?.action_type === 'call_outbound' || metadata?.call_type === 'outbound') {
    return 'call_outbound';
  } else if (metadata?.action_type === 'call_missed' || metadata?.call_type === 'missed') {
    return 'call_missed';
  }

  // Check for note/comment activities
  if (action === 'comment' || metadata?.action_type === 'note_added' || subjectType === 'Note') {
    return 'note_added';
  }

  const rawType = (metadata?.item_type || metadata?.action_type || action || '')
    .toString()
    .toLowerCase();

  // Check for appointment/meeting activities
  if (
    rawType.includes('appointment') ||
    subjectType === 'Appointment' ||
    subjectType === 'Meeting' ||
    rawType.includes('meeting_scheduled')
  ) {
    return 'meeting_scheduled';
  }

  // Check for offer-related activities
  if (rawType.includes('offer')) {
    return 'offer_transferred';
  }

  // Check for task-created activity (task_created in item_type/action_type, or create + Todo/task)
  if (rawType.includes('task_created')) {
    return 'task_created';
  }

  // Check for task-updated activity (task_updated in item_type/action_type)
  if (rawType.includes('task_updated')) {
    return 'task_updated';
  }

  // Check for task transfer (Task moved from X to Y)
  if (
    rawType.includes('transfer') ||
    message?.toLowerCase?.().includes('task moved') ||
    message?.toLowerCase?.().includes('moved from')
  ) {
    return 'task_transfer';
  }

  // Check for subtask created (Subtask "..." added or Subtools "..." added)
  const msgLower = message?.toLowerCase?.() || '';
  if (
    rawType.includes('subtask_created') ||
    (action === 'create' &&
      (msgLower.includes('subtask') || msgLower.includes('subtools')) &&
      msgLower.includes('added')) ||
    ((msgLower.includes('subtask') || msgLower.includes('subtools')) && msgLower.includes('added'))
  ) {
    return 'subtask_created';
  }

  // Check for task priority update (Task priority changed)
  if (
    message?.toLowerCase?.().includes('task priority changed') ||
    message?.toLowerCase?.().includes('priority changed')
  ) {
    return 'task_priority_updated';
  }

  // Check for subtask updated (Subtask '...' updated or nested todos: X → Y)
  if (
    rawType.includes('subtask_updated') ||
    (msgLower.includes('subtask') && msgLower.includes('updated'))
  ) {
    return 'subtask_updated';
  }

  // Check for task created from email (create + Todo/task with email_id or task_created_from_email)
  if (
    action === 'create' &&
    (subjectType === 'Todo' ||
      normalizedSubjectType.includes('task') ||
      normalizedSubjectType.includes('subtask') ||
      metadata?.todo_id) &&
    (metadata?.email_id ||
      metadata?.task_created_from_email ||
      metadata?.action_type === 'task_created_from_email' ||
      rawType.includes('created_from_email'))
  ) {
    return 'task_created_from_email';
  }

  // Detect task creation from message when subject_type is 'Lead' but message is about a task
  // Only matches when message explicitly starts with "task" to avoid false positives
  if (
    action === 'create' &&
    (msgLower.startsWith('task ') || msgLower.startsWith('todo ')) &&
    (msgLower.includes('created') || msgLower.includes('added'))
  ) {
    return 'task_created';
  }

  if (action === 'create' && subjectType === 'Lead') {
    return 'lead_created';
  } else if (action === 'status_change') {
    return 'stage_changed';
  } else if (action === 'create' && subjectType === 'Meeting') {
    return 'meeting_scheduled';
  } else if (action === 'assign') {
    return 'lead_assigned';
  } else if (action === 'update' && message?.toLowerCase?.().includes('task updated')) {
    return 'task_updated';
  } else if (
    action === 'update' &&
    (subjectType === 'Todo' ||
      normalizedSubjectType.includes('task') ||
      normalizedSubjectType.includes('subtask') ||
      metadata?.todo_id)
  ) {
    return 'task_in_progress';
  } else if (action === 'update') {
    return 'lead_updated';
  } else if (
    action === 'create' &&
    (subjectType === 'Todo' ||
      normalizedSubjectType.includes('task') ||
      normalizedSubjectType.includes('subtask') ||
      metadata?.todo_id)
  ) {
    return 'task_pending';
  } else if (
    action === 'delete' &&
    (subjectType === 'Todo' ||
      normalizedSubjectType.includes('task') ||
      normalizedSubjectType.includes('subtask') ||
      metadata?.todo_id)
  ) {
    return 'task_completed';
  }
  // Default fallback
  return 'lead_updated';
};

// Helper function to parse activity details from API data
export const parseActivityDetails = (activity: any) => {
  const details: ExtendedActivity['details'] = {};
  if (activity.metadata) {
    // Handle email activities by presence of email_id (or subject_type Email)
    const hasEmailId = !!(
      activity.metadata.email_id ||
      (activity.metadata.email &&
        (typeof activity.metadata.email === 'object'
          ? activity.metadata.email._id
          : activity.metadata.email))
    );
    const isEmailActivity = hasEmailId || activity.subject_type === 'Email';

    if (isEmailActivity) {
      // For task creation activities, extract subject from taskTitle if email_subject is missing
      details.subject = extractString(
        activity.metadata.email_subject || activity.metadata.taskTitle || 'No Subject'
      );
      details.email = extractString(
        activity.metadata.From_email ||
          activity.metadata.email_from ||
          activity.metadata.email_to ||
          ''
      );

      // Store email_id in details so EmailActivityCard can fetch email details if needed
      if (activity.metadata.email_id) {
        details.email_id = activity.metadata.email_id._id || activity.metadata.email_id;
      } else if (activity.metadata?.email?._id) {
        details.email_id = activity.metadata.email._id;
      } else if (activity.metadata?.email) {
        details.email_id = activity.metadata.email;
      } else if (activity.subject_id) {
        details.email_id = activity.subject_id;
      }
    } else if (activity.action === 'status_change') {
      details.oldStage = extractString(
        activity.metadata.oldStatus ||
          activity.metadata.oldStage ||
          activity.metadata.old_status ||
          'Unknown'
      );
      details.newStage = extractString(
        activity.metadata.newStatus ||
          activity.metadata.newStage ||
          activity.metadata.new_status ||
          'Unknown'
      );
    } else if (activity.action === 'create' && activity.subject_type === 'Meeting') {
      details.subject = extractString(activity.metadata.subject || 'No Subject');
      details.duration = extractString(activity.metadata.duration || '1 hour');
    } else if (activity.action === 'assign') {
      details.lead = activity.metadata.lead;
      details.agent = activity.metadata.agent;
      details.project = activity.metadata.project;
      details.agentName = extractString(activity.metadata.agentName);
      details.projectName = extractString(activity.metadata.projectName);
    } else if (activity.subject_type === 'Todo') {
      details.title = extractString(activity.metadata.todo_message || 'Todo');
      details.content = extractString(activity.metadata.todo_message || '');
      details.priority = 'Medium'; // Default priority since it's not in the API
    } else if (
      activity.action === 'comment' ||
      activity.metadata?.action_type === 'note_added' ||
      activity.subject_type === 'Note'
    ) {
      // metadata.message already contains the clean comment text
      details.content = extractString(
        activity.metadata?.message || activity.metadata?.note_content || ''
      );
    } else if (activity.metadata?.call_type || activity.metadata?.action_type?.includes('call')) {
      details.duration_seconds = activity.metadata?.duration_seconds;
      details.call_status = extractString(
        activity.metadata?.call_status || activity.metadata?.status || ''
      );
    }
  }

  return details;
};

// Helper function to transform and group activities by date
export const transformAndGroupActivities = (
  infiniteActivitiesData: { pages: GetActivitiesResponse[] } | undefined,
  filterType?: FilterType,
  matchesFilter?: (activityType: ActivityType, filter: FilterType) => boolean
): Record<string, ExtendedActivity[]> => {
  const result: Record<string, ExtendedActivity[]> = {};

  if (!infiniteActivitiesData?.pages) {
    return result;
  }

  // Process all pages of activities
  infiniteActivitiesData.pages.forEach((page) => {
    if (!page.data) return;
    page.data.forEach((activity) => {
      const activityDate = new Date(activity.createdAt);
      const dateStr = activityDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const rawActivity: any = activity as any;
      const normalizedEmailId =
        rawActivity?.metadata?.email_id?._id ||
        rawActivity?.metadata?.email_id ||
        rawActivity?.metadata?.email?._id ||
        rawActivity?.metadata?.email ||
        rawActivity?.email_id ||
        rawActivity?.emailId ||
        null;
      const normalizedActivity = {
        ...rawActivity,
        metadata: {
          ...rawActivity?.metadata,
          email_id: rawActivity?.metadata?.email_id || normalizedEmailId || undefined,
        },
      };

      // Transform API activity to match our UI structure
      const transformedActivity: ExtendedActivity = {
        id: normalizedActivity._id,
        type: mapActivityTypeToUI(
          normalizedActivity.action,
          normalizedActivity.subject_type,
          normalizedActivity.metadata,
          extractString(normalizedActivity.message)
        ),
        actor: extractString(normalizedActivity.creator?.login || 'System'),
        timestamp: formatDistanceToNow(activityDate, { addSuffix: true }),
        date: dateStr,
        createdAt: activityDate,
        details: parseActivityDetails(normalizedActivity),
        message: extractString(normalizedActivity.message),
        action: normalizedActivity.action,
        metadata: normalizedActivity.metadata,
      };

      // Client-side filter by raw activity data (same pattern for each tab)
      if (filterType === 'email') {
        const hasEmailId = !!normalizedActivity.metadata?.email_id;
        if (!hasEmailId && normalizedActivity.subject_type !== 'Email') {
          return;
        }
      }
      // Client-side filter for calls (API may not filter by call type)
      if (filterType && matchesFilter && filterType === 'calls') {
        if (!matchesFilter(transformedActivity.type, filterType)) {
          return;
        }
      }

      if (!result[dateStr]) {
        result[dateStr] = [];
      }

      result[dateStr].push(transformedActivity);
    });
  });

  return result;
};

export const useActivities = (
  leadId: string | undefined,
  leadExpandView?: boolean,
  filterType: FilterType = 'all'
) => {
  // Setup react-intersection-observer for activities
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false,
    rootMargin: '100px',
  });
  const sortEmailIdParam = useSearchParams().get('emailId');

  // Determine the limit based on leadExpandView
  const limit = leadExpandView ? 1 : 50;

  // Map FilterType to API query parameters
  const getApiParams = (filter: FilterType, leadId?: string): Partial<GetActivitiesParams> => {
    switch (filter) {
      case 'status':
        return { action: 'status_change' };
      case 'email':
        return {
          subject_type: 'Email',
          sort_email: sortEmailIdParam ? sortEmailIdParam : undefined,
        };

      case 'tickets':
        // For tickets, use domain parameter with is_task filter
        if (leadId) {
          const domain = JSON.stringify([
            ['is_task', '=', true],
            ['subject_id', '=', leadId],
          ]);
          return { domain };
        }
        return { subject_type: 'Lead' };
      case 'comments':
        if (leadId) {
          const domain = JSON.stringify([
            ['is_task', '=', true],
            ['subject_id', '=', leadId],
            ['action', '=', 'comment'],
          ]);
          return { domain };
        }

      case 'all':

      default:
        return {};
    }
  };

  const apiParams = getApiParams(filterType, leadId);

  const {
    data: infiniteActivitiesData,
    isLoading: activitiesLoading,
    error: activitiesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteActivities({
    subject_id: leadId,
    limit,
    ...apiParams,
  });

  // Load more data when the load more element comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, hasNextPage, isFetchingNextPage]);

  // Helper function to check if activity matches filter (for client-side filtering of calls)
  const matchesFilter = (activityType: ActivityType, filter: FilterType): boolean => {
    if (filter === 'all') return true;

    switch (filter) {
      case 'status':
        return activityType === 'stage_changed';
      case 'email':
        return (
          activityType === 'email_sent' ||
          activityType === 'email_received' ||
          activityType === 'email_assigned_to_lead'
        );
      case 'calls':
        // Calls are filtered client-side since API might not support direct filtering
        return (
          activityType === 'call_inbound' ||
          activityType === 'call_outbound' ||
          activityType === 'call_missed'
        );
      case 'todos':
        return (
          activityType === 'task_created' ||
          activityType === 'task_updated' ||
          activityType === 'task_transfer' ||
          activityType === 'subtask_created' ||
          activityType === 'subtask_updated' ||
          activityType === 'task_priority_updated' ||
          activityType === 'task_created_from_email' ||
          activityType === 'task_pending' ||
          activityType === 'task_in_progress' ||
          activityType === 'task_completed'
        );
      case 'tickets':
        // Tickets are the same as todos in this system
        return (
          activityType === 'task_created' ||
          activityType === 'task_updated' ||
          activityType === 'task_transfer' ||
          activityType === 'subtask_created' ||
          activityType === 'subtask_updated' ||
          activityType === 'task_priority_updated' ||
          activityType === 'task_created_from_email' ||
          activityType === 'task_pending' ||
          activityType === 'task_in_progress' ||
          activityType === 'task_completed'
        );
      default:
        return true;
    }
  };

  // Transform and group activities by date from the infinite query data
  const groupedActivities = useMemo(() => {
    return transformAndGroupActivities(infiniteActivitiesData, filterType, matchesFilter);
  }, [infiniteActivitiesData, filterType]);

  return {
    groupedActivities,
    activitiesLoading,
    activitiesError,
    hasNextPage,
    isFetchingNextPage,
    loadMoreRef,
  };
};
