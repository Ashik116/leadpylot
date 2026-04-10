import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Form from '@/components/ui/Form/Form';
import FormItem from '@/components/ui/Form/FormItem';
import Input from '@/components/ui/Input';
import React, { useState } from 'react';

interface CreateConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (notes?: string) => Promise<void>;
  isCreating: boolean;
}

const CreateConfirmationDialog = React.memo<CreateConfirmationDialogProps>(
  ({ isOpen, onClose, onCreate, isCreating }) => {
    const [referenceCode, setReferenceCode] = useState<string | null>(null);
    const [showError, setShowError] = useState(false);

    const handleSubmit = async () => {
      if (!referenceCode || !referenceCode.trim()) {
        setShowError(true);
        return;
      }
      setShowError(false);
      await onCreate(referenceCode);
      setReferenceCode(null);
    };

    const handleClose = () => {
      setReferenceCode(null);
      setShowError(false);
      onClose();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setReferenceCode(value);
      // Clear error when user starts typing
      if (value.trim() && showError) {
        setShowError(false);
      }
    };

    return (
      <Dialog isOpen={isOpen} onClose={handleClose}>
        <div className="flex items-center justify-between">
          <h4>Create Confirmation</h4>
        </div>
        <div className="mt-4">
          <Form>
            <FormItem
              label="Reference Code"
              invalid={showError}
              errorMessage={showError ? "Reference code is required" : undefined}
            >
              <Input
                type="text"
                placeholder="Enter reference code"
                value={referenceCode || ''}
                onChange={handleInputChange}
                disabled={isCreating}
                className={showError ? "border-red-500 focus:border-red-500" : ""}
              />
            </FormItem>
          </Form>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="plain" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button variant="solid" onClick={handleSubmit} loading={isCreating}>
            Create Confirmation
          </Button>
        </div>
      </Dialog>
    );
  }
);

CreateConfirmationDialog.displayName = 'CreateConfirmationDialog';

export default CreateConfirmationDialog;
