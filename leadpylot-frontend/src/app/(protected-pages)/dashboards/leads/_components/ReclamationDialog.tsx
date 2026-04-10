'use client';
import React from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FormItem from '@/components/ui/Form/FormItem';

interface ReclamationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reclamationReason: string;
  isSubmitting: boolean;

  setReclamationReason: (value: string) => void;
  onSubmit: () => void;
}

const ReclamationDialog: React.FC<ReclamationDialogProps> = ({
  isOpen,
  onClose,
  reclamationReason,
  setReclamationReason,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h6 className="mb-4 text-lg font-semibold">Reclamation</h6>

        {/* Reason Input */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <FormItem label="Reason for Reclamation" className="mb-0">
              <Input
                value={reclamationReason}
                onChange={(e) => setReclamationReason(e.target.value)}
                placeholder="Enter the reason for reclamation"
              />
            </FormItem>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            loading={isSubmitting}
            onClick={onSubmit}
            disabled={!reclamationReason.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ReclamationDialog;
