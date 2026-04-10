'use client';

import React, { useCallback, useMemo } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import CopyButton from '@/components/shared/CopyButton';
import { LoadAndOpeningDropdown } from '../../../_components/SharedColumnConfig';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import { PaymentStatusSection } from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/PaymentStatusSection';
import { SplitAgentsSection } from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/SplitAgentsSection';
import { InboundAgentsSection } from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/InboundAgentsSection';
import { useSession } from '@/hooks/useSession';
import {
  useOpeningById,
  useAddSplitAgent,
  useDeleteSplitAgent,
  useAddInboundAgent,
  useDeleteInboundAgent,
  useUpdateAgentPercentage,
} from '@/services/hooks/useOffersProgress';
import { useUsersByRole } from '@/services/hooks/useUsers';

interface ShowDataValueProps {
  icon?: string;
  label: string;
  value: string | number;
  color?: string;
}

const ShowDataValue: React.FC<ShowDataValueProps> = ({ icon, label, value, color }) => {
  return (
    <div className="flex items-center gap-2">
      {icon && <ApolloIcon name={icon as any} className="text-sm text-gray-600" />}
      <div className="flex flex-1 items-center justify-between gap-2">
        <h6 className="text-sm font-semibold text-gray-600">{label}</h6>
        <p className="text-sm text-gray-900" style={{ color: color }}>
          {value || '-'}
        </p>
      </div>
    </div>
  );
};

interface SalesDetailsSectionProps {
  opening: any;
  offer: any;
  lead: any;
}

