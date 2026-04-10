'use client';
import React, { useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import FormItem from '@/components/ui/Form/FormItem';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { SelectOption } from '@/components/shared/CustomSelect';
import { useMetadataOptions } from '@/services/hooks/useLeads';

interface CloseProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  closureReason: string;
  closeProjectCurrentStatus: string;
  closeProjectNotes: string;
  isSubmitting: boolean;
  selectedLeads: any[];

  setClosureReason: (value: string) => void;
  setCloseProjectCurrentStatus: (statusId: string) => void;
  setCloseProjectNotes: (notes: string) => void;
  onSubmit: () => void;
}

const CloseProjectDialog: React.FC<CloseProjectDialogProps> = ({
  isOpen,
  onClose,
  closureReason,
  closeProjectCurrentStatus,
  closeProjectNotes,
  setClosureReason,
  setCloseProjectCurrentStatus,
  setCloseProjectNotes,
  isSubmitting,
  selectedLeads,
  onSubmit,
}) => {
  const { data: metadata, isFetching: metadataLoading } = useMetadataOptions('Lead', {
    enabled: isOpen,
  });

  const closureReasonOptions = [
    { value: 'project_completed', label: 'Project Completed' },
    { value: 'client_request', label: 'Client Request' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions: SelectOption[] = useMemo(() => {
    const statusField = metadata?.filterOptions?.find((f) => f.field === 'status_id');
    const vals = statusField?.values ?? [];
    return vals.map((v) => ({
      value: String(v._id),
      label: String(v.value),
    }));
  }, [metadata]);

  const getClosureReasonLabel = () => {
    const selected = closureReasonOptions?.find((o) => o?.value === closureReason);
    return selected?.label || 'Project Completed';
  };

  const statusValue = useMemo(() => {
    if (!closeProjectCurrentStatus) return null;
    const opt = statusOptions.find((o) => o.value === closeProjectCurrentStatus);
    return opt ?? { value: closeProjectCurrentStatus, label: closeProjectCurrentStatus };
  }, [closeProjectCurrentStatus, statusOptions]);

  const showOtherNotes = closureReason === 'other';
  const otherNotesValid = !showOtherNotes || closeProjectNotes.trim().length > 0;
  const canSubmit =
    !!selectedLeads?.length && !!closureReason && otherNotesValid && !isSubmitting;

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h6 className="mb-4 text-lg font-semibold">Close Project</h6>

        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <FormItem label="Reason for Closure" className="mb-0">
              <Select
                instanceId="closure-reason-select"
                placeholder="Please Select"
                options={closureReasonOptions}
                value={{
                  value: closureReason,
                  label: getClosureReasonLabel(),
                }}
                onChange={(option: SelectOption | null) => {
                  const next = option?.value || 'project_completed';
                  setClosureReason(next);
                  if (next !== 'other') {
                    setCloseProjectNotes('');
                  }
                }}
              />
            </FormItem>
          </div>
          <div className="flex-1">
            <FormItem label="Status (optional)" className="mb-0">
              <Select
                instanceId="close-project-status-select"
                placeholder={metadataLoading ? 'Loading statuses…' : 'Select status'}
                options={statusOptions}
                value={statusValue}
                isClearable
                isLoading={metadataLoading}
                isDisabled={isSubmitting || metadataLoading}
                onChange={(option: SelectOption | null) =>
                  setCloseProjectCurrentStatus(option?.value ?? '')
                }
              />
            </FormItem>
          </div>
        </div>

        {showOtherNotes ? (
          <FormItem label="Describe the reason for closure" className="mb-0">
            <Input
              textArea
              rows={4}
              value={closeProjectNotes}
              onChange={(e) => setCloseProjectNotes(e.target.value)}
              placeholder="Enter details…"
              disabled={isSubmitting}
            />
          </FormItem>
        ) : null}

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="default" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="solid" loading={isSubmitting} onClick={onSubmit} disabled={!canSubmit}>
            {isSubmitting ? 'Closing Project...' : 'Close Project'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default CloseProjectDialog;
