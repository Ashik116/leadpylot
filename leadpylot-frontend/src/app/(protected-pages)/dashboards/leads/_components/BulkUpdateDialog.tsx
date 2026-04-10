'use client';

import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import FormItem from '@/components/ui/Form/FormItem';
import Notification from '@/components/ui/Notification';
import Select from '@/components/ui/Select';
import toast from '@/components/ui/toast';
import { useBulkUpdateLeadStatus, useSources } from '@/services/hooks/useLeads';
import { useBulkSearchStore } from '@/stores/bulkSearchStore';
import { useState, useMemo } from 'react';
import { useProjects } from '@/services/hooks/useProjects';
import { useStages } from '@/stores/stagesStore';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';

interface SelectOption {
  value: string;
  label: string;
}

interface BulkUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeads: string[];
  onSuccess?: () => void;
}

const BulkUpdateDialog = ({ isOpen, onClose, selectedLeads, onSuccess = () => { } }: BulkUpdateDialogProps) => {
  // Read from global store (already initialized in PostLoginLayout)
  const stages = useStages();
  const { data: projectsData } = useProjects({ limit: 100 });
  const { data: sourcesData } = useSources();

  const { isBulkSearchMode, refetchBulkSearch } = useBulkSearchStore();
  const { clearSelectedItems } = useSelectedItemsStore();
  const [formData, setFormData] = useState({
    stage: '',
    status: '',
    stageId: '',
    statusId: '',
    projectId: '',
    sourceId: ''
  });

  const bulkUpdateMutation = useBulkUpdateLeadStatus();

  // Create stage options from stages data
  const stageOptions: SelectOption[] = useMemo(() => {
    if (!stages || stages.length === 0) return [];
    return stages
      .filter((stage) => stage._id)
      .map((stage) => ({
        value: stage._id!,
        label: stage.name,
      }));
  }, [stages]);

  // Create status options based on selected stage
  const statusOptions: SelectOption[] = useMemo(() => {
    if (!formData.stageId || !stages || stages.length === 0) return [];

    const selectedStage = stages.find((stage) => stage._id === formData.stageId);
    if (!selectedStage?.info?.statuses) return [];

    return selectedStage?.info?.statuses
      ?.filter((status) => status?.allowed && status?._id)
      ?.map((status) => ({
        value: status._id!,
        label: status.name,
      }));
  }, [formData.stageId, stages]);

  const handleStageChange = (stageId: string) => {
    const selectedStage = stages?.find((stage) => stage._id === stageId);
    setFormData((prev) => ({
      ...prev,
      stage: selectedStage?.name || '',
      stageId,
      status: '', // Reset status when stage changes
      statusId: '',
    }));
  };

  const handleStatusChange = (statusId: string) => {
    const selectedStage = stages?.find((stage) => stage._id === formData.stageId);
    const selectedStatus = selectedStage?.info?.statuses?.find((status) => status._id === statusId);
    setFormData((prev) => ({
      ...prev,
      status: selectedStatus?.name || '',
      statusId,
    }));
  };

  // Create project options from projects data (normalize API union response)
  const projectOptions: SelectOption[] = useMemo(() => {
    const list: any[] = Array.isArray(projectsData)
      ? (projectsData as any[])
      : ((projectsData as any)?.data ?? []);
    return list
      .filter((p: any) => p && p._id)
      .map((p: any) => ({
        value: p._id as string,
        label: typeof p.name === 'string' ? p.name : p.name?.en_US || '',
      }));
  }, [projectsData]);

  const sourceOptions: SelectOption[] = useMemo(() => {
    const list: any[] = Array.isArray(sourcesData)
      ? (sourcesData as any[])
      : ((sourcesData as any)?.data ?? []);
    return list
      .filter((p: any) => p && p._id)
      .map((p: any) => ({
        value: p._id as string,
        label: typeof p.name === 'string' ? p.name : p.name?.en_US || '-',
      }));
  }, [sourcesData]);

  const handleSubmit = async () => {
    if ((!formData?.stageId || !formData?.statusId) && !formData?.projectId && !formData?.sourceId) {
      toast.push(
        <Notification title="Missing Fields" type="warning">
          Please select both stage, status and project
        </Notification>
      );
      return;
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        leadIds: selectedLeads.map((lead) => (typeof lead === 'string' ? lead : (lead as any)._id)),
        stage_id: formData.stageId ? formData.stageId : undefined,
        status_id: formData.statusId ? formData.statusId : undefined,
        project_id: formData.projectId ? formData.projectId : undefined,
        source_id: formData.sourceId ? formData.sourceId : undefined
      });

      toast.push(
        <Notification title="Success" type="success">
          Successfully updated {selectedLeads?.length} lead{selectedLeads?.length !== 1 ? 's' : ''}
        </Notification>
      );

      // Refetch bulk search results if in bulk search mode
      if (isBulkSearchMode) {
        await refetchBulkSearch();
      }
      console.log('onSuccess');
      onSuccess?.();
      handleClose();
      clearSelectedItems();
    } catch (error) {
      // Error is handled by the mutation
      console.log(error);
    }
  };

  const handleClose = () => {
    setFormData({
      stage: '',
      status: '',
      stageId: '',
      statusId: '',
      projectId: '',
      sourceId: ''
    });
    onClose();
  };

  const hasChanges = formData?.stageId !== '' && formData?.statusId !== '';
  return (
    <Dialog isOpen={isOpen} onClose={handleClose} width={600}>
      <div className="space-y-4">
        <h6 className="mb-4 text-lg font-semibold">
          Bulk Update Lead Status ({selectedLeads?.length} selected)
        </h6>

        <div className="mb-4 text-sm text-gray-600">
          Update the stage and status for multiple leads at once.
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 md:gap-2">
          <FormItem label="Stage">
            <Select
              instanceId="stage-select"
              placeholder="Select stage"
              options={stageOptions}
              value={
                formData?.stageId
                  ? stageOptions?.find((opt) => opt?.value === formData?.stageId)
                  : null
              }
              onChange={(option: SelectOption | null) => handleStageChange(option?.value || '')}
            />
          </FormItem>

          <FormItem label="Status">
            <Select
              instanceId="status-select"
              placeholder="Select status"
              options={statusOptions}
              value={
                formData?.statusId
                  ? statusOptions?.find((opt) => opt?.value === formData?.statusId)
                  : null
              }
              onChange={(option: SelectOption | null) => handleStatusChange(option?.value || '')}
              isDisabled={!formData?.stageId}
            />
          </FormItem>
          <FormItem label="Project">
            <Select
              instanceId="project-select"
              placeholder="Select project"
              options={projectOptions}
              value={
                formData.projectId
                  ? projectOptions.find((opt) => opt.value === formData.projectId) || null
                  : null
              }
              onChange={(option: SelectOption | null) =>
                setFormData((prev) => ({ ...prev, projectId: option?.value || '' }))
              }
            />
          </FormItem>
          <FormItem label="Sources">
            <Select
              instanceId="source-select"
              placeholder="Select Source"
              options={sourceOptions}
              value={
                formData.sourceId
                  ? sourceOptions.find((opt) => opt.value === formData.sourceId) || null
                  : null
              }
              onChange={(option: SelectOption | null) =>
                setFormData((prev) => ({ ...prev, sourceId: option?.value || '' }))
              }
            />
          </FormItem>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="default" onClick={handleClose} disabled={bulkUpdateMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={handleSubmit}
            disabled={(!hasChanges || bulkUpdateMutation.isPending) && !formData?.projectId && !formData.sourceId}
            loading={bulkUpdateMutation.isPending}
          >
            {bulkUpdateMutation.isPending ? 'Updating...' : 'Update Leads'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default BulkUpdateDialog;
