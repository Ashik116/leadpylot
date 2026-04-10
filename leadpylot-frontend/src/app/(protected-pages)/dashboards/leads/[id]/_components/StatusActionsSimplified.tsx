import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { TLead } from '@/services/LeadsService';
import { useStatusActions } from './hooks/useStatusActions';
import { useWiedervorlage } from './hooks/useWiedervorlage';
import { useLeadProjectAgent } from './hooks/useLeadProjectAgent';
import { useAppointmentDialogStore } from '@/stores/appointmentDialogStore';
import OfferCallCounter from '../../../_components/OfferCallCounter';
import TicketModal from './TicketModal';
import { offerCallShowStatus } from '@/utils/utils';
import LeadAssignOrTransformButton from './LeadDetails/components/LeadAssignOrTransformButton';
import LeadDeleteButton from './LeadDetails/components/LeadDeleteButton';
import WiedervorlageButton from './LeadDetails/components/WiedervorlageButton';
import OutButton from './LeadDetails/components/OutButton';
import ReclamationButton from './LeadDetails/components/ReclamationButton';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface StatusActionsSimplifiedProps {
  lead: TLead;
  onOfferClick?: () => void;
  onReclamationClick?: () => void;
  disableAllButtons?: boolean;
  allStatus?: any; // Status options for dropdown
  todos?: any;
  offers?: any;
  assignment?: any;
  onStatusClick?: (stageId: string, statusId: string) => void;
  leadId?: string;
  onDelete?: () => void;
}

const StatusActionsSimplified = ({
  lead,
  onOfferClick,
  onReclamationClick,
  disableAllButtons = false,
  todos,
  assignment,
  onStatusClick,
  leadId,
  onDelete,
}: StatusActionsSimplifiedProps) => {
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const { handleOffer, handleReclamation, handleOut, isLoading, hasOutStatus, hasTerminStatus } =
    useStatusActions({ onOfferClick, onReclamationClick, onStatusClick });

  const {
    handleWiedervorlage,
    isDisabled: isWiedervorlageDisabled,
    wiedervorlageTooltip,
  } = useWiedervorlage({
    lead,
  });

  const { isOfferDisabled } = useLeadProjectAgent(lead);

  const { openCreateDialog } = useAppointmentDialogStore();

  const handleAppointmentClick = () => {
    openCreateDialog(lead._id || lead._id.toString());
  };

  const hasOfferActive = lead?.offers?.every((offer: any) => offer.active === true);

  const hasOffers =
    (lead?.offers?.length || 0) > 0 &&
    hasOfferActive &&
    offerCallShowStatus.some(
      (status: string) => status.toLowerCase() === (lead?.status?.name?.toLowerCase() || '')
    );

  if (isLoading) {
    return (
      <>
        <Card className="h-auto" bodyClass="rounded-lg px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={`skeleton-${index}`} className="h-10 w-28 rounded" />
            ))}
          </div>
        </Card>
      </>
    );
  }

  return (
    <Card className="h-auto border-none" bodyClass="rounded-lg  py-2">
      <div className="space-y-2">
        <div className="flex items-center gap-6">
          <h6>Lead Status</h6>
        </div>
        <div className="flex flex-wrap gap-2">
          <LeadAssignOrTransformButton assignment={assignment} lead={lead} leadId={leadId} />
          {onDelete && <LeadDeleteButton onDelete={onDelete} lead={lead} />}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOffer}
            disabled={isOfferDisabled}
            className="bg-evergreen hover:bg-evergreen/80 border-transparent text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            icon={<ApolloIcon name="file" />}
            title={isOfferDisabled ? 'Offer requires both project and agent assignment' : undefined}
          >
            Offer
          </Button>
          {hasOffers ? (
            <div className="flex items-center gap-2">
              <OfferCallCounter
                hidePlusBtn={true}
                offerCalls={lead?.offer_calls || 0}
                leadId={lead?._id}
                showNEButton
              />
            </div>
          ) : (
            <WiedervorlageButton
              onClick={handleWiedervorlage}
              disabled={isWiedervorlageDisabled || disableAllButtons}
              tooltipTitle={wiedervorlageTooltip}
            />
          )}
          {hasTerminStatus && (
            <Button
              variant="default"
              size="sm"
              onClick={handleAppointmentClick}
              className="bg-termin hover:bg-termin/80 border-transparent text-white"
              icon={<ApolloIcon name="calendar" />}
            >
              Termin
            </Button>
          )}
          {hasOutStatus && <OutButton onClick={handleOut} disabled={disableAllButtons} />}
          <ReclamationButton
            onClick={handleReclamation}
            disabled={lead?.reclamation_status === 'pending' || disableAllButtons}
          />{' '}
          {/* <Button
            variant="success"
            size="sm"
            onClick={() => setIsTicketModalOpen(true)}
            icon={<ApolloIcon name="plus" />}
            disabled={disableAllButtons}
          >
            Create Task
          </Button> */}
          {/* {hasHoldStatus && (
            <Button
              variant="default"
              size="sm"
              onClick={handleAppointmentClick}
              className="bg-sunbeam-1 hover:bg-sunbeam-1/80 border-transparent text-gray-700"
              icon={<ApolloIcon name="pause" />}
              disabled={disableAllButtons}
            >
              Hold
            </Button>
          )} */}
        </div>
      </div>

      {/* Ticket Modal */}
      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        leadId={lead._id}
        offers={lead?.offers || []}
        lead={lead}
        taskType="lead"
      />
    </Card>
  );
};

export default StatusActionsSimplified;
