import { useCallback, useMemo } from 'react';
import { TLead } from '@/services/LeadsService';
import { useNegativStage } from '@/stores/stagesStore';
import { useUpdateLeadStatus } from '@/services/hooks/useLeads';

const WIEDERVORLAGE_STATUSES = [
  { name: 'NE1', code: 'NE1' },
  { name: 'NE2', code: 'NE2' },
  { name: 'NE3', code: 'NE3' },
  { name: 'NE4', code: 'NE4' },
] as const;

/**
 * "Ne" = Neuansprache (re-contact / follow-up in the negative pipeline).
 * Clicking advances the lead status NE1 → NE2 → NE3 → NE4; at NE4 the button no longer advances.
 */
export function getWiedervorlageTooltipText(
  lead: TLead,
  negativStageId: string | undefined
): string {
  if (!negativStageId) {
    return 'Ne (Neuansprache): moves the lead through follow-up stages NE1–NE4 in the negative pipeline. Not available—negative stage is not configured.';
  }

  const currentStatusName = lead.status?.name?.trim();
  const currentIndex = WIEDERVORLAGE_STATUSES.findIndex(
    (status) => status.name === currentStatusName || status.code === currentStatusName
  );

  if (currentIndex === WIEDERVORLAGE_STATUSES.length - 1) {
    return 'Ne: this lead is already at NE4 (last Neuansprache step). The status will not advance further—use Out, Reclamation, or assign/move the lead when appropriate.';
  }

  const nextName =
    currentIndex >= 0 && currentIndex < WIEDERVORLAGE_STATUSES.length - 1
      ? WIEDERVORLAGE_STATUSES[currentIndex + 1].name
      : WIEDERVORLAGE_STATUSES[0].name;

  if (currentIndex >= 0) {
    const cur = WIEDERVORLAGE_STATUSES[currentIndex].name;
    return `Ne (Neuansprache): register the next follow-up in the negative track. Current stage: ${cur}. Click to set status to ${nextName}.`;
  }

  return `Ne (Neuansprache): register a follow-up in the negative track. The lead is not on NE1–NE4 yet—click to set status to ${nextName} to start the sequence.`;
}

interface UseWiedervorlageProps {
  lead: TLead;
}

export function useWiedervorlage({ lead }: UseWiedervorlageProps) {
  const negativStage = useNegativStage();
  const updateLeadStatusMutation = useUpdateLeadStatus({
    id: lead?._id,
    invalidLeads: true,
    invalidActivities: true,
  });

  const handleStatusClick = useCallback(
    (stageId: string, statusId: string) => {
      updateLeadStatusMutation.mutate({
        stage_id: stageId,
        status_id: statusId,
      });
    },
    [updateLeadStatusMutation]
  );

  const handleWiedervorlage = useCallback(() => {
    if (!negativStage?._id || !lead?._id) {
      return;
    }

    const currentStatusName = lead.status?.name?.trim();
    const currentIndex = WIEDERVORLAGE_STATUSES.findIndex(
      (status) => status.name === currentStatusName || status.code === currentStatusName
    );

    // If at NE4, do nothing - stop the progression
    if (currentIndex === WIEDERVORLAGE_STATUSES.length - 1) {
      return;
    }

    // Determine next status in progression
    const targetStatusName =
      currentIndex >= 0 && currentIndex < WIEDERVORLAGE_STATUSES.length - 1
        ? WIEDERVORLAGE_STATUSES[currentIndex + 1].name
        : WIEDERVORLAGE_STATUSES[0].name;

    const targetStatus = negativStage.info?.statuses?.find(
      (status) =>
        status.name?.trim() === targetStatusName || status.code?.trim() === targetStatusName
    );

    if (targetStatus?._id) {
      handleStatusClick(negativStage._id, targetStatus._id);
    }
  }, [lead, negativStage, handleStatusClick]);

  const isDisabled = updateLeadStatusMutation.isPending || !negativStage?._id;

  const wiedervorlageTooltip = useMemo(
    () => getWiedervorlageTooltipText(lead, negativStage?._id),
    [lead, negativStage?._id]
  );

  return {
    handleWiedervorlage,
    isDisabled,
    wiedervorlageTooltip,
  };
}
