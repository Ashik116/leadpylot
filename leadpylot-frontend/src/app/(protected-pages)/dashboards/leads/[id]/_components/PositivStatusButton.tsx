import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { TLead } from '@/services/LeadsService';
import { getNegativeStatusButtonStyles, getStatusButtonIconName } from '@/utils/utils';
import { usePositivStage, useStagesLoading, useStagesError } from '@/stores/stagesStore';

interface PositivStatusButtonsProps {
  onStatusClick: (statusCode: string, statusId: string) => void;
  onReclamationClick?: () => void;
  lead: TLead;
}

const PositivStatusButtons = ({ onStatusClick, lead }: PositivStatusButtonsProps) => {
  // Read from global store (already initialized in PostLoginLayout)
  const postiveStage = usePositivStage();
  const isLoading = useStagesLoading();
  const error = useStagesError();

  if (isLoading) {
    return (
      <div className="flex flex-row flex-wrap gap-2">
        {/* Render skeleton buttons for negative statuses */}
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={`skeleton-${index}`} className="h-8 w-16 flex-1 rounded" />
        ))}
        {/* Skeleton for reclamation button */}
        <Skeleton className="h-8 w-20 flex-1 rounded" />
      </div>
    );
  }

  if (error || !postiveStage) {
    return (
      <div className="flex flex-row flex-wrap gap-2">
        <div className="text-red-500">Failed to load statuses</div>
      </div>
    );
  }

  return (
    <div className="flex flex-row flex-wrap gap-2">
      {postiveStage?.info?.statuses
        ?.filter((status) => status?.allowed && status?._id)
        ?.map((status, i) => (
          <Button
            key={i}
            variant="default"
            disabled={lead?.reclamation_status === 'pending' || lead?.project?.length === 0}
            size="sm"
            className={`max-w-[130px] flex-1 justify-start ${getNegativeStatusButtonStyles(status?.code)}`}
            onClick={() => onStatusClick(postiveStage._id!, status._id!)}
            icon={<ApolloIcon name={getStatusButtonIconName(status?.code) as any} />}
          >
            {status?.name}
          </Button>
        ))}
    </div>
  );
};

export default PositivStatusButtons;
