'use client';

import { useState } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dialog from '@/components/ui/Dialog';
import Tooltip from '@/components/ui/Tooltip';
import { useTasksByEntity } from '@/services/hooks/useTasksByEntity';
import { CreateTicketWrapper } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/CreateTicketWrapper';

const TASKS_COUNTER_TOOLTIP =
  'Tasks: the number is how many tasks are linked to this lead (same scope as the Tasks tab). Click here to open the task list, view details, and update them. Use the + button next to this counter in the header to add a new task without leaving the lead.';

interface TicketCounterProps {
  leadId: string | undefined;
  emailId?: string;
  offerId?: string;
  openingId?: string;
}

const TicketCounter = ({ leadId, emailId, offerId, openingId }: TicketCounterProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewState, setViewState] = useState<'table' | 'details' | 'form'>('table');

  const { data } = useTasksByEntity(
    {
      lead_id: !emailId && !offerId && !openingId ? leadId : undefined,
      email_id: emailId,
      offer_id: offerId,
      opening_id: openingId,
      page: 1,
      limit: 1,
    },
    !!leadId || !!emailId || !!offerId || !!openingId
  );

  const totalTasks = data?.meta?.total ?? 0;

  const handleCounterClick = () => {
    if (leadId) {
      setViewState('table');
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Tooltip
        title={TASKS_COUNTER_TOOLTIP}
        placement="top"
        wrapperClass="inline-flex"
        className="max-w-sm! text-xs leading-snug"
      >
        <button
          type="button"
          onClick={handleCounterClick}
          className="flex cursor-pointer items-center justify-between hover:opacity-80"
          aria-label={`${totalTasks} tasks. Click to view list.`}
        >
          <ApolloIcon name="checklist" className="text-sakura-2" />
          <p className="hidden text-sm lg:flex">Tasks : </p>
          <span className="bg-evergreen/10 text-evergreen ml-1 rounded-md px-2 text-sm">
            {totalTasks}
          </span>
        </button>
      </Tooltip>

      {leadId && (
        <Dialog isOpen={isModalOpen} onClose={handleModalClose} width={900}>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <h6 className="font-semibold">Tasks</h6>
            </div>
            <div className="flex max-h-[80vh] flex-col overflow-hidden">
              <CreateTicketWrapper
                leadId={leadId}
                viewState={viewState}
                onViewStateChange={setViewState}
                emailId={emailId}
              />
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
};

export default TicketCounter;
