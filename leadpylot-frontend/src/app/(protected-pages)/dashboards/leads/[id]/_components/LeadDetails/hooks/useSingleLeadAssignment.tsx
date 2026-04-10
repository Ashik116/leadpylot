import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { useAssignLeads, useAssignLeadsTransform } from '@/services/hooks/useLeads';
import { useProjects } from '@/services/hooks/useProjects';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useRouter } from 'next/navigation';

interface UseSingleLeadAssignmentProps {
  leadId: string;
  lead?: any; // Add lead data to check use_status
}

interface SelectOption {
  value: string;
  label: string;
}

export const useSingleLeadAssignment = ({ leadId, lead }: UseSingleLeadAssignmentProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'Admin';
  const isProvider = session?.user?.role === 'Provider';

  // State for assignment dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectLeadPrice, setSelectedLeadPrice] = useState('');
  const [customPrice, setCustomPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transformLeads, setTransformLeads] = useState(false);

  useEffect(() => {
    if (lead?.use_status === 'in_use') {
      setTransformLeads(true);
      // Pre-populate current project and agent for transfer
      if (lead?.project?.[0]?._id) {
        setSelectedProjectId(lead?.project[0]?._id);
      }
      if (lead?.project?.[0]?.agent?._id) {
        setSelectedAgentId(lead?.project[0]?.agent?._id);
      }
    } else {
      setTransformLeads(false);
    }
  }, [lead]);

  // Mutations
  const assignLeadsMutation = useAssignLeads({ queryKey: ['lead', leadId] });
  const assignLeadsMutationTransform = useAssignLeadsTransform({ queryKey: ['lead', leadId] });

  // Fetch projects
  const { data: projectsData } = useProjects();
  const projects = (projectsData as any)?.data || [];

  // Handle assign lead
  const handleAssignLead = () => {
    setIsAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setIsAssignDialogOpen(false);
    setSelectedProjectId('');
    setSelectedAgentId('');
    setNotes('');
    setSelectedLeadPrice('');
    setCustomPrice(0);
  };

  const handleAssignSubmit = async () => {
    if (!selectedProjectId || !selectedAgentId) {
      toast.push(
        <Notification title="Error" type="danger">
          Please select both project and agent
        </Notification>
      );
      return;
    }

    const submitData = {
      projectId: selectedProjectId,
      leadIds: [leadId],
      agentId: selectedAgentId,
      notes: notes || 'Optional notes about this assignment',
      leadPrice: selectLeadPrice === 'customPrice' ? customPrice : 0,
    };

    setIsSubmitting(true);
    try {
      const result = await assignLeadsMutation.mutateAsync(submitData);

      toast.push(<Notification type="success">{result?.message}</Notification>);
      setIsAssignDialogOpen(false);
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
    if (!selectedProjectId || !selectedAgentId) {
      toast.push(
        <Notification title="Error" type="danger">
          Please select both project and agent
        </Notification>
      );
      return;
    }

    const submitData = {
      toProjectId: selectedProjectId,
      leadIds: [leadId],
      toAgentUserId: selectedAgentId,
      notes: notes,
    };

    setIsSubmitting(true);
    try {
      const result = await assignLeadsMutationTransform.mutateAsync(submitData);

      toast.push(<Notification type="success">{result?.message}</Notification>);
      setIsAssignDialogOpen(false);
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
    return agents?.filter((agent: any) => {
      const userVal = agent?.user;
      if (typeof userVal === 'string') return Boolean(userVal);
      return Boolean(userVal && (userVal?._id || userVal?.id));
    });
  };

  const getUserLogin = (agentId: string) => {
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

  return {
    // State
    isAssignDialogOpen,
    selectedProjectId,
    selectedAgentId,
    notes,
    selectLeadPrice,
    customPrice,
    isSubmitting,
    transformLeads,
    projects,

    // Actions
    handleAssignLead,
    handleCloseAssignDialog,
    handleAssignSubmit,
    handleAssignSubmitTransform,
    handleProjectChange,
    getProjectAgents,
    getUserLogin,

    // Setters
    setSelectedProjectId,
    setSelectedAgentId,
    setNotes,
    setSelectedLeadPrice,
    setCustomPrice,
    setTransformLeads,

    // Permissions
    isAdmin,
    isProvider,
    canAssign: isAdmin || isProvider,
  };
};
