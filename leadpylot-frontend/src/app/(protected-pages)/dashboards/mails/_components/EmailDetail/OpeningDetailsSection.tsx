'use client';

import React from 'react';
import OpeningInfoSection from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/OpeningInfoSection';
import { PaymentStatusSection } from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/PaymentStatusSection';
import { useSession } from '@/hooks/useSession';
import useDoubleTapDataUpdateChanges from '@/hooks/useDoubleTapDataUpdateChanges';
import { useOpeningById } from '@/services/hooks/useOffersProgress';

interface OpeningDetailsSectionProps {
  opening: any; // Opening data from lead details response
  lead: any;
  offer?: any; // Offer data containing financials
}

const OpeningDetailsSection: React.FC<OpeningDetailsSectionProps> = ({ opening, lead, offer }) => {
  const { data: session } = useSession();
  const { allStatus } = useDoubleTapDataUpdateChanges({ stagesApi: true });

  const openingId = opening?._id;
  const offerId = offer?._id || opening?.offer_id;

  // Fetch full opening details if we don't have financials from offer
  const { data: fetchedOpening, refetch: refetchOpening } = useOpeningById(
    openingId,
    !!openingId && !offer?.financials
  );

  // Use fetched opening if available, otherwise use provided opening
  const fullOpening = fetchedOpening?.data || fetchedOpening || opening;

  // Use financials from offer if available, otherwise from fetched opening
  const financialsData =
    offer?.financials || fetchedOpening?.data?.financials || fetchedOpening?.financials;

  // Construct the fetchedOpening object with financials for PaymentStatusSection
  const openingWithFinancials = financialsData
    ? {
        data: {
          ...fullOpening,
          financials: financialsData,
        },
        financials: financialsData,
      }
    : fetchedOpening || { data: fullOpening };

  // Prepare opening data for display - use offer data if available
  const openingData =
    fullOpening || offer
      ? {
          investmentVolume:
            fullOpening?.investment_volume ||
            offer?.investment_volume ||
            fullOpening?.offer_id?.investment_volume ||
            fullOpening?.offer_id?.investmentVolume ||
            '-',
          interestMonth:
            fullOpening?.payment_terms?.info?.info?.months ||
            offer?.payment_terms?.info?.info?.months ||
            fullOpening?.offer_id?.payment_terms?.info?.info?.months ||
            fullOpening?.offer_id?.payment_terms?.Month ||
            '-',
          interestRate:
            fullOpening?.interest_rate ||
            offer?.interest_rate ||
            fullOpening?.offer_id?.interest_rate ||
            '-',
          bonusAmount:
            fullOpening?.bonus_amount?.info?.amount ||
            offer?.bonus_amount?.info?.amount ||
            fullOpening?.offer_id?.bonus_amount?.info?.amount ||
            fullOpening?.offer_id?.bonus_amount?.Amount ||
            '-',
          offerType:
            fullOpening?.offerType || offer?.offerType || fullOpening?.offer_id?.offerType || '-',
        }
      : null;

  if (!fullOpening || !openingData) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Opening Info Section */}
      <OpeningInfoSection
        opening={fullOpening}
        lead={lead}
        openingData={openingData}
        openingIdFromProp={openingId || ''}
        offerId={fullOpening?._id || fullOpening?.offer_id?._id || ''}
        allStatus={allStatus || []}
        session={session}
      />

      {/* Payout Status Section - Always show (handles empty state internally) */}
      {openingId && (
        <PaymentStatusSection
          fetchedOpening={openingWithFinancials as any}
          offerId={String(offerId || fullOpening?._id || fullOpening?.offer_id?._id || '')}
          openingIdFromProp={String(openingId)}
          session={session}
          refetchOpening={refetchOpening}
          onOpenPaymentHistory={() => {
            // Payment history modal can be added later if needed
          }}
        />
      )}
    </div>
  );
};

export default OpeningDetailsSection;
