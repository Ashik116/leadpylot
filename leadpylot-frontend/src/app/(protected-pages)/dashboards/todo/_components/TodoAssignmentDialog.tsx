import React from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useProjects } from '@/services/hooks/useProjects';

interface SelectOption {
  value: string;
  label: string;
}

interface TodoAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string; // Add projectId prop
  selectedAgentId: string;
  onAgentChange: (agentId: string) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

const TodoAssignmentDialog = ({
  isOpen,
  onClose,
  projectId,
  selectedAgentId,
  onAgentChange,
  onConfirm,
  isSubmitting,
}: TodoAssignmentDialogProps) => {
  // Fetch projects
  const { data: projectsData, isLoading, error } = useProjects();
  const projects = Array.isArray(projectsData) ? projectsData : projectsData?.data || [];

  // Get agents for the provided project
  const getProjectAgents = () => {
    if (!projectId) {
      // Fallback: show all agents from all projects
      const allAgents: any[] = [];
      projects?.forEach((project: any) => {
        if (project?.agents) {
          const projectAgents = project?.agents?.filter((agent: any) => {
            const userVal = agent?.user;
            if (typeof userVal === 'string') return Boolean(userVal);
            return Boolean(userVal && (userVal?._id || userVal?.id));
          });
          allAgents.push(...projectAgents);
        }
      });
      return allAgents;
    }

    const project = projects?.find((p: any) => p?._id === projectId) as any;

    if (!project) {
      // Fallback: show all agents from all projects
      const allAgents: any[] = [];
      projects?.forEach((project: any) => {
        if (project?.agents) {
          const projectAgents = project?.agents?.filter((agent: any) => {
            const userVal = agent?.user;
            if (typeof userVal === 'string') return Boolean(userVal);
            return Boolean(userVal && (userVal?._id || userVal?.id));
          });
          allAgents.push(...projectAgents);
        }
      });
      return allAgents;
    }

    const agents =
      project?.agents?.filter((agent: any) => {
        const userVal = agent?.user;
        if (typeof userVal === 'string') return Boolean(userVal);
        return Boolean(userVal && (userVal?._id || userVal?.id));
      }) || [];
    return agents;
  };

  // Get user name for display
  const getUserName = (agentId: string) => {
    const agent = getProjectAgents()?.find((a: any) => {
      const userVal = a?.user;
      const uid = typeof userVal === 'string' ? userVal : userVal?._id || userVal?.id;
      return uid === agentId;
    });
    return (
      (agent as any)?.alias_name ||
      (typeof (agent as any)?.user !== 'string' ? (agent as any)?.user?.name : undefined) ||
      'Unknown'
    );
  };

  // Transform agents to select options
  const agentOptions: SelectOption[] = getProjectAgents()?.map((agent: any) => {
    const userVal = agent?.user;
    const id = typeof userVal === 'string' ? userVal : userVal?._id || userVal?.id;
    const label =
      agent?.alias_name || (typeof userVal !== 'string' ? userVal?.name : undefined) || 'Unknown';
    return { value: id, label };
  });

  return (
    <Dialog isOpen={isOpen} onClose={onClose} >
      <div className="space-y-4" onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}>
        <h6 className="mb-4 text-lg font-semibold">Assign Todo</h6>

        {isLoading && <div className="text-sm text-gray-500">Loading agents...</div>}

        {error && (
          <div className="text-sm text-red-500">Error loading projects: {error.message}</div>
        )}

        {!projectId && (
          <div className="text-sm text-blue-500">Showing agents from all projects</div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Agent</label>
          <Select
            instanceId="agent-select"
            placeholder={isLoading ? 'Loading...' : 'Please Select'}
            options={agentOptions}
            value={
              selectedAgentId
                ? {
                  value: selectedAgentId,
                  label: getUserName(selectedAgentId),
                }
                : null
            }
            onChange={(option: SelectOption | null) => onAgentChange(option?.value || '')}
            isDisabled={isLoading}
          />
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={onConfirm}
            disabled={!selectedAgentId || isSubmitting || isLoading}
          >
            {isSubmitting ? 'Assigning...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default TodoAssignmentDialog;
