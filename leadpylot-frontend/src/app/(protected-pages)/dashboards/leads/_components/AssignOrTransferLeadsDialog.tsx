'use client';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Switcher from '@/components/ui/Switcher';
import { Agent, Project } from '@/services/ProjectsService';
import { SelectOption } from '@/components/shared/CustomSelect';
import React from 'react';
import { SingleValue, ActionMeta } from 'react-select';

interface AssignOrTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;

  projects: Project[];
  selectedGroupBy: string[];
  groupedLeadsTransformLeads: boolean;
  transformLeads: boolean;

  selectedProjectId: string;
  selectedAgentId: string;
  selectLeadPrice: string | boolean;
  customPrice: number;
  makeFresh: boolean;
  restoreArchived: boolean;
  setRestoreArchived: (value: boolean) => void;
  isSubmitting: boolean;

  getProjectAgents: () => Agent[];
  getUserLogin: (id: string) => string;
  handleProjectChange: (
    newValue: SingleValue<SelectOption>,
    actionMeta: ActionMeta<SelectOption>
  ) => void;
  handleAssignSubmit: () => void;
  handleAssignSubmitTransform: () => void;

  setSelectedLeadPrice: (value: string) => void;
  setSelectedAgentId: (value: string) => void;
  setSelectedProjectId: (value: string) => void;
  setCustomPrice: (value: number) => void;
  setMakeFresh: (value: boolean) => void;

  // New prop for closed leads
  isClosedLeads?: boolean;
  // Current project and agent to exclude (for closed leads)
  currentProjectId?: string;
  currentAgentId?: string;
}

const AssignOrTransferLeadsDialog: React.FC<AssignOrTransferDialogProps> = ({
  isOpen,
  onClose,
  projects,
  selectedGroupBy,
  groupedLeadsTransformLeads,
  transformLeads,
  selectedProjectId,
  selectedAgentId,
  selectLeadPrice,
  customPrice,
  makeFresh,
  restoreArchived,
  setRestoreArchived,
  isSubmitting,
  getProjectAgents,
  getUserLogin,
  handleProjectChange,
  handleAssignSubmit,
  handleAssignSubmitTransform,
  setSelectedLeadPrice,
  setSelectedAgentId,
  setSelectedProjectId,
  setCustomPrice,
  setMakeFresh,
  isClosedLeads = false,
  currentProjectId,
  currentAgentId,
}) => {
  // For closed leads, always use Assign mode (not Transfer)
  const isTransferMode = isClosedLeads
    ? false
    : selectedGroupBy.length > 0
      ? groupedLeadsTransformLeads
      : transformLeads;

  const showLeadPrice = selectedGroupBy.length > 0 ? !groupedLeadsTransformLeads : !transformLeads;

  // For closed leads, always show lead price and don't show make fresh
  const showLeadPriceForClosed = isClosedLeads ? true : showLeadPrice;

  // For closed leads, always use handleAssignSubmit (not handleAssignSubmitTransform)
  const handleSubmit = isClosedLeads
    ? handleAssignSubmit
    : isTransferMode
      ? handleAssignSubmitTransform
      : handleAssignSubmit;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setSelectedLeadPrice('');
        setSelectedAgentId('');
        setSelectedProjectId('');
      }}
    >
      <div className="space-y-4">
        <h6 className="mb-4 text-lg font-semibold">
          {isTransferMode ? 'Transfer Leads' : 'Assign Leads'}
        </h6>

        {/* Project Select */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Project</label>
          <Select
            instanceId="project-select"
            placeholder="Please Select"
            options={projects
              .filter((project) => !isClosedLeads || project._id !== currentProjectId)
              .map((project) => ({
                value: project._id,
                label:
                  typeof project.name === 'string'
                    ? project?.name
                    : (project?.name as Record<string, string>)?.en_US || '',
              }))}
            value={
              selectedProjectId
                ? {
                    value: selectedProjectId,
                    label: (() => {
                      const project = projects?.find((p) => p?._id === selectedProjectId);
                      if (!project) return selectedProjectId;
                      return typeof project?.name === 'string'
                        ? project?.name
                        : (project?.name as Record<string, string>)?.en_US || '';
                    })(),
                  }
                : null
            }
            onChange={handleProjectChange}
          />
        </div>

        {/* Agent Select */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Agent</label>
          <Select
            instanceId="agent-select"
            placeholder="Please Select"
            options={getProjectAgents()
              ?.filter((agent: Agent) => {
                if (!isClosedLeads) return true;
                const userVal = agent?.user;
                const id = typeof userVal === 'string' ? userVal : userVal?._id || userVal?.id;
                return id !== currentAgentId;
              })
              .map((agent: Agent) => {
                const userVal = agent?.user;
                const id = typeof userVal === 'string' ? userVal : userVal?._id || userVal?.id;
                const label =
                  agent?.alias_name ||
                  (typeof userVal !== 'string' ? userVal?.name : undefined) ||
                  'Unknown';
                return { value: id || '', label };
              })}
            value={
              selectedAgentId
                ? {
                    value: selectedAgentId,
                    label: getUserLogin(selectedAgentId),
                  }
                : null
            }
            onChange={(newValue: SingleValue<SelectOption>) =>
              setSelectedAgentId(newValue?.value || '')
            }
          />
        </div>

        {/* Lead Price */}
        {showLeadPriceForClosed && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Lead Price</label>
            <Select
              instanceId="lead-price-select"
              placeholder="Please Select"
              options={[
                { value: 'free', label: 'Free' },
                { value: 'customPrice', label: 'Custom Price' },
                { value: 'recycle', label: 'Recycle' },
              ]}
              onChange={(newValue: SingleValue<SelectOption>) =>
                setSelectedLeadPrice(newValue?.value || '')
              }
            />
            {selectLeadPrice === 'customPrice' && (
              <Input
                type="number"
                placeholder="Enter custom price"
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
              />
            )}
          </div>
        )}

        {/* Make Fresh Switch - Hide for closed leads */}
        {!isClosedLeads && isTransferMode && (
          <div className="flex items-center space-x-2">
            <div className="ml-1 flex items-center space-x-2">
              <p>Make Fresh</p>
              <Switcher checked={makeFresh} onChange={setMakeFresh} />
            </div>
            {makeFresh && (
              <div className="ml-1 flex items-center space-x-2">
                <p>Restore Archived</p>
                <Switcher checked={restoreArchived} onChange={setRestoreArchived} />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={handleSubmit}
            disabled={!selectedProjectId || !selectedAgentId || isSubmitting}
          >
            {isSubmitting ? 'Assigning...' : isTransferMode ? 'Transfer' : 'Assign'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default AssignOrTransferLeadsDialog;
