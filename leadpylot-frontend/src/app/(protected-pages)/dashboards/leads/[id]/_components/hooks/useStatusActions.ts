import { useMemo } from 'react';
import { usePositivStage, useNegativStage, useStagesLoading } from '@/stores/stagesStore';

interface UseStatusActionsProps {
  onOfferClick?: () => void;
  onReclamationClick?: () => void;
  onStatusClick?: (stageId: string, statusId: string) => void;
}

export function useStatusActions({
  onOfferClick,
  onReclamationClick,
  onStatusClick,
}: UseStatusActionsProps) {
  // Read from global store (already initialized in PostLoginLayout)
  const positiveStage = usePositivStage();
  const negativeStage = useNegativStage();
  const isLoading = useStagesLoading();

  const holdStatus = useMemo(() => {
    return positiveStage?.info?.statuses?.find((status) => status.name === 'Hold');
  }, [positiveStage]);

  const outStatus = useMemo(() => {
    return negativeStage?.info?.statuses?.find((status) =>
      status.name?.toLowerCase().includes('out')
    );
  }, [negativeStage]);

  const terminStatus = useMemo(() => {
    return positiveStage?.info?.statuses?.find((status) => status.name === 'Termin');
  }, [positiveStage]);

  const handleReusable = () => {
    // TODO: Implement reusable action logic
  };

  const handleOffer = () => {
    onOfferClick?.();
  };

  const handleReclamation = () => {
    onReclamationClick?.();
  };

  const handleOut = () => {
    if (negativeStage?._id && outStatus?._id) {
      onStatusClick?.(negativeStage._id, outStatus._id);
    }
  };

  const handleHold = () => {
    if (positiveStage?._id && holdStatus?._id) {
      onStatusClick?.(positiveStage._id, holdStatus._id);
    }
  };

  return {
    handleReusable,
    handleOffer,
    handleReclamation,
    handleOut,
    handleHold,
    isLoading,
    hasOutStatus: !!outStatus,
    hasHoldStatus: !!holdStatus,
    hasTerminStatus: !!terminStatus,
  };
}
