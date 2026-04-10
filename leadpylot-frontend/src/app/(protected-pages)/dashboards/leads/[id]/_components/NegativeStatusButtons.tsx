import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { TLead } from '@/services/LeadsService';
import { getNegativeStatusButtonStyles, getStatusButtonIconName } from '@/utils/utils';
import { useNegativStage, useStagesLoading, useStagesError } from '@/stores/stagesStore';

interface NegativeStatusButtonsProps {
  onStatusClick: (data: { stage_id: string; status_id: string }) => void;
  onReclamationClick?: () => void;
  lead: TLead;
  leadExpandView?: boolean;
}

const NegativeStatusButtons = ({
  onStatusClick,
  onReclamationClick,
  lead,
  leadExpandView = false,
}: NegativeStatusButtonsProps) => {
  // Read from global store (already initialized in PostLoginLayout)
  const negativStage = useNegativStage();
  const isLoading = useStagesLoading();
  const error = useStagesError();

  if (isLoading) {
    return (
      <div className="flex flex-row flex-wrap gap-2">
        {/* Render skeleton buttons for negative statuses */}
        {Array.from({ length: 5 })?.map((_, index) => (
          <Skeleton key={`skeleton-${index}`} className="h-8 w-16 flex-1 rounded" />
        ))}
        {/* Skeleton for reclamation button */}
        <Skeleton className="h-8 w-20 flex-1 rounded" />
      </div>
    );
  }

  if (error || !negativStage) {
    return (
      <div className="flex flex-row flex-wrap gap-2">
        <div className="text-red-500">Failed to load statuses</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${leadExpandView ? 'gap-1' : 'gap-2'}`}>
      {negativStage.info.statuses
        ?.filter((status) => status?.allowed && status?._id)
        ?.map((status) => {
          const showIcon =
            status?.name?.toLocaleLowerCase()?.includes('kein') ||
            status?.name?.toLocaleLowerCase()?.includes('out');
          return (
            <Button
              key={status?._id}
              variant="default"
              // disabled={lead?.reclamation_status === 'pending' || lead?.project?.length === 0}
              size={leadExpandView ? 'xs' : 'sm'}
              className={`line-clamp-1 max-w-fit ${leadExpandView ? '' : 'min-w-14'} justify-start p-0 px-1 text-white ${getNegativeStatusButtonStyles(status?.code)}`}
              onClick={() => onStatusClick({ stage_id: negativStage._id!, status_id: status._id! })}
            >
              <div className="group mx-auto flex items-center gap-1">
                {showIcon && <ApolloIcon name={getStatusButtonIconName(status?.code) as any} />}
                <div className="3xl:max-w-full mx-auto max-w-16 truncate">{status?.name}</div>
              </div>
            </Button>
          );
        })}

      {/* Reclamation button - separate from the dynamic statuses */}
      <Button
        key="reclamation"
        variant="destructive"
        size={leadExpandView ? 'xs' : 'sm'}
        className={`bg-rust max-w-fit justify-start truncate border-transparent px-1`}
        onClick={onReclamationClick}
        disabled={lead?.reclamation_status === 'pending'}
      >
        <div className="3xl:max-w-32 mx-auto flex max-w-16 items-center gap-1">
          <ApolloIcon name={getStatusButtonIconName('RECLAMATION') as any} />
          <div className="3xl:max-w-full truncate">Reclamation</div>
        </div>
      </Button>
    </div>
  );
};

export default NegativeStatusButtons;
