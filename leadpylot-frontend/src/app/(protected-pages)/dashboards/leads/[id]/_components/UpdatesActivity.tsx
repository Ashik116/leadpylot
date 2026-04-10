import React, { useEffect, useState } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Checkbox from '@/components/ui/Checkbox';
import Button from '@/components/ui/Button';
import { apiToggleTodoStatus, apiDeleteTodo } from '@/services/ToDoService';
import { useQueryClient } from '@tanstack/react-query';
import EmailActivityCard from './EmailActivityCard';
import { dateFormateUtils, DateFormatType } from '@/utils/dateFormateUtils';
import LeadsMenuIcon from '@/assets/svg/menu-icons/LeadsMenuIcon';
import CallsMenuIcon from '@/assets/svg/menu-icons/CallsMenuIcon';
import OffersMenuIcon from '@/assets/svg/menu-icons/OffersMenuIcon';
import ExpandableText from '@/components/shared/ExpandableText';

// Define the activity types
export type ActivityType =
  | 'meeting_scheduled'
  | 'stage_changed'
  | 'lead_created'
  | 'lead_assigned'
  | 'lead_updated'
  | 'offer_transferred'
  | 'note_added'
  | 'email_sent'
  | 'email_received'
  | 'email_assigned_to_lead'
  | 'task_created_from_email'
  | 'call_inbound'
  | 'call_outbound'
  | 'call_missed'
  | 'task_created'
  | 'task_updated'
  | 'task_transfer'
  | 'subtask_created'
  | 'subtask_updated'
  | 'task_priority_updated'
  | 'task_pending'
  | 'task_in_progress'
  | 'task_completed';

// Extended Activity interface
export interface ExtendedActivity {
  id: string;
  type: ActivityType;
  actor: string;
  timestamp: string;
  date?: string;
  createdAt?: Date;
  message?: string;
  action?: string;
  metadata?: any;
  details?: {
    subject?: string;
    duration?: string;
    oldStage?: string;
    newStage?: string;
    lead?: any;
    agent?: any;
    project?: any;
    agentName?: string;
    projectName?: string;
    title?: string;
    priority?: string;
    content?: string;
    email?: string;
    email_id?: string;
    duration_seconds?: number;
    call_status?: string;
  };
}

interface UpdatesActivityProps {
  activity: ExtendedActivity;
  leadExpandView?: boolean;
  allActivities?: ExtendedActivity[]; // Pass all activities to track same todo_id
  taskType?: string;
  currentOfferId?: string;
  leadId?: string;
  highlightEmailId?: string | null;
}

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

// Helper function to normalize activity message - remove duplicate "Re:" in the message
const normalizeActivityMessage = (message: string | undefined): string => {
  if (!message) return '';

  // Replace multiple "Re:" patterns with single "Re:"
  // This handles patterns like "Re: Re: Re:" or "Re: Re:" in the message
  let normalized = message;

  // Replace multiple consecutive "Re: " patterns with single "Re: "
  normalized = normalized.replace(/(Re:\s*){2,}/gi, 'Re: ');

  return normalized;
};

// Format ISO timestamps inside activity messages for readability
const formatDatesInMessage = (message: string): string => {
  if (!message) return '';
  const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g;

  return message.replace(isoDateRegex, (match) =>
    dateFormateUtils(match, DateFormatType.SHOW_DAY_MONTH)
  );
};

