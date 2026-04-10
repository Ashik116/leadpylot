import { useMemo, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOpeningById, useCreateAgentPayment } from '@/services/hooks/useOffersProgress';
import { useUsersByRole } from '@/services/hooks/useUsers';
import { useCurrentOfferId } from '@/hooks/useCurrentOfferId';
import { DashboardType, TDashboardType } from '../../../_components/dashboardTypes';

interface UseOpeningDetailsDataProps {
  openingData: any;
  isOpen: boolean;
  dashboardType: TDashboardType;
  config: any;
}

export function useOpeningDetailsData({
  openingData,
  isOpen,
  dashboardType,
  config,
}: UseOpeningDetailsDataProps) {
  const queryClient = useQueryClient();
  const { setOfferId } = useCurrentOfferId();

  // Extract opening ID from prop data
  const openingIdFromProp = openingData?._id || openingData?.originalData?._id;

  // Fetch opening data from API
  const { data: fetchedOpening, refetch: refetchOpening } = useOpeningById(
    openingIdFromProp ? String(openingIdFromProp) : undefined,
    isOpen
  );

  // Fetch agents for dropdown
  const { data: agentsData } = useUsersByRole('agent', { limit: 1000 });

  // Mutation for agent payments
  const createAgentPaymentMutation = useCreateAgentPayment();

  // Use fetched opening data if available, otherwise fall back to prop data
  const opening = fetchedOpening || openingData?.originalData || openingData;

  // Build lead object
  const lead = useMemo(() => {
    const leadData = opening?.lead_id || opening?.lead;
    return {
      ...leadData,
      project: leadData?.project_id,
      nametitle: fetchedOpening?.nametitle,
      lead_date: fetchedOpening?.createdAt,
    };
  }, [opening, fetchedOpening]);

  const leadId = lead?._id;
  const offerId = opening?._id;

  // Update offer ID in context when popup opens/closes
  useEffect(() => {
    if (isOpen && offerId) {
      setOfferId(String(offerId));
    } else if (!isOpen) {
      setOfferId(null);
    }
  }, [isOpen, offerId, setOfferId]);

  // Transform opening data for OpeningDetailsGrid
  const transformedOpeningData = useMemo(() => {
    const sourceOpening = opening || openingData?.originalData || openingData;
    if (!sourceOpening) return null;

    return {
      investmentVolume: sourceOpening?.investment_volume || sourceOpening?.investmentVolume || '-',
      interestMonth:
        sourceOpening?.payment_terms?.info?.info?.months ||
        sourceOpening?.payment_terms?.Month ||
        sourceOpening?.interestMonth ||
        '-',
      interestRate: sourceOpening?.interest_rate || sourceOpening?.interestRate || '-',
      bonusAmount:
        (typeof sourceOpening?.bonus_amount === 'number'
          ? sourceOpening.bonus_amount
          : sourceOpening?.bonus_amount?.info?.amount) ||
        sourceOpening?.bonusAmount ||
        '-',
      offerType: sourceOpening?.offerType || sourceOpening?.offer_type || '-',
    };
  }, [opening, openingData]);

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

  // Split payment agent options
  const splitPaymentAgentOptions = useMemo(() => {
    const existingSplitAgents = fetchedOpening?.financials?.split_agents || [];
    return existingSplitAgents.map((agent: any) => {
      const agentId = agent.agent_id || agent._id;
      return {
        value: agentId,
        label: `${getAgentName(agentId)} (${agent.percentage}%)`,
      };
    });
  }, [fetchedOpening?.financials?.split_agents, getAgentName]);

  // Inbound payment agent options
  const inboundPaymentAgentOptions = useMemo(() => {
    const existingInboundAgents = fetchedOpening?.financials?.inbound_agents || [];
    return existingInboundAgents.map((agent: any) => {
      const agentId = agent.agent_id || agent._id;
      return {
        value: agentId,
        label: `${getAgentName(agentId)} (${agent.percentage}%)`,
      };
    });
  }, [fetchedOpening?.financials?.inbound_agents, getAgentName]);

  // All documents
  const allDocuments = useMemo(() => {
    const allFiles: any[] = [];
    const topLevelDocs = fetchedOpening?.files || [];
    if (Array.isArray(topLevelDocs)) {
      allFiles.push(...topLevelDocs);
    }
    return Array.from(
      new Map(allFiles.map((file) => [file?._id || file?.document?._id, file])).values()
    );
  }, [fetchedOpening]);

  // Filtered config for ActionButtonsSection
  const filteredConfig = useMemo(() => {
    if (dashboardType === DashboardType.OFFER) {
      return {
        ...config,
        showBulkUpdate: false,
        showCreateConfirmation: false,
        showCreatePaymentVoucher: false,
        showNetto: false,
        showRevert: false,
        showBulkNetto: false,
        showCreateOpening: true,
        showLost: true,
      };
    }
    return { ...config, showRevert: false, showBulkNetto: false, showBulkUpdate: false };
  }, [config, dashboardType]);

  // Payment handlers
  const handleSplitPaymentSubmit = useCallback(
    async (data: { agent_id: string; amount: number }) => {
      if (!offerId) return;
      await createAgentPaymentMutation.mutateAsync({
        offerId: String(offerId),
        data: { agent_type: 'split', agent_id: data.agent_id, amount: data.amount },
      });
      await refetchOpening();
    },
    [offerId, createAgentPaymentMutation, refetchOpening]
  );

  const handleInboundPaymentSubmit = useCallback(
    async (data: { agent_id: string; amount: number }) => {
      if (!offerId) return;
      await createAgentPaymentMutation.mutateAsync({
        offerId: String(offerId),
        data: { agent_type: 'inbound', agent_id: data.agent_id, amount: data.amount },
      });
      await refetchOpening();
    },
    [offerId, createAgentPaymentMutation, refetchOpening]
  );

  // Invalidation helper
  const invalidateQueries = useCallback(() => {
    if (openingIdFromProp) {
      queryClient.invalidateQueries({ queryKey: ['opening', openingIdFromProp] });
    }
    queryClient.invalidateQueries({ queryKey: ['opening'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }, [queryClient, openingIdFromProp]);

  return {
    opening,
    lead,
    leadId,
    offerId,
    openingIdFromProp,
    fetchedOpening,
    refetchOpening,
    transformedOpeningData,
    agentOptions,
    getAgentName,
    splitPaymentAgentOptions,
    inboundPaymentAgentOptions,
    allDocuments,
    filteredConfig,
    handleSplitPaymentSubmit,
    handleInboundPaymentSubmit,
    isPaymentMutationPending: createAgentPaymentMutation.isPending,
    invalidateQueries,
  };
}
