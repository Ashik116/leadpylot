import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { TLead } from '@/services/LeadsService';
import classNames from '@/utils/classNames';
import { getStatusBadgeColor } from '@/utils/utils';
import { usePositivStage, useStagesLoading, useStagesError } from '@/stores/stagesStore';

interface PositiveStatusButtonsProps {
  onStatusClick: (stageId: string, statusId: string) => void;
  onOfferClick?: () => void;
  onMeetingClick?: () => void;
  onCallScheduleClick?: () => void;
  onAppointmentClick?: () => void;
  lead: TLead;
  leadExpandView?: boolean;
}

// Helper function to get the appropriate icon for each option
function getIconForOption(optionId: string) {
  const iconMap = {
    termin: 'calendar',
    angebot: 'file',
    opening: 'folder-plus',
    reclamation: 'user-times',
    call: 'phone',
    transfer: 'exchange',
  } as const;
  type OptionId = keyof typeof iconMap;
  return optionId in iconMap ? <ApolloIcon name={iconMap[optionId as OptionId]} /> : null;
}

const PositiveStatusButtons = ({
  onStatusClick,
  onOfferClick,
  onMeetingClick,
  onCallScheduleClick,
  onAppointmentClick,
  leadExpandView = false,
}: PositiveStatusButtonsProps) => {
  // Read from global store (already initialized in PostLoginLayout)
  const positiveStage = usePositivStage();
  const isLoading = useStagesLoading();
  const error = useStagesError();

  if (isLoading) {
    return (
      <div className={`grid ${leadExpandView ? 'grid-cols-2 gap-1' : 'grid-cols-4 gap-2'}`}>
        {Array.from({ length: 4 })?.map((_, index) => (
          <Skeleton key={`skeleton-positive-${index}`} className="h-8 flex-1 rounded" />
        ))}
      </div>
    );
  }

  if (error || !positiveStage) {
    return (
      <div className={`grid ${leadExpandView ? 'grid-cols-2 gap-1' : 'grid-cols-4 gap-2'}`}>
        <div className="text-xs text-red-500">Failed to load positive statuses</div>
      </div>
    );
  }

  // Get all allowed positive statuses from the API
  const positiveStatuses = positiveStage?.info?.statuses?.filter(
    (status) =>
      status?.allowed && status?._id && status?.name !== 'Hold' && status?.name !== 'Privat'
  );

  const buttonSize = leadExpandView ? 'xs' : 'sm';
  const buttonClass = leadExpandView ? 'w-full px-2' : 'max-w-full px-2';

  // Action buttons configuration
  const actionButtons = [
    {
      key: 'termin',
      label: 'Meeting',
      variant: 'success' as const,
      className: 'max-w-fit bg-moss-2 hover:bg-moss-2/80 border-transparent',
      onClick: onMeetingClick,
      icon: 'termin',
    },
    {
      key: 'call',
      label: 'Schedule Call',
      variant: 'default' as const,
      className: 'max-w-fit truncate',
      onClick: onCallScheduleClick,
      icon: 'call',
    },
    {
      key: 'angebot',
      label: 'Offer',
      variant: 'secondary' as const,
      className: 'max-w-fit bg-evergreen hover:bg-evergreen/80 border-transparent',
      onClick: onOfferClick,
      icon: 'angebot',
    },
    {
      key: 'termin',
      label: 'Appointment',
      variant: 'success' as const,
      className: 'max-w-fit bg-moss-2 hover:bg-moss-2/80 border-transparent',
      onClick: onAppointmentClick,
      icon: 'termin',
    },
    // {
    //   key: 'exchange',
    //   label: 'Transfer',
    //   variant: 'default' as const,
    //   className: 'max-w-fit bg-sunbeam-1 hover:bg-sunbeam-1/80 border-transparent text-gray-600 hover:text-gray-800',
    //   onClick: onTransferClick,
    //   icon: 'transfer',
    // },
  ];

  return (
    <div className="3xl:space-y-1 space-y-0.5">
      <p className="w-24 font-bold">Positiv</p>

      <div className={`flex flex-wrap items-center ${leadExpandView ? 'gap-1' : 'gap-2'}`}>
        {/* Action Buttons */}
        {actionButtons?.map(({ label, variant, className, onClick, icon }, i) => (
          <Button
            key={i}
            variant={variant}
            size={buttonSize}
            className={classNames(`${className}`, buttonClass)}
            onClick={onClick}
            icon={getIconForOption(icon)}
          >
            <div className="3xl:max-w-[10ch] max-w-[12ch] truncate">{label}</div>
          </Button>
        ))}

        {/* Status Buttons */}
        {positiveStatuses
          ?.filter(
            (status) => !['Meeting', 'Offer', 'Call', 'Termin', 'Angebot'].includes(status?.name)
          )
          ?.map((status) => (
            <Button
              key={status?._id}
              variant="default"
              size={buttonSize}
              className={classNames(
                `max-w-fit min-w-14 justify-start truncate text-white ${getStatusBadgeColor(status?.name)}`,
                buttonClass
              )}
              onClick={() => onStatusClick(positiveStage?._id || '', status?._id || '')}
            >
              {status?.name}
            </Button>
          ))}
      </div>
    </div>
  );
};

export default PositiveStatusButtons;