const UpdatesActivity: React.FC<UpdatesActivityProps> = ({
  activity,
  allActivities = [],
  leadExpandView = false,
  currentOfferId,
  leadId,
  highlightEmailId,
}) => {
  const queryClient = useQueryClient();
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const normalizeId = (value: any) => {
    if (!value) return null;
    if (typeof value === 'object') {
      return value._id || value.id || null;
    }
    return value;
  };
  const emailIdForActivity =
    normalizeId(activity?.metadata?.email_id) ||
    normalizeId(activity?.metadata?.email) ||
    normalizeId(activity?.metadata?.thread_id) ||
    normalizeId(activity?.metadata?.threadId) ||
    normalizeId(activity?.details?.email_id) ||
    normalizeId((activity as any)?.details?.thread_id) ||
    null;

  // Get the latest state for this todo_id across all activities
  const getTodoLatestState = (todoId: string) => {
    if (!todoId) return null;

    // If we don't have all activities, use the current activity's state
    if (!allActivities?.length) {
      return {
        isDeleted: false,
        isDone: activity?.metadata?.todo_was_done === true || activity?.type === 'task_completed',
        latestActivity: activity,
        isLatest: true,
        isFirstOccurrence: true,
      };
    }

    // Find all activities with the same todo_id
    const sameTodoActivities = allActivities?.filter(
      (act) =>
        act?.metadata?.todo_id === todoId &&
        (act?.type === 'task_pending' ||
          act?.type === 'task_in_progress' ||
          act?.type === 'task_completed')
    );

    if (sameTodoActivities?.length === 0) return null;

    // Sort by timestamp to get the latest activity (and find first occurrence)
    const sortedActivities = sameTodoActivities?.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Get first occurrence (earliest activity)
    const firstOccurrence = sortedActivities[sortedActivities?.length - 1];
    const latestActivity = sortedActivities[0];

    // Check if current activity is the first occurrence (creation)
    const isFirstOccurrence = firstOccurrence?.id === activity?.id;

    // Check if the todo was deleted
    const isDeleted = sameTodoActivities?.some(
      (act) =>
        act?.metadata?.action === 'deleted' ||
        act?.action === 'deleted' ||
        act?.metadata?.is_deleted === true
    );

    // Check if there are any update activities (task_in_progress or task_completed)
    const hasUpdates = sameTodoActivities?.some((act) => act?.type === 'task_in_progress');
    // Check if any activity shows the todo as done (marked via checkbox)
    const isMarkedDone = sameTodoActivities?.some((act) => act?.metadata?.todo_was_done === true);

    // Check if the latest activity shows the todo as done
    const isDone =
      latestActivity?.metadata?.todo_was_done === true ||
      latestActivity?.type === 'task_completed' ||
      hasUpdates ||
      isMarkedDone; // If any activity shows it's marked done, consider it done

    return {
      isDeleted,
      isDone,
      latestActivity,
      isLatest: latestActivity?.id === activity?.id,
      isFirstOccurrence,
      hasUpdates,
      isMarkedDone,
    };
  };

  useEffect(() => {
    if (!highlightEmailId || !emailIdForActivity) return;
    if (String(highlightEmailId) === String(emailIdForActivity)) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setExpandedEmailId(activity.id);
    }
  }, [activity.id, emailIdForActivity, highlightEmailId]);
  // Helper function to get activity icon based on type
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'lead_created':
        return <LeadsMenuIcon />;
      case 'stage_changed':
        return <ApolloIcon name="layer-group" />;
      case 'meeting_scheduled':
        return <ApolloIcon name="calendar" className="text-blue-100" />;
      case 'lead_assigned':
        return <ApolloIcon name="briefcase" />;
      case 'lead_updated':
        return <ApolloIcon name="user-check" />;
      case 'offer_transferred':
        return <OffersMenuIcon />;
      case 'note_added':
        return <ApolloIcon name="comment" />;
      case 'email_sent':
        return <ApolloIcon name="mail" />;
      case 'email_received':
        return <ApolloIcon name="mail-open" />;
      case 'email_assigned_to_lead':
        return <ApolloIcon name="mail" />;
      case 'task_created_from_email':
        return <ApolloIcon name="checklist" className="text-white" />;
      case 'call_inbound':
      case 'call_outbound':
      case 'call_missed':
        return <CallsMenuIcon />;
      case 'task_created':
        return <ApolloIcon name="checklist" className="text-white" />;
      case 'task_updated':
        return <ApolloIcon name="checklist" className="text-white" />;
      case 'task_transfer':
        return <ApolloIcon name="move" />;
      case 'subtask_created':
        return <ApolloIcon name="checklist" className="text-white" />;
      case 'subtask_updated':
        return <ApolloIcon name="checklist" className="text-white" />;
      case 'task_priority_updated':
        return <ApolloIcon name="flag" />;
      case 'task_pending':
      case 'task_in_progress':
      case 'task_completed':
        return <ApolloIcon name="checklist" className="text-white" />;
      default:
        return <ApolloIcon name="info-circle" />;
    }
  };

  // Helper function to get activity icon background color
  const getActivityIconBgColor = (type: ActivityType) => {
    switch (type) {
      case 'lead_created':
        return 'bg-evergreen';
      case 'stage_changed':
        return 'bg-ocean-2';
      case 'meeting_scheduled':
        return 'bg-blue-600';
      case 'lead_assigned':
        return 'bg-ocean-2';
      case 'lead_updated':
        return 'bg-ember';
      case 'offer_transferred':
        return 'bg-ocean-1';
      case 'note_added':
        return 'bg-tropic-2';
      case 'email_sent':
        return 'bg-ocean-2';
      case 'email_received':
        return 'bg-tropic-2';
      case 'email_assigned_to_lead':
        return 'bg-pebble-2';
      case 'task_created_from_email':
        return 'bg-sakura-2';
      case 'call_inbound':
        return 'bg-evergreen';
      case 'call_outbound':
        return 'bg-ocean-2';
      case 'call_missed':
        return 'bg-rust';
      case 'task_created':
        return 'bg-sakura-2';
      case 'task_updated':
        return 'bg-sakura-2';
      case 'task_transfer':
        return 'bg-ocean-1';
      case 'subtask_created':
        return 'bg-sakura-2';
      case 'subtask_updated':
        return 'bg-sakura-2';
      case 'task_priority_updated':
        return 'bg-rust';
      case 'task_pending':
        return 'bg-sakura-2';
      case 'task_in_progress':
        return 'bg-sakura-2';
      case 'task_completed':
        return 'bg-sakura-2';
      default:
        // return 'bg-gray-500'; // Old Tailwind color
        return 'bg-sand-2';
    }
  };

  // Format duration from seconds to minutes:seconds
  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Helper function to strip HTML tags from text
  const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    // Remove HTML tags
    let text = html.replace(/<[^>]+>/g, '');
    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    text = textarea.value;
    return text.trim();
  };

  const checkNotes = (message = '') => {
    const processedMessage = /\bnotes\b/i.test(message.split(/\sfrom/i)[0]?.trim())
      ? message.split(/\sfrom/i)[0].trim()
      : message;
    // Strip HTML tags from the message
    return stripHtmlTags(processedMessage);
  };

  // Helper: Convert snake_case to readable text
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

  const toggleTodo = async (id: string, isDone: boolean, leadId: string) => {
    try {
      await apiToggleTodoStatus(id, { isDone: !isDone });

      // Use the same comprehensive invalidation logic as useAssignTodo
      // 1) Invalidate only leads queries that include has_todo filter
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          const key1 = query.queryKey[1] as Record<string, unknown> | undefined | null;
          const hasTodoParam =
            key1 !== undefined &&
            key1 !== null &&
            typeof key1 === 'object' &&
            (key1 as any).has_todo === true;
          return key0 === 'leads' && hasTodoParam;
        },
      });

      // 2) Invalidate grouped leads queries (no removal, no explicit refetch)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          return key0 === 'grouped-leads' || key0 === 'group-leads';
        },
      });

      // 3) Invalidate todo-specific lists used by the Todo dashboard
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-todos'] });
      queryClient.invalidateQueries({ queryKey: ['extra-todos'] });

      // 4) Also invalidate basic leads queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // 5) Invalidate todo-specific queries
      queryClient.invalidateQueries({ queryKey: ['todo', id] });
      queryClient.invalidateQueries({ queryKey: ['todos', 'lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });

      // 6) Invalidate current user query to update totalPendingTodo count
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    } catch {
      // Error handled silently
    }
  };

  const deleteTodo = async (id: string, leadId: string) => {
    try {
      await apiDeleteTodo(id);

      // Use the same comprehensive invalidation logic as useAssignTodo
      // 1) Invalidate only leads queries that include has_todo filter
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          const key1 = query.queryKey[1] as Record<string, unknown> | undefined | null;
          const hasTodoParam =
            key1 !== undefined &&
            key1 !== null &&
            typeof key1 === 'object' &&
            (key1 as any).has_todo === true;
          return key0 === 'leads' && hasTodoParam;
        },
      });

      // 2) Invalidate grouped leads queries (no removal, no explicit refetch)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          return key0 === 'grouped-leads' || key0 === 'group-leads';
        },
      });

      // 3) Invalidate todo-specific lists used by the Todo dashboard
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-todos'] });
      queryClient.invalidateQueries({ queryKey: ['extra-todos'] });

      // 4) Also invalidate basic leads queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // 5) Invalidate todo-specific queries
      queryClient.invalidateQueries({ queryKey: ['todo', id] });
      queryClient.invalidateQueries({ queryKey: ['todos', 'lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });

      // 6) Invalidate current user query to update totalPendingTodo count
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    } catch {
      // Error handled silently
    }
  };
  // Format the type to be readable (convert snake_case to readable text)
  const rawType = extractString(
    activity?.metadata?.item_type || activity?.metadata?.action_type || activity?.action || ''
  );
  const type = rawType ? formatActionToReadable(rawType) : '';
  // if (activity?.type === 'offer_transferred') {
  //   console.log('activity', activity);
  // }
  return (
    <div className={`${leadExpandView ? 'mb-1 px-1' : ' bg-white px-0  '}`}>
      <div className="relative flex flex-col hover:shadow-[0_0_12px_rgba(0,0,0,0.14)] transition-all border-b border-border/50 hover:border-transparent">
        {/* Row 1: Icon + Title (actor - type) + Timestamp on right for email activities */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start">
            <div
              className={`mt-[2px] mr-1.5 flex h-5 p-1 w-5 shrink-0 items-center justify-center rounded-md ${getActivityIconBgColor(
                activity.type
              )} text-white`}
            >
              {getActivityIcon(activity?.type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center">
                <span className={`font-medium ${leadExpandView ? 'text-xs' : ''}`}>
                  {extractString(activity?.actor)}
                </span>
                {type && <span className="text-sm text-black">&nbsp;- {type}</span>}
              </div>
            </div>
          </div>
          {(activity?.type === 'email_sent' ||
            activity?.type === 'email_received' ||
            activity?.type === 'email_assigned_to_lead') && (
              <div
                className="flex shrink-0 cursor-pointer items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedEmailId(expandedEmailId === activity.id ? null : activity.id);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedEmailId(expandedEmailId === activity.id ? null : activity.id);
                  }
                }}
              >
                <time className="text-xs font-medium text-gray-500 whitespace-nowrap">
                  {extractString(activity?.timestamp)}
                </time>
                <ApolloIcon
                  name={expandedEmailId === activity.id ? 'dropdown-up-large' : 'dropdown-large'}
                  className="text-sm text-gray-400"
                />
              </div>
            )}
        </div>

        {/* Row 2: Content starts from left, just under the icon */}
        <div className="min-w-0 w-full">
          {/* Display the activity message if available */}
          {/* Skip message display for note_added activities since we show structured content below */}
          {/* Commented out for email activities - e.g. "Email reply sent: Re: Test From Ashik to ..." */}
          {activity?.message &&
            activity?.type !== 'note_added' &&
            activity?.type !== 'email_sent' &&
            activity?.type !== 'email_received' &&
            activity?.type !== 'email_assigned_to_lead' &&
            (() => {
              const msgStr = extractString(activity?.message);
              const text = formatDatesInMessage(checkNotes(normalizeActivityMessage(msgStr)));
              const isNoteUpdate = activity?.type === 'lead_updated' && /\bnotes\b/i.test(msgStr);
              return isNoteUpdate ? (
                <ExpandableText
                  text={text}
                  className={`break-all ${leadExpandView ? 'text-xs' : 'text-sm'}`}
                />
              ) : (
                <p className={`break-all ${leadExpandView ? 'text-xs' : 'text-sm'}`}>{text}</p>
              );
            })()}

          {/* Meeting scheduled activity */}
          {activity?.type === 'meeting_scheduled' && (
            <div className="">
              <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>Meeting scheduled</p>
            </div>
          )}

          {/* Stage changed activity */}
          {/* {activity?.type === 'stage_changed' && (
            <div className="">
              <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>Status changed</p>
              <ul className="ml-5 list-disc">
                <li className={`flex items-center ${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                  {extractString(activity?.details?.oldStage)}
                  <span className="mx-2">→</span>
                  <span className="text-blue-600">{extractString(activity?.details?.newStage)}</span>
                  <span className={`ml-1 text-gray-500 ${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                    (Status)
                  </span>
                </li>
              </ul>
            </div>
          )} */}

          {/* Lead created activity */}
          {activity?.type === 'lead_created' && (
            <div className="">
              <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                Lead/Opportunity created
              </p>
            </div>
          )}

          {/* Lead assigned activity */}
          {activity?.type === 'lead_assigned' && activity?.details?.lead && (
            <div className="">
              <div className="flex flex-col gap-1">
                <div className="flex items-center">
                  <span className={`mr-1 font-medium ${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                    Lead:
                  </span>
                  <span className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                    {extractString(activity?.details?.lead?.contact_name)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className={`mr-1 font-medium ${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                    Agent:
                  </span>
                  <span className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                    {extractString(activity?.details?.agentName || activity?.details?.agent?.login)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className={`mr-1 font-medium ${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                    Project:
                  </span>
                  <span className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                    {extractString(activity?.details?.projectName || activity?.details?.project?.name)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Note added activity */}
          {activity?.type === 'note_added' && activity?.details?.content && (
            <ExpandableText
              text={extractString(activity.details.content)}
              className={`break-all ${leadExpandView ? 'text-xs' : 'text-sm'}`}
            />
          )}

          {/* Email activities */}
          {(activity?.type === 'email_sent' ||
            activity?.type === 'email_received' ||
            activity?.type === 'email_assigned_to_lead') && (
              <div className="">
                {(() => {
                  const emailId = emailIdForActivity;
                  const isHighlightedEmail =
                    !!highlightEmailId && String(highlightEmailId) === String(emailId);

                  return emailId ? (
                    <EmailActivityCard
                      activity={activity}
                      expandedEmailId={expandedEmailId}
                      setExpandedEmailId={setExpandedEmailId}
                      leadExpandView={leadExpandView}
                      currentOfferId={currentOfferId}
                      currentLeadId={leadId}
                      customClassMerge={false}
                      highlightEmailId={highlightEmailId}
                      showHighlightWhenExpanded={isHighlightedEmail}
                    />
                  ) : (
                    // Fallback: Show basic email info if email_id is missing
                    <div className="">
                      <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                        {activity?.type === 'email_sent'
                          ? 'Email sent'
                          : activity?.type === 'email_assigned_to_lead'
                            ? 'Email assigned'
                            : 'Email received'}
                      </p>
                      {activity.details?.subject && (
                        <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                          Subject: {extractString(activity?.details?.subject)}
                        </p>
                      )}
                      {activity?.details?.email && (
                        <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                          {activity?.type === 'email_sent'
                            ? 'To: '
                            : activity?.type === 'email_assigned_to_lead'
                              ? 'To: '
                              : 'From: '}
                          {extractString(activity?.details?.email)}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

          {/* Call activities */}
          {(activity?.type === 'call_inbound' ||
            activity?.type === 'call_outbound' ||
            activity?.type === 'call_missed') && (
              <div className="">
                <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                  {activity?.type === 'call_inbound'
                    ? 'Incoming call'
                    : activity?.type === 'call_outbound'
                      ? 'Outgoing call'
                      : 'Missed call'}
                </p>
                {activity?.details?.duration_seconds !== undefined && (
                  <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                    Duration: {formatDuration(activity?.details?.duration_seconds)}
                  </p>
                )}
                {activity?.details?.call_status && (
                  <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                    Status: {extractString(activity?.details?.call_status)}
                  </p>
                )}
              </div>
            )}

          {/* To Do Task activities */}
          {(activity?.type === 'task_pending' ||
            activity?.type === 'task_in_progress' ||
            activity?.type === 'task_completed') &&
            activity?.metadata?.todo_id &&
            (() => {
              const todoState = getTodoLatestState(activity?.metadata?.todo_id);

              // If todo is deleted, don't show this activity
              if (todoState?.isDeleted) {
                return null;
              }

              // If there are ANY updates OR it's marked done, show ALL activities as completed
              if (todoState?.hasUpdates || todoState?.isMarkedDone) {
                return (
                  <div className="">
                    <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                      Task completed:{' '}
                      <span className="font-medium">{extractString(activity?.details?.title)}</span>
                    </p>
                    {activity?.details?.content && (
                      <p
                        className={`break-all text-gray-600 italic ${leadExpandView ? 'text-xs' : 'text-sm'}`}
                      >
                        {extractString(activity?.details?.content)}
                      </p>
                    )}
                  </div>
                );
              }

              // Show interactive todo ONLY for first occurrence with NO updates AND not marked done
              if (
                todoState?.isFirstOccurrence &&
                !todoState?.hasUpdates &&
                !todoState?.isMarkedDone &&
                activity.type === 'task_pending'
              ) {
                return (
                  <div className="mt-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={false} // Always false since we know it's not done
                          onChange={() =>
                            toggleTodo(
                              activity?.metadata?.todo_id,
                              false, // Pass false since we know it's not done
                              activity?.metadata?.lead_id
                            )
                          }
                          className="shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-medium text-gray-900 ${leadExpandView ? 'text-xs' : 'text-sm'}`}
                            >
                              {extractString(activity?.details?.title)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="bg-pebble-3 text-pebble-1 rounded-md px-2 py-1 text-xs font-medium">
                                {/* Old classes: bg-amber-100 text-amber-700 */}
                                Pending
                              </span>
                              <Button
                                variant="plain"
                                size="xs"
                                icon={<ApolloIcon name="trash" />}
                                onClick={() =>
                                  deleteTodo(
                                    activity?.metadata?.todo_id,
                                    activity?.metadata?.lead_id
                                  )
                                }
                                className="text-rust hover:text-rust-600"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Fallback - show as completed
              return (
                <div className="">
                  <p className={`${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                    Task completed: <span className="font-medium">{extractString(activity?.details?.title)}</span>
                  </p>
                  {activity?.details?.content && (
                    <p className={`text-gray-600 italic ${leadExpandView ? 'text-xs' : 'text-sm'}`}>
                      {extractString(activity?.details?.content)}
                    </p>
                  )}
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  );
};

export default UpdatesActivity;
