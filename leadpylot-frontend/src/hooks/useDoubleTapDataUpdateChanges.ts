import { useBonusAmounts } from '@/services/hooks/settings/useBonus';
import { usePaymentTerms } from '@/services/hooks/settings/usePaymentsTerm';
import { useSources } from '@/services/hooks/useSources';
import { useStages } from '@/stores/stagesStore';

const useDoubleTapDataUpdateChanges = ({
  paymentTermsApi,
  bonusAmountsApi,
  sourcesApi,
  stagesApi,
}: {
  paymentTermsApi?: boolean;
  bonusAmountsApi?: boolean;
  sourcesApi?: boolean;
  stagesApi?: boolean;
}) => {
  const { data: sourcesResponse } = useSources({
    enabled: !!sourcesApi,
  });
  // Read stages from global store (already initialized in PostLoginLayout)
  const stages = useStages();

  const { data: bonusAmountsData } = useBonusAmounts({
    limit: 100,
    enabled: !!bonusAmountsApi,
  });
  const { data: paymentTermsData } = usePaymentTerms({
    limit: 100,
    enabled: !!paymentTermsApi,
  });

  // Get specific statuses for negativeAndPrivatOptions (original logic)
  const positivStage = stages?.find((stage) => stage.name === 'Positiv');
  const selectedPositivStatuses = positivStage?.info.statuses.filter((status) =>
    ['Privat'].includes(status.name)
  );

  const negativeStatus = stages?.find((stage) => stage.name === 'Negativ');

  // Create negativeAndPrivatOptions (original specific statuses)
  const negativeAndPrivatOptions = [
    ...(negativeStatus?.info.statuses.map((status) => ({
      value: status?._id,
      label: status?.name,
      stage_id: negativeStatus?._id,
    })) || []),
    ...(selectedPositivStatuses?.map((status) => ({
      value: status?._id,
      label: status?.name,
      stage_id: positivStage?._id,
    })) || []),
  ]?.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  // Get all statuses from all stages except "Call", ensuring uniqueness
  const allStatuses =
    stages?.flatMap((stage) =>
      stage.info.statuses
        .filter((status) => status.name !== 'Call') // Exclude "Call"
        .map((status) => ({
          value: status._id,
          label: status.name,
          stage_id: stage._id,
        }))
    ) || [];

  // Remove duplicates based on label (status name)
  const uniqueStatuses = allStatuses.filter(
    (status, index, self) => index === self.findIndex((s) => s.label === status.label)
  );

  // Sort alphabetically by label
  const allStatus = uniqueStatuses.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  const sourceOptions = sourcesResponse?.data
    .map((source) => ({
      value: source?._id,
      label: source?.name,
    }))
    ?.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  const bonusAmountOptions = bonusAmountsData?.data
    .map((bonus) => ({
      label: `${bonus?.info?.amount} (${bonus?.info?.code})`,
      value: bonus?._id,
    }))
    ?.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  const paymentTermOptions = paymentTermsData?.data
    .map((paymentTerm) => ({
      label: `${paymentTerm?.name} (${paymentTerm?.info?.type || ''})`,
      value: paymentTerm?._id,
    }))
    ?.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  return {
    sourceOptions,
    sourcesResponse,
    negativeAndPrivatOptions, // Use the new unique statuses
    allStatus,
    bonusAmountOptions,
    paymentTermOptions,
    stagesResponse: stages ? { data: stages } : undefined,
  };
};

export default useDoubleTapDataUpdateChanges;
