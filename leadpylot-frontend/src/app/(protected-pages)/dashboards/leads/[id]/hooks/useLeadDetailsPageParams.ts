'use client';

import { useParams, useSearchParams } from 'next/navigation';

export type DetailsType = 'offer' | 'opening' | 'email';
export type DefaultActiveTab = 'offers' | 'openings';

interface UseLeadDetailsPageParamsProps {
  leadId?: string;
  detailsType?: DetailsType;
  detailsId?: string | null;
  defaultActiveTab?: DefaultActiveTab;
}

export default function useLeadDetailsPageParams(props: UseLeadDetailsPageParamsProps) {
  const { leadId, detailsType: detailsTypeProp, detailsId: detailsIdProp, defaultActiveTab } = props;
  const params = useParams();
  const searchParams = useSearchParams();

  const offerIdFromUrl = searchParams.get('highlightOffer');
  const id = (params.id as string) || (leadId ?? '');

  // Fall back to URL params when not passed (e.g. when LeadDetailsPage is rendered in dialog from /dashboards/openings?detailsType=opening&detailsId=xxx)
  const detailsTypeParam = searchParams.get('detailsType');
  const detailsIdParam = searchParams.get('detailsId');
  const detailsType = detailsTypeProp || detailsTypeParam || undefined;
  const detailsId = detailsIdProp ?? detailsIdParam ?? undefined;

  const normalizedDetailsType = detailsType ? detailsType.toLowerCase() : undefined;
  const normalizedDetailsId = detailsId ? String(detailsId) : undefined;

  const highlightedOfferIdFromProps =
    normalizedDetailsId &&
    (normalizedDetailsType === 'offer' || normalizedDetailsType === 'opening')
      ? normalizedDetailsId
      : undefined;

  const highlightedOpeningIdFromProps =
    normalizedDetailsId && normalizedDetailsType === 'opening' ? normalizedDetailsId : undefined;

  const highlightedEmailIdFromProps =
    normalizedDetailsId && normalizedDetailsType === 'email' ? normalizedDetailsId : undefined;

  const initialSelectedOpeningIdFromProps =
    normalizedDetailsType === 'opening' && normalizedDetailsId ? normalizedDetailsId : undefined;

  const forceEmailTabFromProps = normalizedDetailsType === 'email';

  const resolvedDefaultActiveTab =
    defaultActiveTab ||
    (normalizedDetailsType === 'opening'
      ? 'openings'
      : normalizedDetailsType === 'offer'
        ? 'offers'
        : undefined);

  return {
    id,
    offerIdFromUrl,
    highlightedOfferIdFromProps,
    highlightedOpeningIdFromProps,
    highlightedEmailIdFromProps,
    initialSelectedOpeningIdFromProps,
    forceEmailTabFromProps,
    resolvedDefaultActiveTab,
  };
}
