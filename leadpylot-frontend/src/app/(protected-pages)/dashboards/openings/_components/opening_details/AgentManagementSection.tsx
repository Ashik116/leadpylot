import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import BatchAgentList from './BatchAgentList';
import AgentForm from './AgentForm';

interface AgentManagementSectionProps {
  title: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showForm: boolean;
  onToggleForm: () => void;
  agents: any[];
  selectedAgentId: string;
  onAgentClick: (agent: any) => void;
  onDeleteAgentFromList: (agentId: string, e: React.MouseEvent) => void;
  getAgentName: (agentId: string) => string;
  agentOptions: any[];
  existingAgent: any;
  onSubmitForm: (data: any) => void;
  onDeleteForm: (() => void) | undefined;
  onCancelForm: () => void;
  isPending: boolean;
  isDeletePending: boolean;
  isUpdatePending: boolean;
}

const AgentManagementSection: React.FC<AgentManagementSectionProps> = ({
  title,
  isExpanded,
  onToggleExpand,
  showForm,
  onToggleForm,
  agents,
  selectedAgentId,
  onAgentClick,
  onDeleteAgentFromList,
  getAgentName,
  agentOptions,
  existingAgent,
  onSubmitForm,
  onDeleteForm,
  onCancelForm,
  isPending,
  isDeletePending,
  isUpdatePending,
}) => {
  return (
    <div className="mt-4 flex flex-col rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex items-center justify-between bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100"
      >
        <h6 className="text-sm font-semibold text-gray-900">
          {title} {agents.length > 0 && `(${agents.length})`}
        </h6>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="solid"
            onClick={(e) => {
              e.stopPropagation();
              onToggleForm();
            }}
            icon={<ApolloIcon name={showForm ? 'minus' : 'plus'} />}
          >
            {showForm ? 'Cancel' : `Add ${title.split(' ')[0]}`}
          </Button>

          <ApolloIcon
            name={isExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
            className="text-sm text-gray-600"
          />
        </div>
      </button>

      {isExpanded && (
        <div>
          {/* Existing Agents List */}
          <BatchAgentList
            agents={agents}
            selectedAgentId={selectedAgentId}
            onAgentClick={onAgentClick}
            onDelete={onDeleteAgentFromList}
            getAgentName={getAgentName}
            isLoading={isDeletePending}
          />

          {/* Agent Form */}
          {showForm && (
            <AgentForm
              agentType={title.toLowerCase().includes('split') ? 'split' : 'inbound'}
              agentOptions={agentOptions}
              existingAgent={existingAgent}
              existingAgentsList={agents}
              defaultValues={
                existingAgent
                  ? {
                      agent_id: existingAgent.agent_id || existingAgent._id,
                      percentage: existingAgent.percentage?.toString() || '0',
                      reason: existingAgent.reason || '',
                    }
                  : undefined
              }
              onSubmit={async (data) => {
                await onSubmitForm(data);
              }}
              onDelete={async () => {
                await onDeleteForm?.();
              }}
              onCancel={onCancelForm}
              isLoading={isPending}
              isDeleteLoading={isDeletePending}
              isUpdateLoading={isUpdatePending}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AgentManagementSection;