const SalesDetailsSection: React.FC<SalesDetailsSectionProps> = ({ opening, offer, lead }) => {
  const { data: session } = useSession();
  const openingId = opening?._id;
  const offerId = offer?._id || opening?.offer_id;

  // Mutations for split and inbound agents
  const addSplitAgentMutation = useAddSplitAgent();
  const deleteSplitAgentMutation = useDeleteSplitAgent();
  const addInboundAgentMutation = useAddInboundAgent();
  const deleteInboundAgentMutation = useDeleteInboundAgent();
  const updateAgentPercentageMutation = useUpdateAgentPercentage();

  // Fetch agents for dropdown
  const { data: agentsData } = useUsersByRole('agent', { limit: 1000 });

  // Agent options for dropdowns
  const agentOptions = useMemo(() => {
    if (!agentsData) return [];
    const agents = Array.isArray(agentsData) ? agentsData : (agentsData as any)?.data || [];
    return agents
      .filter((user: any) => user.role === 'Agent')
      .map((user: any) => ({
        value: user._id,
        label: `${user.info?.name || user.login || 'Unknown'}`,
      }));
  }, [agentsData]);

  // Helper function to get agent name by ID
  const getAgentName = useCallback(
    (agentId: string) => {
      if (!agentsData || !agentId) return 'Unknown';
      const agents = Array.isArray(agentsData) ? agentsData : (agentsData as any)?.data || [];
      const agent = agents.find((a: any) => a._id === agentId);
      return agent?.info?.name || agent?.login || 'Unknown';
    },
    [agentsData]
  );

  // Only fetch opening details if we don't have financials from the offer
  // IMPORTANT: useOpeningById calls /offers/{id} which expects an offer ID, not opening ID
  // Since we already have financials in the offer object, we should avoid fetching
  // Only fetch if we truly need additional data that's not in the offer
  const hasFinancials = offer?.financials?.financials_initialized || offer?.financials;
  const shouldFetchOpening = !!offerId && !hasFinancials;
  const { data: fetchedOpening, refetch: refetchOpening } = useOpeningById(
    offerId as string,
    shouldFetchOpening
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
    offer || fullOpening
      ? {
          investmentVolume: offer?.investment_volume || fullOpening?.investment_volume || '-',
          interestMonth:
            offer?.payment_terms?.info?.info?.months ||
            fullOpening?.payment_terms?.info?.info?.months ||
            '-',
          interestRate: offer?.interest_rate || fullOpening?.interest_rate || '-',
          bonusAmount:
            offer?.bonus_amount?.info?.amount || fullOpening?.bonus_amount?.info?.amount || '-',
          offerType: offer?.offerType || fullOpening?.offerType || '-',
        }
      : null;

  if (!openingData) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Opening/Offer Information - Only unique fields, no duplicates */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-1">
          {/* Partner ID with Copy Button */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center justify-between gap-2">
              <h6 className="text-sm font-semibold text-gray-600">Partner ID</h6>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-900">{lead?.lead_source_no || '-'}</p>
                {lead?.lead_source_no && (
                  <CopyButton value={lead.lead_source_no} className="shrink-0" />
                )}
              </div>
            </div>
          </div>
          <ShowDataValue label="Title" value={offer?.nametitle || opening?.nametitle || '-'} />
          <div className="flex items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-600">O/L</h6>
            {offerId && session?.user?.role === Role.ADMIN ? (
              <LoadAndOpeningDropdown
                offerId={String(offerId)}
                currentStatus={offer?.load_and_opening || opening?.load_and_opening || ''}
              />
            ) : (
              <span className="text-sm text-gray-900">
                {offer?.load_and_opening || opening?.load_and_opening || '-'}
              </span>
            )}
          </div>
          <ShowDataValue label="Investment" value={openingData.investmentVolume || '-'} />
          <ShowDataValue label="Month" value={openingData.interestMonth || '-'} />
          <ShowDataValue label="Rate" value={openingData.interestRate || '-'} />
          <ShowDataValue label="Bonus" value={openingData.bonusAmount || '-'} />
          <ShowDataValue label="Type" value={openingData.offerType || '-'} />
        </div>

        {/* Right Column */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ApolloIcon name="plus-circle" className="text-sm text-gray-600" />
            <h6 className="text-sm font-semibold text-gray-600">Created At</h6>
            <p className="text-sm text-gray-900">
              {dateFormateUtils(
                offer?.createdAt || offer?.created_at || opening?.createdAt,
                DateFormatType.SHOW_TIME
              ) || '-'}
            </p>
          </div>
          {/* Lead Status */}
          <div className="flex flex-1 items-center justify-between gap-2">
            <h6 className="text-sm font-semibold text-gray-600">Status :</h6>
            {lead?.status?.name || lead?.status ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                {typeof lead.status === 'string' ? lead.status : lead.status?.name || '-'}
              </span>
            ) : (
              <span className="text-sm text-gray-900">-</span>
            )}
          </div>
          <ShowDataValue
            label="Src"
            value={lead?.source?.name || offer?.lead_id?.source_id?.name || '-'}
          />
          <ShowDataValue
            label="Bank"
            value={offer?.bank_id?.name || opening?.bank_id?.name || '-'}
          />
          <ShowDataValue
            label="Provider"
            value={offer?.bank_id?.provider || opening?.bank_id?.provider || '-'}
          />
          <ShowDataValue label="Ref" value={offer?.bank_id?.ref || opening?.bank_id?.ref || '-'} />
          <ShowDataValue
            label="IBAN"
            value={offer?.bank_id?.iban || opening?.bank_id?.iban || '-'}
          />
          <ShowDataValue
            label="Agent"
            value={offer?.agent_id?.login || opening?.agent_id?.login || '-'}
            color={offer?.agent_id?.color_code || opening?.agent_id?.color_code}
          />
        </div>
      </div>

      {/* Payout Status Section */}
      {openingId && (
        <PaymentStatusSection
          fetchedOpening={openingWithFinancials as any}
          offerId={String(offerId)}
          openingIdFromProp={String(openingId)}
          session={session}
          refetchOpening={refetchOpening}
          onOpenPaymentHistory={() => {
            // Payment history modal can be added later if needed
          }}
        />
      )}

      {/* Split Agents Section */}
      {openingId && (
        <SplitAgentsSection
          fetchedOpening={openingWithFinancials as any}
          offerId={String(offerId)}
          agentOptions={agentOptions}
          getAgentName={getAgentName}
          refetchOpening={refetchOpening}
          session={session}
          addSplitAgentMutation={addSplitAgentMutation}
          deleteSplitAgentMutation={deleteSplitAgentMutation}
          updateAgentPercentageMutation={updateAgentPercentageMutation}
        />
      )}

      {/* Inbound Agents Section */}
      {openingId && (
        <InboundAgentsSection
          fetchedOpening={openingWithFinancials as any}
          offerId={String(offerId)}
          agentOptions={agentOptions}
          getAgentName={getAgentName}
          refetchOpening={refetchOpening}
          session={session}
          addInboundAgentMutation={addInboundAgentMutation}
          deleteInboundAgentMutation={deleteInboundAgentMutation}
          updateAgentPercentageMutation={updateAgentPercentageMutation}
        />
      )}
    </div>
  );
};

export default SalesDetailsSection;
