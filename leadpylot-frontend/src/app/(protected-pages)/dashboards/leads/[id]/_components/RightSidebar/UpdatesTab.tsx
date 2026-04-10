import { EmailConversation } from '@/app/(protected-pages)/dashboards/mails/_types/email.types';
import RichTextEditor from '@/components/shared/RichTextEditor';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import ApolloIcon from '@/components/ui/ApolloIcon';
import CloseButton from '@/components/ui/CloseButton';
// import { useCreateTaskFromEmail } from '@/services/hooks/useToDo';
import { useEffect, useMemo, useRef, useState } from 'react';
import UpdatesActivitySkeleton from '../UpdatesActivitySkeleton';
import UpdatesActivity from '../UpdatesActivity';
import { ActivitySkeletonByFilter } from './skeletons';
import { useActivities } from './useActivities';
import { useNotes } from './useNotes';

interface UpdatesTabProps {
  leadId: string | undefined;
  leadExpandView?: boolean;
  filterType?: any;
  conversation?: EmailConversation | null;
  taskType?: string;
  currentOfferId?: string;
  highlightEmailId?: string | null;
  isNotesOpen?: boolean;
  onCloseNotes?: () => void;
}

const UpdatesTab = ({
  leadId,
  leadExpandView,
  filterType = 'all',
  conversation,
  taskType,
  currentOfferId,
  highlightEmailId,
  isNotesOpen = false,
  onCloseNotes,
}: UpdatesTabProps) => {
  const rRef = useRef(null);
  const [activeTab, setActiveTab] = useState<string>('notes');
  const [viewState, setViewState] = useState<'table' | 'details' | 'form'>('table');

  // const transferEmailMutation = useCreateTaskFromEmail(conversation?._id || '', leadId);
  const {
    groupedActivities,
    activitiesError,
    activitiesLoading,
    hasNextPage,
    isFetchingNextPage,
    loadMoreRef,
  } = useActivities(leadId, leadExpandView, filterType);

  // Flatten all activities from all dates for cascading logic
  const allActivities = useMemo(() => {
    return Object.values(groupedActivities).flat();
  }, [groupedActivities]);

  // Get empty state message based on filter type
  const getEmptyStateMessage = () => {
    switch (filterType) {
      case 'tickets':
        return 'No tickets found';
      case 'status':
        return 'No status changes found';
      case 'email':
        return 'No mails found';
      case 'comments':
        return 'No Comments found';
      default:
        return 'No activities found';
    }
  };

  // Check if there are no activities (not loading and no grouped activities)
  const hasNoActivities = !activitiesLoading && Object.keys(groupedActivities).length === 0;

  const {
    leadStatus,
    updateLeadMutation,
    handleSaveNotes,
    handleNotesChange,
    hasChanges,
    editorContent,
  } = useNotes(leadId);

  const showNotesPanel = leadExpandView ? true : isNotesOpen;
  useEffect(() => {
    if (showNotesPanel && activeTab !== 'notes') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('notes');
    }
  }, [showNotesPanel, activeTab, setActiveTab]);

  return (
    <div
      className={`relative ${leadExpandView ? 'grid h-12 grid-cols-2 gap-2' : 'flex h-full min-h-0 flex-col'}`}
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Notes dropdown */}
        <div
          id="lead-notes-panel"
          className={`transition-[max-height,opacity] duration-300 ease-in-out will-change-[max-height] ${
            leadExpandView ? '' : 'min-h-0'
          } ${
            leadExpandView
              ? 'mb-2 max-h-[70%] overflow-hidden opacity-100'
              : showNotesPanel
                ? 'absolute top-0 right-0 left-0 z-30 max-h-[70%] overflow-hidden opacity-100'
                : 'pointer-events-none absolute top-0 right-0 left-0 z-30 max-h-0 overflow-hidden opacity-0'
          }`}
        >
          <div className="rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-sm font-medium">Notes</p>
              {!leadExpandView && onCloseNotes && (
                <CloseButton aria-label="Close notes" onClick={onCloseNotes} />
              )}
            </div>
            <Tabs value={activeTab} onChange={setActiveTab} defaultValue="notes" className="w-full">
              <Tabs.TabContent value="notes">
                <div className="animate-in fade-in slide-in-from-top-1 px-3 pb-2 duration-300">
                  <RichTextEditor
                    ref={rRef}
                    placeholder="Add a note"
                    onChange={handleNotesChange}
                    content={editorContent}
                    editorContentClass={`overflow-auto p-0 ${leadExpandView ? 'h-20' : 'h-30'}`}
                    disabled={leadStatus !== 'success'}
                    {...(leadExpandView ? { customToolBar: () => null } : {})}
                  />
                </div>
              </Tabs.TabContent>
            </Tabs>
            <div className="px-3 pb-3">
              {activeTab === 'notes' && (
                <Button
                  variant="solid"
                  size={'xs'}
                  icon={<ApolloIcon name="pen" />}
                  loading={updateLeadMutation.isPending}
                  onClick={() =>
                    handleSaveNotes(onCloseNotes ? { onSuccess: onCloseNotes } : undefined)
                  }
                  disabled={!hasChanges || leadStatus !== 'success'}
                >
                  Save Note
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Updates section */}
        <div className={`overflow-auto ${leadExpandView ? 'max-h-min' : 'min-h-0'} flex-1`}>
          {activitiesError && (
            <div className="p-6 text-center">
              <p className="text-rust text-sm">Error loading activities</p>
            </div>
          )}
          {activitiesLoading && filterType !== 'all' && (
            <ActivitySkeletonByFilter filterType={filterType} leadExpandView={leadExpandView} />
          )}
          {!activitiesLoading && hasNoActivities && (
            <div className="p-1 text-start">
              <p className="text-sm text-gray-500">{getEmptyStateMessage()}</p>
            </div>
          )}
          {!activitiesLoading &&
            Object.entries(groupedActivities).map(([date, activities]) => (
              <div key={date}>
                <div className="relative text-center">
                  <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-gray-400" />
                  <span
                    className={`relative bg-white px-2 text-gray-500 ${leadExpandView ? 'text-[8px]' : 'text-sm'}`}
                  >
                    {date} -{' '}
                    {typeof activities[0]?.timestamp === 'string'
                      ? activities[0].timestamp
                      : String(activities[0]?.timestamp ?? '')}
                  </span>
                </div>
                {activities?.length > 0 &&
                  activities.map((activity, index) => (
                    <UpdatesActivity
                      key={`${activity.id}-${index}`}
                      activity={activity}
                      allActivities={allActivities}
                      leadExpandView={leadExpandView}
                      currentOfferId={currentOfferId}
                      leadId={leadId}
                      highlightEmailId={highlightEmailId}
                    />
                  ))}
              </div>
            ))}

          {/* Load more trigger element */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="py-4 text-center">
              {isFetchingNextPage && <UpdatesActivitySkeleton />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdatesTab;
