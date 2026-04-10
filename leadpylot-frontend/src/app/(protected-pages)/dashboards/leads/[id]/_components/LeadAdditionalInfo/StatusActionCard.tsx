import { useState } from 'react';
import Card from '@/components/ui/Card';
import { TLead } from '@/services/LeadsService';
import NegativeStatusButtons from '../NegativeStatusButtons';
import PositiveStatusButtons from '../PositiveStatusButtons';
import CallScheduleDialog from '@/components/shared/CallScheduleDialog';
import AppointmentDialog from './AppointmentDialog';
import AddMeetingDialog from '@/app/(protected-pages)/dashboards/meetings/_components/AddMeetingDialog';
import { useAppointmentDialogStore } from '@/stores/appointmentDialogStore';
import { CallScheduleData } from '@/components/shared/CallScheduleDialog';

interface StatusActionCardProps {
  lead: TLead;
  onOfferClick?: () => void;
  onReclamationClick?: () => void;
  onStatusClick: (data: CallScheduleData) => void;
  onNegativeStatusClick: (data: { stage_id: string; status_id: string }) => void;
  leadExpandView?: boolean;
}

const StatusActionCard = ({
  lead,
  onOfferClick,
  onReclamationClick,
  // onTransferClick,
  onStatusClick,
  onNegativeStatusClick,
  leadExpandView = false,
}: StatusActionCardProps) => {
  const [isCallScheduleDialogOpen, setIsCallScheduleDialogOpen] = useState(false);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const { openCreateDialog } = useAppointmentDialogStore();

  const handleCallSchedule = async (data: CallScheduleData) => {
    try {
      onStatusClick(data);
    } catch (error) {
      // Error handling can be added here if needed
      console.log(error);
    }
  };

  const handleMeetingClick = () => {
    setIsMeetingDialogOpen(true);
  };

  const handleAppointmentClick = () => {
    const leadId = typeof lead._id === 'number' ? String(lead._id) : lead._id;
    openCreateDialog(leadId);
  };

  const handleMeetingAdded = () => {
    // Callback after meeting is added successfully
    setIsMeetingDialogOpen(false);
  };
  return (
    <Card className="h-auto" bodyClass=" rounded-lg px-3 py-2 justify-start">
      {/* Action Buttons */}
      <div className="">
        {/* Positiv Section */}
        <PositiveStatusButtons
          onStatusClick={onStatusClick as any}
          onOfferClick={onOfferClick}
          onMeetingClick={handleMeetingClick}
          onAppointmentClick={handleAppointmentClick}
          onCallScheduleClick={() => setIsCallScheduleDialogOpen(true)}
          // onTransferClick={onTransferClick}
          lead={lead}
          leadExpandView={leadExpandView}
        />

        {/* Negativ Section */}
        <div className="space-y-0.5 2xl:space-y-1">
          <p className="w-24 font-bold">Negativ</p>
          <NegativeStatusButtons
            onStatusClick={onNegativeStatusClick}
            onReclamationClick={onReclamationClick}
            lead={lead}
            leadExpandView={leadExpandView}
          />
        </div>
      </div>

      {/* Call Schedule Dialog */}
      <CallScheduleDialog
        isOpen={isCallScheduleDialogOpen}
        onClose={() => setIsCallScheduleDialogOpen(false)}
        lead={lead}
        onSchedule={handleCallSchedule}
      />

      {/* Meeting Dialog */}
      <AddMeetingDialog
        isOpen={isMeetingDialogOpen}
        onClose={() => setIsMeetingDialogOpen(false)}
        lead={lead}
        onAddMeeting={handleMeetingAdded}
      />

      {/* Appointment Dialog - Now managed by Zustand store */}
      <AppointmentDialog />
    </Card>
  );
};

export default StatusActionCard;
