import Card from '@/components/ui/Card';

import { useParams, useSearchParams } from 'next/navigation';

import UpdatesFilterTabs, { TaskType } from './RightSidebar/UpdatesFilterTabs';

export type FilterType = 'all' | 'status' | 'email' | 'tickets' | 'calls' | 'todos';

export default function RightSidebar({
  leadExpandView,
  singleLeadId,
  taskType = 'lead',
  currentOfferId,
  offerId,
  openingId,
  propsClassName,
  forcedFilter,
  highlightEmailId,
}: {
  leadExpandView?: boolean;
  singleLeadId?: string;
  taskType?: TaskType;
  currentOfferId?: string;
  offerId?: string;
  openingId?: string;
  propsClassName?: string;
  forcedFilter?: FilterType;
  highlightEmailId?: string;
}) {
  const { id } = useParams();
  const leadId = id?.toString() || singleLeadId;
  const searchParams = useSearchParams();
  const tabTypeParam = (searchParams.get('tabType') || '').toLowerCase();
  const emailIdParam = searchParams.get('emailId');
  const isEmailTab = tabTypeParam === 'email' || tabTypeParam === 'emails' || tabTypeParam === 'mail';
  const shouldApplyEmailHighlight = isEmailTab && !!emailIdParam;
  const resolvedForcedFilter = forcedFilter || (shouldApplyEmailHighlight ? 'email' : undefined);
  const resolvedHighlightEmailId = highlightEmailId || (shouldApplyEmailHighlight ? emailIdParam : undefined);

  return (
    <Card
      className="flex h-full min-h-0 flex-col overflow-hidden"
      bodyClass="flex h-full min-h-0 flex-col overflow-hidden p-0"
    >
      <UpdatesFilterTabs
        leadId={leadId}
        leadExpandView={leadExpandView}
        taskType={taskType || 'lead'}
        currentOfferId={currentOfferId}
        offerId={offerId}
        openingId={openingId}
        propsClassName={propsClassName}
        forcedFilter={resolvedForcedFilter}
        highlightEmailId={resolvedHighlightEmailId}
      />
    </Card>
  );
}
