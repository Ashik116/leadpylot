import React, { useCallback, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import AgentForm from './AgentForm';
import BatchAgentList from './BatchAgentList';

interface InboundAgentsSectionProps {
  fetchedOpening: any;
  offerId: string;
  agentOptions: Array<{ value: string; label: string }>;
  getAgentName: (agentId: string) => string;
  refetchOpening: () => Promise<any>;
  session: any;
  // Mutations
  addInboundAgentMutation: any;
  deleteInboundAgentMutation: any;
  updateAgentPercentageMutation: any;
}

export const InboundAgentsSection: React.FC<InboundAgentsSectionProps> = ({
  fetchedOpening,
  offerId,
  agentOptions,
  getAgentName,
  refetchOpening,
  session,
  addInboundAgentMutation,
  deleteInboundAgentMutation,
  updateAgentPercentageMutation,
}) => {
  const [inboundAgentId, setInboundAgentId] = useState<string>('');
  const [showInboundForm, setShowInboundForm] = useState<boolean>(false);
  const [isInboundSectionExpanded, setIsInboundSectionExpanded] = useState<boolean>(true);

  // Existing inbound agents list
  const existingInboundAgents = useMemo(() => {
    return fetchedOpening?.financials?.inbound_agents || [];
  }, [fetchedOpening?.financials?.inbound_agents]);

  // Check if inbound agent exists
  const existingInboundAgent = useMemo(() => {
    if (!inboundAgentId || !fetchedOpening?.financials?.inbound_agents) return null;
    return fetchedOpening.financials.inbound_agents.find(
      (agent: any) => agent.agent_id === inboundAgentId
    );
  }, [inboundAgentId, fetchedOpening?.financials?.inbound_agents]);

  // Handle clicking on existing inbound agent
  const handleInboundAgentClick = useCallback((agent: any) => {
    const agentId = agent.agent_id || agent._id;
    setInboundAgentId(agentId);
    setShowInboundForm(true);
    setIsInboundSectionExpanded(true);
  }, []);

  // Handle delete inbound agent from list
  const handleDeleteInboundAgentFromList = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!offerId || !agentId) return;
    await deleteInboundAgentMutation.mutateAsync({
      offerId: String(offerId),
      agentId,
    });
    if (inboundAgentId === agentId) {
      setInboundAgentId('');
      setShowInboundForm(false);
    }
    await refetchOpening();
  };

  // Handle inbound agent form submission
  const handleInboundAgentSubmit = async (data: {
    agent_id: string;
    percentage: number;
    reason?: string;
  }) => {
    if (!offerId || !data.agent_id || !data.percentage) return;

    const existingAgent = fetchedOpening?.financials?.inbound_agents?.find(
      (agent: any) => agent.agent_id === data.agent_id
    );

    if (existingAgent) {
      // Update existing agent
      await updateAgentPercentageMutation.mutateAsync({
        offerId: String(offerId),
        agentType: 'inbound-agents',
        agentId: data.agent_id,
        data: {
          agent_type: 'inbound',
          percentage: data.percentage,
        },
      });
    } else {
      // Add new agent
      await addInboundAgentMutation.mutateAsync({
        offerId: String(offerId),
        data: {
          agent_id: data.agent_id,
          percentage: data.percentage,
          reason: data.reason || undefined,
        },
      });
    }

    setInboundAgentId('');
    setShowInboundForm(false);
    await refetchOpening();
  };

  // Handle delete inbound agent
  const handleDeleteInboundAgent = async () => {
    if (!offerId || !inboundAgentId) return;
    await deleteInboundAgentMutation.mutateAsync({
      offerId: String(offerId),
      agentId: inboundAgentId,
    });
    setInboundAgentId('');
    setShowInboundForm(false);
    await refetchOpening();
  };

  if (session?.user?.role !== Role.ADMIN || !fetchedOpening?.financials?.financials_initialized) {
    return null;
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setIsInboundSectionExpanded(!isInboundSectionExpanded)}
        className="flex items-center justify-between bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
      >
        <h6 className="text-sm font-semibold text-gray-900">
          Inbound Agents {existingInboundAgents.length > 0 && `(${existingInboundAgents.length})`}
        </h6>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="solid"
            onClick={(e) => {
              e.stopPropagation();
              setShowInboundForm(!showInboundForm);
              if (!showInboundForm) {
                setInboundAgentId('');
              }
              setIsInboundSectionExpanded(true);
            }}
            icon={<ApolloIcon name={showInboundForm ? 'minus' : 'plus'} />}
          >
            Add Inbound
          </Button>

          <ApolloIcon
            name={isInboundSectionExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
            className="text-sm text-gray-600"
          />
        </div>
      </button>

      {isInboundSectionExpanded && (
        <div>
          {/* Existing Inbound Agents List */}
          <BatchAgentList
            agents={existingInboundAgents}
            selectedAgentId={inboundAgentId}
            onAgentClick={handleInboundAgentClick}
            onDelete={handleDeleteInboundAgentFromList}
            getAgentName={getAgentName}
            isLoading={deleteInboundAgentMutation.isPending}
          />

          {/* Inbound Agents Form */}
          {showInboundForm && (
            <AgentForm
              agentType="inbound"
              agentOptions={agentOptions}
              existingAgent={existingInboundAgent}
              existingAgentsList={existingInboundAgents}
              defaultValues={
                existingInboundAgent
                  ? {
                    agent_id: existingInboundAgent.agent_id || existingInboundAgent._id,
                    percentage: existingInboundAgent.percentage?.toString() || '0',
                    reason: existingInboundAgent.reason || '',
                  }
                  : undefined
              }
              onSubmit={handleInboundAgentSubmit}
              onDelete={existingInboundAgent ? handleDeleteInboundAgent : undefined}
              onCancel={() => {
                setInboundAgentId('');
                setShowInboundForm(false);
              }}
              isLoading={addInboundAgentMutation.isPending}
              isDeleteLoading={deleteInboundAgentMutation.isPending}
              isUpdateLoading={updateAgentPercentageMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
};
