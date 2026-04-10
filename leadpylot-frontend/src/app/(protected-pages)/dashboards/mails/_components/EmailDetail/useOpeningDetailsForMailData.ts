import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOpeningById, useCreateAgentPayment } from '@/services/hooks/useOffersProgress';
import { useUsersByRole } from '@/services/hooks/useUsers';
import type { PaymentModalStates, PaymentModalSetters } from './types';

interface UseOpeningDetailsForMailDataProps {
  opening: any;
  offer: any;
  openingIdFromProp: string;
}

export function useOpeningDetailsForMailData({
  opening,
  offer,
  openingIdFromProp,
}: UseOpeningDetailsForMailDataProps) {
  const queryClient = useQueryClient();
  const openingId = opening?._id;

  // Payment modal states
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
  const [shouldOpenAddForm, setShouldOpenAddForm] = useState(false);
  const [isSplitPaymentModalOpen, setIsSplitPaymentModalOpen] = useState(false);
  const [isInboundPaymentModalOpen, setIsInboundPaymentModalOpen] = useState(false);

  const modalStates: PaymentModalStates = {
    isPaymentHistoryModalOpen,
    shouldOpenAddForm,
    isSplitPaymentModalOpen,
    isInboundPaymentModalOpen,
  };

  const modalSetters: PaymentModalSetters = {
    setIsPaymentHistoryModalOpen,
    setShouldOpenAddForm,
    setIsSplitPaymentModalOpen,
    setIsInboundPaymentModalOpen,
  };

  // Mutation for agent payments
  const createAgentPaymentMutation = useCreateAgentPayment();

  // Fetch agents for dropdown
  const { data: agentsData } = useUsersByRole('agent', { limit: 1000 });

  // Fetch opening data
  const { data: fetchedOpening, refetch: refetchOpening } = useOpeningById(
    openingIdFromProp || (openingId as string),
    !!(openingIdFromProp || openingId)
  );

  // Compute offerId
  const offerId = useMemo(() => {
    return fetchedOpening?._id || openingIdFromProp || openingId || offer?._id;
  }, [fetchedOpening, openingIdFromProp, openingId, offer]);

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

  // Enhanced refetch function
  const handleRefetchOpening = useCallback(async () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === 'email' || key === 'email-detail';
      },
    });
  }, [queryClient]);

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

  // Split payment form submission
  const handleSplitPaymentSubmit = useCallback(
    async (data: { agent_id: string; amount: number }) => {
      if (!offerId) return;
      await createAgentPaymentMutation.mutateAsync({
        offerId: String(offerId),
        data: { agent_type: 'split', agent_id: data.agent_id, amount: data.amount },
      });
      setIsSplitPaymentModalOpen(false);
      await handleRefetchOpening();
    },
    [offerId, createAgentPaymentMutation, handleRefetchOpening]
  );

  // Inbound payment form submission
  const handleInboundPaymentSubmit = useCallback(
    async (data: { agent_id: string; amount: number }) => {
      if (!offerId) return;
      await createAgentPaymentMutation.mutateAsync({
        offerId: String(offerId),
        data: { agent_type: 'inbound', agent_id: data.agent_id, amount: data.amount },
      });
      setIsInboundPaymentModalOpen(false);
      await handleRefetchOpening();
    },
    [offerId, createAgentPaymentMutation, handleRefetchOpening]
  );

  // Use fetched opening if available
  const fullOpening = fetchedOpening?.data || fetchedOpening || opening;

  // Prioritize financials from fetched opening
  const financialsData =
    fetchedOpening?.data?.financials ||
    fetchedOpening?.financials ||
    offer?.financials ||
    opening?.financials;

  // Construct the opening object with financials
  const openingWithFinancials = financialsData
    ? {
        data: { ...fullOpening, financials: financialsData },
        financials: financialsData,
      }
    : fetchedOpening || { data: fullOpening };

  // Prepare opening data for display
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

  return {
    modalStates,
    modalSetters,
    offerId,
    openingId,
    fullOpening,
    openingWithFinancials,
    openingData,
    fetchedOpening,
    handleRefetchOpening,
    agentOptions,
    splitPaymentAgentOptions,
    inboundPaymentAgentOptions,
    handleSplitPaymentSubmit,
    handleInboundPaymentSubmit,
    isPaymentMutationPending: createAgentPaymentMutation.isPending,
  };
}
