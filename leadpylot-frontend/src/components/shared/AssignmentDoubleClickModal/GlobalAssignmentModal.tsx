import React, { useEffect, useState } from 'react';
import { useAssignmentModalStore } from '@/stores/assignmentModalStore';
import { useAssignLeads, useAssignLeadsTransform } from '@/services/hooks/useLeads';
import { useProjects } from '@/services/hooks/useProjects';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useRouter } from 'next/navigation';
import Dialog from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

interface SelectOption {
  value: string;
  label: string;
}

const GlobalAssignmentModal: React.FC = () => {
  const { selectedLead, isOpen, closeAssignmentModal } = useAssignmentModalStore();
  const router = useRouter();

  // State for assignment dialog
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectLeadPrice, setSelectedLeadPrice] = useState('');
  const [customPrice, setCustomPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transformLeads, setTransformLeads] = useState(false);

  // Mutations
  const assignLeadsMutation = useAssignLeads({ queryKey: ['lead', selectedLead?._id || ''] });
  const assignLeadsMutationTransform = useAssignLeadsTransform({
    queryKey: ['lead', selectedLead?._id || ''],
  });

  // Fetch projects
  const { data: projectsData } = useProjects();
  const projects = (projectsData as any)?.data || [];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && selectedLead) {
      // Check if lead is in use
      if (selectedLead?.use_status === 'in_use') {
        setTransformLeads(true);
        // Pre-populate current project and agent for transfer
        const projects = selectedLead?.project;
        if (Array.isArray(projects) && projects?.length > 0) {
          const currentProject = projects[0];
          if (currentProject?._id) {
            setSelectedProjectId(currentProject?._id);
          }
          if (currentProject?.agent?._id) {
            setSelectedAgentId(currentProject?.agent?._id);
          }
        }
      } else {
        setTransformLeads(false);
      }

      // Reset other state
      setNotes('');
      setSelectedLeadPrice('');
      setCustomPrice(0);
    }
  }, [isOpen, selectedLead]);

  const handleClose = () => {
    closeAssignmentModal();
    setSelectedProjectId('');
    setSelectedAgentId('');
    setNotes('');
    setSelectedLeadPrice('');
    setCustomPrice(0);
  };

  const handleAssignSubmit = async () => {
    if (!selectedProjectId || !selectedAgentId || !selectedLead) {
      toast.push(
        <Notification title="Error" type="danger">
          Please select both project and agent
        </Notification>
      );
      return;
    }

    const submitData = {
      projectId: selectedProjectId,
      leadIds: [selectedLead?._id],
      agentId: selectedAgentId,
      notes: notes || 'Optional notes about this assignment',
      leadPrice: selectLeadPrice === 'customPrice' ? customPrice : 0,
    };

    setIsSubmitting(true);
    try {
      const result = await assignLeadsMutation.mutateAsync(submitData);
      toast.push(<Notification type="success">{result?.message}</Notification>);
      handleClose();
      router.refresh();
    } catch (error: any) {
      toast.push(
        <Notification title="Assignment Failed" type="danger">
          {error?.message || 'Failed to assign lead. Please try again.'}
        </Notification>
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSubmitTransform = async () => {
    if (!selectedProjectId || !selectedAgentId || !selectedLead) {
      toast.push(
        <Notification title="Error" type="danger">
          Please select both project and agent
        </Notification>
      );
      return;
    }

    const submitData = {
      toProjectId: selectedProjectId,
      leadIds: [selectedLead?._id],
      toAgentUserId: selectedAgentId,
      notes: notes,
    };

    setIsSubmitting(true);
    try {
      const result = await assignLeadsMutationTransform.mutateAsync(submitData);
      toast.push(<Notification type="success">{result?.message}</Notification>);
      handleClose();
      router.refresh();
    } catch (error: any) {
      toast.push(
        <Notification title="Assignment Failed" type="danger">
          {error?.message || 'Failed to assign lead. Please try again.'}
        </Notification>
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Project change resets agent selection
  const handleProjectChange = (option: SelectOption | null) => {
    if (!option) return;
    const project = projects?.find((p: any) => p?._id === option?.value);
    setSelectedProjectId(project?._id || '');
    setSelectedAgentId('');
  };

  const getProjectAgents = () => {
    const project = projects?.find((p: any) => p?._id === selectedProjectId);
    const agents = project?.agents || [];
    return agents.filter((agent: any) => {
      const userVal = agent?.user;
      if (typeof userVal === 'string') return Boolean(userVal);
      return Boolean(userVal && (userVal._id || userVal.id));
    });
  };

  const getUserLogin = (agentId: string) => {
    const agent = getProjectAgents()?.find((a: any) => a?.user?._id === agentId);
    return agent?.user?.name || 'Unknown';
  };

  // Only render if we have a selected lead and the modal should be open
  if (!selectedLead || !isOpen) {
    return null;
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        <h6 className="mb-4 text-lg font-semibold">
          {transformLeads ? 'Transfer Lead' : 'Assign Lead'}
        </h6>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Project</label>
          <Select
            instanceId="project-select"
            placeholder="Please Select"
            options={projects?.map((project: any) => ({
              value: project?._id,
              label: project?.name,
            }))}
            value={
              selectedProjectId
                ? {
                    value: selectedProjectId,
                    label:
                      projects?.find((p: any) => p?._id === selectedProjectId)?.name ||
                      selectedProjectId,
                  }
                : null
            }
            onChange={handleProjectChange}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Agent</label>
          <Select
            instanceId="agent-select"
            placeholder="Please Select"
            options={getProjectAgents()?.map((agent: any) => {
              const userVal = agent?.user;
              const id = typeof userVal === 'string' ? userVal : userVal?._id || userVal?.id;
              const label =
                agent?.alias_name ||
                (typeof userVal !== 'string' ? userVal?.name : undefined) ||
                'Unknown';
              return { value: id, label };
            })}
            value={
              selectedAgentId
                ? {
                    value: selectedAgentId,
                    label: getUserLogin(selectedAgentId),
                  }
                : null
            }
            onChange={(option: SelectOption | null) => {
              if (option) {
                setSelectedAgentId(option?.value);
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            className="w-full rounded-md border border-gray-300 p-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this assignment"
          />
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={transformLeads ? handleAssignSubmitTransform : handleAssignSubmit}
            disabled={!selectedProjectId || !selectedAgentId || isSubmitting}
          >
            {isSubmitting
              ? transformLeads
                ? 'Transferring...'
                : 'Assigning...'
              : transformLeads
                ? 'Transfer'
                : 'Assign'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default GlobalAssignmentModal;
