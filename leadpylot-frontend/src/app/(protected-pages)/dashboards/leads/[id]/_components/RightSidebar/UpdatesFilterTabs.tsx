import Tabs from '@/components/ui/Tabs';
import { useEffect, useState } from 'react';
import UpdatesTab from './UpdatesTab';
import FilterTabsHeader from './FilterTabsHeader';
import { LeadbotTab } from '@/components/leadbot/LeadbotTab';
import { EmailConversation } from '@/app/(protected-pages)/dashboards/mails/_types/email.types';
import { useOptionalLeadDetailsBulkActions } from '../v2/LeadDetailsBulkActionsContext';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { LEAD_TABLE_NAMES } from '../v2/LeadDetailsBulkActionsContext';
import { BulkSlotPinningMenu } from '../v2/BulkSlotPinningMenu';

export type FilterType = 'all' | 'status' | 'email' | 'tickets' | 'calls' | 'todos' | 'comments' | 'leadbot';
export type TaskType = 'lead' | 'offer' | 'opening' | 'email' | 'custom' | 'kanban';
interface UpdatesFilterTabsProps {
  leadId: string | undefined;
  leadExpandView?: boolean;
  conversation?: EmailConversation | null;
  taskType: string;
  currentOfferId?: string;
  offerId?: string;
  openingId?: string;
  forcedFilter?: FilterType;
  highlightEmailId?: string | null;
  propsClassName?: string;
}

export default function UpdatesFilterTabs({
  leadId,
  leadExpandView,
  conversation,
  taskType,
  currentOfferId,
  offerId,
  openingId,
  forcedFilter,
  highlightEmailId,
  propsClassName,
  // height,
  // showCreateTaskButton,
  // showCreateTicket,
}: UpdatesFilterTabsProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>(forcedFilter || 'all');
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const getCurrentPage = useSelectedItemsStore((s) => s.getCurrentPage);
  const currentPage = getCurrentPage();
  const bulkCtx = useOptionalLeadDetailsBulkActions();
  const pinPayload =
    bulkCtx &&
    (currentPage === LEAD_TABLE_NAMES.OFFERS || currentPage === LEAD_TABLE_NAMES.OPENINGS)
      ? bulkCtx.getPinToSlotPayload(currentPage)
      : null;
  const showPinToSlot = !!bulkCtx?.config.showPinToSlot && !!pinPayload;

  useEffect(() => {
    if (!forcedFilter) return;
    setActiveFilter(forcedFilter);
  }, [forcedFilter]);

  const handleFilterChange = (tabValue: string) => {
    setActiveFilter(tabValue as FilterType);
  };

  const handleClearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveFilter('all');
  };

  const handleToggleNotes = () => {
    setIsNotesOpen((prev) => !prev);
  };

  const handleCloseNotes = () => {
    setIsNotesOpen(false);
  };

  return (
    <Tabs value={activeFilter} onChange={handleFilterChange} className="flex h-full flex-col px-2 pb-2">
      {showPinToSlot && pinPayload && (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-2 py-2">
          <BulkSlotPinningMenu
            offerIds={pinPayload.offerIds}
            documentIds={pinPayload.documentIds}
            onSuccess={bulkCtx.onPinToSlotSuccess}
            title="Pin to Slot"
          />
          <span className="text-muted-foreground text-xs">
            {pinPayload.offerIds.length} item{pinPayload.offerIds.length !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}
      <FilterTabsHeader
        activeFilter={activeFilter}
        onClearFilter={handleClearFilter}
        isNotesOpen={isNotesOpen}
        onToggleNotes={handleToggleNotes}
        leadExpandView={leadExpandView}
        leadId={leadId}
        taskType={taskType}
        offerId={offerId}
        openingId={openingId}
        propsClassName={propsClassName}
      />

      {/* Tab Content */}
      <Tabs.TabContent value={activeFilter} className="min-h-0 flex-1 overflow-hidden">
        {activeFilter === 'leadbot' ? (
          <LeadbotTab leadId={leadId} leadExpandView={leadExpandView} />
        ) : (
          <UpdatesTab
            leadId={leadId}
            leadExpandView={leadExpandView}
            filterType={activeFilter}
            conversation={conversation}
            taskType={taskType}
            currentOfferId={currentOfferId}
            highlightEmailId={highlightEmailId}
            isNotesOpen={isNotesOpen}
            onCloseNotes={handleCloseNotes}
            // showCreateTaskButton={showCreateTaskButton}
            // showCreateTicket={showCreateTicket}
          />
        )}
      </Tabs.TabContent>
    </Tabs>
  );
}
