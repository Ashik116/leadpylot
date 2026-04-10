import React, { useCallback, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import AgentForm from './AgentForm';
import BatchAgentList from './BatchAgentList';

interface SplitAgentsSectionProps {
  fetchedOpening: any;
  offerId: string;
  agentOptions: Array<{ value: string; label: string }>;
  getAgentName: (agentId: string) => string;
  refetchOpening: () => Promise<any>;
  session: any;
  // Mutations
  addSplitAgentMutation: any;
  deleteSplitAgentMutation: any;
  updateAgentPercentageMutation: any;
}

export const SplitAgentsSection: React.FC<SplitAgentsSectionProps> = ({
  fetchedOpening,
  offerId,
  agentOptions,
  getAgentName,
  refetchOpening,
  session,
  addSplitAgentMutation,
  deleteSplitAgentMutation,
  updateAgentPercentageMutation,
}) => {
  const [splitAgentId, setSplitAgentId] = useState<string>('');
  const [showSplitForm, setShowSplitForm] = useState<boolean>(false);
  const [isSplitSectionExpanded, setIsSplitSectionExpanded] = useState<boolean>(true);

  // Existing split agents list
  const existingSplitAgents = useMemo(() => {
    return fetchedOpening?.financials?.split_agents || [];
  }, [fetchedOpening?.financials?.split_agents]);

  // Check if split agent exists
  const existingSplitAgent = useMemo(() => {
    if (!splitAgentId || !fetchedOpening?.financials?.split_agents) return null;
    return fetchedOpening.financials.split_agents.find(
      (agent: any) => agent.agent_id === splitAgentId
    );
  }, [splitAgentId, fetchedOpening?.financials?.split_agents]);

  // Handle clicking on existing split agent
  const handleSplitAgentClick = useCallback((agent: any) => {
    const agentId = agent.agent_id || agent._id;
    setSplitAgentId(agentId);
    setShowSplitForm(true);
    setIsSplitSectionExpanded(true);
  }, []);

  // Handle delete split agent from list
  const handleDeleteSplitAgentFromList = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!offerId || !agentId) return;
    await deleteSplitAgentMutation.mutateAsync({
      offerId: String(offerId),
      agentId,
    });
    if (splitAgentId === agentId) {
      setSplitAgentId('');
      setShowSplitForm(false);
    }
    await refetchOpening();
  };

  // Handle split agent form submission
  const handleSplitAgentSubmit = async (data: {
    agent_id: string;
    percentage: number;
    reason?: string;
  }) => {
    if (!offerId || !data.agent_id || !data.percentage) return;

    const existingAgent = fetchedOpening?.financials?.split_agents?.find(
      (agent: any) => agent.agent_id === data.agent_id
    );

    if (existingAgent) {
      // Update existing agent
      await updateAgentPercentageMutation.mutateAsync({
        offerId: String(offerId),
        agentType: 'split-agents',
        agentId: data.agent_id,
        data: {
          agent_type: 'split',
          percentage: data.percentage,
        },
      });
    } else {
      // Add new agent
      await addSplitAgentMutation.mutateAsync({
        offerId: String(offerId),
        data: {
          agent_id: data.agent_id,
          percentage: data.percentage,
          reason: data.reason || undefined,
        },
      });
    }

    setSplitAgentId('');
    setShowSplitForm(false);
    await refetchOpening();
  };

  // Handle delete split agent
  const handleDeleteSplitAgent = async () => {
    if (!offerId || !splitAgentId) return;
    await deleteSplitAgentMutation.mutateAsync({
      offerId: String(offerId),
      agentId: splitAgentId,
    });
    setSplitAgentId('');
    setShowSplitForm(false);
    await refetchOpening();
  };

  if (session?.user?.role !== Role.ADMIN || !fetchedOpening?.financials?.financials_initialized) {
    return null;
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setIsSplitSectionExpanded(!isSplitSectionExpanded)}
        className="flex items-center justify-between bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
      >
        <h6 className="text-sm font-semibold text-gray-900">
          Split Agents {existingSplitAgents.length > 0 && `(${existingSplitAgents.length})`}
        </h6>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="solid"
            onClick={(e) => {
              e.stopPropagation();
              setShowSplitForm(!showSplitForm);
              if (!showSplitForm) {
                setSplitAgentId('');
              }
              setIsSplitSectionExpanded(true);
            }}
            icon={<ApolloIcon name={showSplitForm ? 'minus' : 'plus'} />}
          >
            Add Split
          </Button>

          <ApolloIcon
            name={isSplitSectionExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
            className="text-sm text-gray-600"
          />
        </div>
      </button>

      {isSplitSectionExpanded && (
        <div>
          {/* Existing Split Agents List */}
          <BatchAgentList
            agents={existingSplitAgents}
            selectedAgentId={splitAgentId}
            onAgentClick={handleSplitAgentClick}
            onDelete={handleDeleteSplitAgentFromList}
            getAgentName={getAgentName}
            isLoading={deleteSplitAgentMutation.isPending}
          />

          {/* Split Agents Form */}
          {showSplitForm && (
            <AgentForm
              agentType="split"
              agentOptions={agentOptions}
              existingAgent={existingSplitAgent}
              existingAgentsList={existingSplitAgents}
              defaultValues={
                existingSplitAgent
                  ? {
                    agent_id: existingSplitAgent.agent_id || existingSplitAgent._id,
                    percentage: existingSplitAgent.percentage?.toString() || '0',
                    reason: existingSplitAgent.reason || '',
                  }
                  : undefined
              }
              onSubmit={handleSplitAgentSubmit}
              onDelete={existingSplitAgent ? handleDeleteSplitAgent : undefined}
              onCancel={() => {
                setSplitAgentId('');
                setShowSplitForm(false);
              }}
              isLoading={addSplitAgentMutation.isPending}
              isDeleteLoading={deleteSplitAgentMutation.isPending}
              isUpdateLoading={updateAgentPercentageMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
};
