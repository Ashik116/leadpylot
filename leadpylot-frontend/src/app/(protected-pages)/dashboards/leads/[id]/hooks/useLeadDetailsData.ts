'use client';

import { useClosedLeads, useLead, useLeads, useOffers } from '@/services/hooks/useLeads';
import { useOffersProgress } from '@/services/hooks/useOffersProgress';
import type { ApiUrlInfo } from './useLeadDetailsApiUrlInfo';

const DEFAULT_PAGE_LIMIT = 50;

interface UseLeadDetailsDataProps {
  leadId: string;
  apiUrlInfo: ApiUrlInfo | null;
  apiUrl: string | null | undefined;
  defaultApiParams: Record<string, unknown>;
  navigationItemsLength: number;
}

export default function useLeadDetailsData({
  leadId,
  apiUrlInfo,
  apiUrl,
  defaultApiParams,
  navigationItemsLength,
}: UseLeadDetailsDataProps) {
  // Always subscribe when URL is /closed-leads: legacy navigation `items` can stay populated
  // after returning from details, which would otherwise skip fetch on a second group visit.
  const shouldFetchClosedLeads = apiUrlInfo?.type === 'closed-leads';

  const shouldFetchLeads =
    navigationItemsLength === 0 &&
    (apiUrlInfo?.type === 'regular' || (!apiUrl && !apiUrlInfo?.type));

  const shouldFetchOffers = navigationItemsLength === 0 && apiUrlInfo?.type === 'offers';
  const shouldFetchOffersProgress =
    navigationItemsLength === 0 && apiUrlInfo?.type === 'offers-progress';

  const { data: lead, isLoading, error } = useLead(leadId);

  const { data: leadsData, isLoading: isLeadsLoading } = useLeads(
    apiUrlInfo?.type === 'regular'
      ? (apiUrlInfo.params as Record<string, number>)
      : (defaultApiParams as { page?: number; limit?: number }) || { page: 1, limit: DEFAULT_PAGE_LIMIT },
    { enabled: shouldFetchLeads && !shouldFetchClosedLeads }
  );

  const { data: closedLeadsData, isLoading: isClosedLeadsLoading } = useClosedLeads(
    apiUrlInfo?.type === 'closed-leads'
      ? (apiUrlInfo.params as Parameters<typeof useClosedLeads>[0])
      : undefined,
    { enabled: shouldFetchClosedLeads }
  );

  const { data: offersData, isLoading: isOffersLoading } = useOffers(
    apiUrlInfo?.type === 'offers'
      ? { ...apiUrlInfo.params, enabled: shouldFetchOffers }
      : { enabled: false }
  );

  const { data: offersProgressData, isLoading: isOffersProgressLoading } = useOffersProgress(
    apiUrlInfo?.type === 'offers-progress'
      ? { ...apiUrlInfo.params, enabled: shouldFetchOffersProgress }
      : { enabled: false }
  );

  const isLoadingAll =
    isLoading ||
    (shouldFetchLeads && isLeadsLoading) ||
    (shouldFetchClosedLeads && isClosedLeadsLoading) ||
    (shouldFetchOffers && isOffersLoading) ||
    (shouldFetchOffersProgress && isOffersProgressLoading);

  return {
    lead,
    isLoading: isLoadingAll,
    error,
    shouldFetchLeads,
    shouldFetchClosedLeads,
    shouldFetchOffers,
    shouldFetchOffersProgress,
    leadsData,
    closedLeadsData,
    offersData,
    offersProgressData,
    isLeadsLoading,
    isClosedLeadsLoading,
    isOffersLoading,
    isOffersProgressLoading,
  };
}
