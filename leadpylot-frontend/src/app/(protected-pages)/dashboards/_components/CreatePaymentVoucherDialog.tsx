import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Form from '@/components/ui/Form/Form';
import FormItem from '@/components/ui/Form/FormItem';
import Input from '@/components/ui/Input';
import React, { useState } from 'react';

interface CreatePaymentVoucherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { notes?: string; files?: File[] }) => Promise<void>;
  isCreating: boolean;
  selectedCount: number;
}

const CreatePaymentVoucherDialog = React.memo<CreatePaymentVoucherDialogProps>(
  ({ isOpen, onClose, onCreate, isCreating, selectedCount }) => {
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<File[]>([]);

    const handleSubmit = async () => {
      await onCreate({ notes, files });
      setNotes('');
      setFiles([]);
      onClose();
    };

    const handleClose = () => {
      setNotes('');
      setFiles([]);
      onClose();
    };


    return (
      <Dialog isOpen={isOpen} onClose={handleClose}>
        <div className="flex items-center justify-between">
          <h4>Create Payment Vouchers</h4>
        </div>
        <div className="mt-4">
          <p className="mb-4 text-sm text-gray-600">
            Creating payment vouchers for {selectedCount} selected confirmation
            {selectedCount > 1 ? 's' : ''}.
          </p>
          <Form>
            <FormItem label="Notes (Optional)">
              <Input
                type="text"
                textArea={true}
                placeholder="Enter notes for the payment vouchers..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isCreating}
              />
            </FormItem>
          </Form>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="plain" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button variant="solid" onClick={handleSubmit} loading={isCreating}>
            Create Payment Vouchers
          </Button>
        </div>
      </Dialog>
    );
  }
);

CreatePaymentVoucherDialog.displayName = 'CreatePaymentVoucherDialog';

export default CreatePaymentVoucherDialog;
