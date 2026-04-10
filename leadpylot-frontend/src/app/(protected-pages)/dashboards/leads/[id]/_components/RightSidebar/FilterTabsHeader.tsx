import Button from '@/components/ui/Button';
import React from 'react';
// import { Plus } from 'lucide-react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tabs from '@/components/ui/Tabs';
// import { useCreateTaskPopoverStore } from '@/stores/createTaskPopoverStore';
import { FilterType } from './UpdatesFilterTabs';
// import CreateTaskPopover from '@/components/shared/CreateTaskPopover/CreateTaskPopover';

const filterTabs: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  //   { value: 'leadbot', label: 'Leadbot' },
  { value: 'status', label: 'Status' },
  { value: 'email', label: 'Email' },
  { value: 'tickets', label: 'Tasks' },
  { value: 'comments', label: 'Comments' },
];

interface FilterTabsHeaderProps {
  activeFilter: FilterType;
  onClearFilter: (e: React.MouseEvent) => void;
  isNotesOpen: boolean;
  onToggleNotes: () => void;
  leadExpandView?: boolean;
  leadId?: string;
  taskType?: string;
  offerId?: string;
  openingId?: string;
  showInDialog?: boolean;
  propsClassName?: string;
}

export default function FilterTabsHeader({
  activeFilter,
  onClearFilter,
  isNotesOpen,
  onToggleNotes,
  leadExpandView,
  leadId,
  taskType = 'lead',
  offerId,
  openingId,
  propsClassName,
}: FilterTabsHeaderProps) {
  //   const openCreateTaskPopover = useCreateTaskPopoverStore((s) => s.open);

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 lg:mt-3 xl:mt-0">
      <h6>Updates</h6>

      {/* Filter Tabs */}
      <Tabs.TabList className="flex-1 border-0">
        {filterTabs?.length > 0 &&
          filterTabs?.map((tab) => (
            <React.Fragment key={tab.value}>
              <Tabs.TabNav className={`relative text-xs font-medium md:text-sm`} value={tab.value}>
                {tab.label}
              </Tabs.TabNav>
              {/* Plus button of the task tab - commented out
              {tab.value === 'tickets' && leadId && !leadExpandView && (
                <div className="-ml-2 flex shrink-0 items-center">
                  <CreateTaskPopover
                    leadId={leadId}
                    taskType={taskType}
                    offerId={offerId}
                    openingId={openingId}
                  />
                </div>
              )}
              */}
            </React.Fragment>
          ))}
      </Tabs.TabList>

      {!leadExpandView && (
        <Button
          variant="solid"
          size="xs"
          icon={<ApolloIcon name={isNotesOpen ? 'minus' : 'plus'} />}
          className={`${propsClassName || ''}`}
          aria-expanded={isNotesOpen}
          aria-controls="lead-notes-panel"
          onClick={onToggleNotes}
        >
          {isNotesOpen ? 'Hide Notes' : 'Add Notes'}
        </Button>
      )}
    </div>
  );
}
