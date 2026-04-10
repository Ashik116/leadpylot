'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Popover from '@/components/ui/Popover';
import Tooltip from '@/components/ui/Tooltip';
import MettingTableLeadDetails from './MettingTableLeadDetails';
import AppointmentDialog from '../AppointmentDialog';

import { useAppointmentDialogStore } from '@/stores/appointmentDialogStore';
import { Appointment } from '@/hooks/useAppointments';
import { useStatusActions } from '../../hooks/useStatusActions';

const TERMIN_COUNTER_TOOLTIP =
  'Termin: the number is how many appointments (Termin) are stored for this lead. Click here to open the full list and manage them. Use the + button to schedule a new appointment in place without leaving the page.';

const TERMIN_PLUS_TOOLTIP =
  'Add Termin (+): opens an inline form in a popover to schedule a new appointment for this lead on this page. Submit to save; the counter updates after the list refreshes.';

interface TerminCounterProps {
  leadId: string;
  appointments: Appointment[];
}

const TerminCounter = ({ leadId, appointments }: TerminCounterProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  useStatusActions({});
  const { openCreateDialog } = useAppointmentDialogStore();

  const handleTerminClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleCreateAppointment = () => {
    openCreateDialog(leadId);
  };

  const handleCreateSuccess = () => {
    setIsCreateDropdownOpen(false);
  };

  const totalAppointments = appointments?.length || 0;

  return (
    <>
      <div className="flex items-center gap-1">
        <Tooltip
          title={TERMIN_COUNTER_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className="max-w-sm! text-xs leading-snug"
        >
          <button
            type="button"
            onClick={handleTerminClick}
            className="flex cursor-pointer items-center justify-between gap-0 hover:opacity-80 lg:gap-1"
          >
            <ApolloIcon name="calendar" className="text-blue-600" />
            <p className="hidden text-sm lg:flex">Termin : </p>
            <span className="ml-1 rounded-md bg-blue-100 px-2 text-sm text-blue-700">
              {totalAppointments}
            </span>
          </button>
        </Tooltip>
        <Popover
          placement="bottom-end"
          isOpen={isCreateDropdownOpen}
          onOpenChange={setIsCreateDropdownOpen}
          content={
            <div className="min-w-[320px]">
              <AppointmentDialog
                leadId={leadId}
                onSuccess={handleCreateSuccess}
                onClose={() => setIsCreateDropdownOpen(false)}
              />
            </div>
          }
          className="min-w-[320px] !overflow-visible"
        >
          <span className="inline-flex">
            <Tooltip
              title={TERMIN_PLUS_TOOLTIP}
              placement="top"
              wrapperClass="inline-flex"
              className="max-w-sm! text-xs leading-snug"
            >
              <Button
                variant="default"
                size="xs"
                className="h-5 w-5 shrink-0 rounded-md"
                aria-label="Create Termin"
                icon={<Plus className="h-4 w-4" />}
              />
            </Tooltip>
          </span>
        </Popover>
      </div>

      <Dialog isOpen={isModalOpen} onClose={handleModalClose} width={1000}>
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <h6 className="font-semibold">Termin</h6>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            <MettingTableLeadDetails
              leadId={leadId}
              leftAction={
                <Button
                  variant="solid"
                  size="xs"
                  onClick={handleCreateAppointment}
                  icon={<ApolloIcon name="calendar" />}
                  className="bg-termin hover:bg-termin/80 mr-8 border-transparent text-white"
                >
                  Create Termin
                </Button>
              }
            />
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default TerminCounter;
