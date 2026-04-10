import React from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface SelectOption {
  value: string;
  label: string;
}

interface LeadAssignmentDialogProps {
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
  lead?: any; // Add lead data to show current assignment
  assignment: any;
}

const LeadAssignmentDialog = ({
  isOpen,
  onClose,

  assignment,
}: LeadAssignmentDialogProps) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h6 className="mb-4 text-lg font-semibold">
          {assignment?.transformLeads ? 'Transfer Lead' : 'Assign Lead'}
        </h6>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Project</label>
          <Select
            instanceId="project-select"
            placeholder="Please Select"
            options={assignment?.projects?.map((project: any) => ({
              value: project?._id,
              label: project?.name,
            }))}
            value={
              assignment?.selectedProjectId
                ? {
                    value: assignment?.selectedProjectId,
                    label:
                      assignment?.projects?.find(
                        (p: any) => p?._id === assignment?.selectedProjectId
                      )?.name || assignment?.selectedProjectId,
                  }
                : null
            }
            onChange={assignment?.handleProjectChange}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Agent</label>
          <Select
            instanceId="agent-select"
            placeholder="Please Select"
            options={assignment?.getProjectAgents().map((agent: any) => {
              const userVal = agent?.user;
              const id = typeof userVal === 'string' ? userVal : userVal?._id || userVal?.id;
              const label =
                agent?.alias_name ||
                (typeof userVal !== 'string' ? userVal?.name : undefined) ||
                'Unknown';
              return { value: id, label };
            })}
            value={
              assignment?.selectedAgentId
                ? {
                    value: assignment?.selectedAgentId,
                    label: assignment?.getUserLogin(assignment?.selectedAgentId),
                  }
                : null
            }
            onChange={(option: SelectOption | null) =>
              assignment?.setSelectedAgentId(option?.value || '')
            }
          />
        </div>

        {!assignment?.transformLeads && (
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
              onChange={(option: SelectOption | null) =>
                assignment?.setSelectedLeadPrice(option?.value || '')
              }
            />
            {assignment?.selectLeadPrice === 'customPrice' && (
              <>
                <Input
                  type="number"
                  placeholder="Enter custom price"
                  value={assignment?.customPrice}
                  onChange={(e) => assignment?.setCustomPrice(Number(e.target.value))}
                />
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            className="w-full rounded-md border border-gray-300 p-2"
            rows={3}
            value={assignment?.notes}
            onChange={(e) => assignment?.setNotes(e.target.value)}
            placeholder="Optional notes about this assignment"
          />
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={
              assignment?.transformLeads
                ? assignment?.handleAssignSubmitTransform
                : assignment?.handleAssignSubmit
            }
            disabled={
              !assignment?.selectedProjectId ||
              !assignment?.selectedAgentId ||
              assignment?.isSubmitting
            }
          >
            {assignment?.isSubmitting
              ? assignment?.transformLeads
                ? 'Transferring...'
                : 'Assigning...'
              : assignment?.transformLeads
                ? 'Transfer'
                : 'Assign'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default LeadAssignmentDialog;
