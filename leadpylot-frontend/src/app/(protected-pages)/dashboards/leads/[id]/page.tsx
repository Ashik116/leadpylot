'use client';

import { LeadDetails } from './_components/LeadDetails';
import { LeadDetailsPageError } from './_components/LeadDetailsPageError';
import { LeadDetailsPageSkeleton } from './_components/LeadDetailsPageSkeleton';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import useLeadDetailsPageParams from './hooks/useLeadDetailsPageParams';
import useLeadDetailsApiUrlInfo from './hooks/useLeadDetailsApiUrlInfo';
import useLeadDetailsHighlight from './hooks/useLeadDetailsHighlight';
import useLeadDetailsUrlHash from './hooks/useLeadDetailsUrlHash';
import useLeadDetailsData from './hooks/useLeadDetailsData';
import useLeadDetailsNavigationSync from './hooks/useLeadDetailsNavigationSync';
import useLeadDetailsIndexSync from './hooks/useLeadDetailsIndexSync';
import { useApiUrlRouteHandler } from '@/hooks/useApiUrlRouteHandler';
import { useDefaultApiStore } from '@/stores/defaultApiStore';
import { useLeadsNavigationStore } from '@/stores/navigationStores';

type LeadDetailsPageProps = {
  leadId?: string;
  showInDialog?: boolean;
  detailsType?: 'offer' | 'opening' | 'email';
  detailsId?: string | null;
  defaultActiveTab?: 'offers' | 'openings';
  /** When in Offer/Opening Details dialog: task type for create task (offer | opening) */
  taskType?: string;
  offerId?: string;
  openingId?: string;
};

export default function LeadDetailsPage({
  leadId,
  showInDialog,
  detailsType,
  detailsId,
  defaultActiveTab,
  taskType: taskTypeFromDialog,
  offerId: offerIdFromDialog,
  openingId: openingIdFromDialog,
}: LeadDetailsPageProps) {
  const currentPath = usePathname();
  const [isAddOpeningOpen, setIsAddOpeningOpen] = useState(false);

  const {
    id,
    offerIdFromUrl,
    highlightedOfferIdFromProps,
    highlightedOpeningIdFromProps,
    highlightedEmailIdFromProps,
    initialSelectedOpeningIdFromProps,
    forceEmailTabFromProps,
    resolvedDefaultActiveTab,
  } = useLeadDetailsPageParams({ leadId, detailsType, detailsId, defaultActiveTab });

  const { apiUrl } = useApiUrlRouteHandler();
  const { defaultApiParams } = useDefaultApiStore();
  const navigationItems = useLeadsNavigationStore((state: any) => state.items);

  const apiUrlInfo = useLeadDetailsApiUrlInfo(apiUrl, navigationItems.length);
  const highlightedOfferId = useLeadDetailsHighlight(offerIdFromUrl);

  const {
    lead,
    isLoading,
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
  } = useLeadDetailsData({
    leadId: id || '',
    apiUrlInfo,
    apiUrl,
    defaultApiParams: defaultApiParams || {},
    navigationItemsLength: navigationItems.length,
  });

  useLeadDetailsUrlHash(lead, currentPath, showInDialog);

  useLeadDetailsNavigationSync({
    lead: lead ?? undefined,
    navigationItemsLength: navigationItems.length,
    apiUrl,
    apiUrlInfo,
    shouldFetchLeads,
    shouldFetchClosedLeads,
    shouldFetchOffers,
    shouldFetchOffersProgress,
    leadsData,
    closedLeadsData,
    offersData,
    offersProgressData,
  });

  useLeadDetailsIndexSync({
    lead: lead ?? undefined,
    navigationItemsLength: navigationItems.length,
    shouldFetchLeads,
    shouldFetchClosedLeads,
    shouldFetchOffers,
    shouldFetchOffersProgress,
    leadsData,
    closedLeadsData,
    offersData,
    offersProgressData,
    apiUrlInfo,
  });

  const isShowingLoading =
    isLoading ||
    (shouldFetchLeads && isLeadsLoading) ||
    (shouldFetchClosedLeads && isClosedLeadsLoading) ||
    (shouldFetchOffers && isOffersLoading) ||
    (shouldFetchOffersProgress && isOffersProgressLoading) ||
    !lead;

  if (error) {
    return <LeadDetailsPageError error={error} leadId={id} />;
  }

  if (isShowingLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] flex-1 flex-col">
        <LeadDetailsPageSkeleton leadId={id} />
      </div>
    );
  }

  return (
    <div className={showInDialog ? 'h-full' : ''}>
      <LeadDetails
        lead={lead!}
        isAddOpeningOpen={isAddOpeningOpen}
        setIsAddOpeningOpen={setIsAddOpeningOpen}
        showInDialog={showInDialog}
        highlightedOfferId={highlightedOfferIdFromProps || highlightedOfferId || undefined}
        highlightedOpeningId={highlightedOpeningIdFromProps}
        highlightedEmailId={highlightedEmailIdFromProps}
        forceEmailTab={forceEmailTabFromProps}
        initialSelectedOpeningId={initialSelectedOpeningIdFromProps}
        defaultActiveTab={resolvedDefaultActiveTab}
        taskTypeFromDialog={taskTypeFromDialog}
        offerIdFromDialog={offerIdFromDialog}
        openingIdFromDialog={openingIdFromDialog}
      />
    </div>
  );
}
