import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dialog from '@/components/ui/Dialog/Dialog';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface RevertImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, objectId: string) => void;
  objectId: string;
  fileName?: string;
  loading?: boolean;
}

const RevertImportModal = ({
  isOpen,
  onClose,
  onConfirm,
  objectId,
  fileName,
  loading = false,
}: RevertImportModalProps) => {
  const [reason, setReason] = useState('');

  const trimmed = reason?.trim() ?? '';
  const isRevertExact = trimmed === 'REVERT';

  const handleSubmit = () => {
    if (isRevertExact) {
      onConfirm(trimmed, objectId);
      setReason('');
    }
  };

  const handleClose = () => {
    setReason(''); // Clear the input when closing
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} width={500} shouldCloseOnEsc={true}>
      <div className="">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">

          <div>
            <div className="flex items-center gap-2">
              <ApolloIcon name="emoji-sad-face" className="text-red-600" />
              <h3 className="text-sm font-semibold text-gray-900">Revert Import</h3>
            </div>
            <p className="text-xs text-gray-500 pl-6">
              This action will revert the import and cannot be undone
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          {/* File Info */}
          <div className="rounded-md bg-gray-50 p-3 border border-gray-200 space-y-1">
            <p className="text-xs text-gray-600">
              <span className="font-medium text-sm">File:</span> {fileName || 'Unknown file'}
            </p>
            <p className="text-xs text-gray-600">
              <span className="font-medium text-sm">Import ID:</span> {objectId}
            </p>
          </div>

          {/* Reason Input */}
          <div className="text-sm">
            <label htmlFor="revert-reason" className="block text-sm font-medium text-gray-700">
              To type <span className="text-red-500">REVERT</span> in the input field
            </label>
            <Input
              id="revert-reason"
              type="text"
              placeholder="type here..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full"
              disabled={loading}
              onKeyDown={handleKeyDown}
            />
            {trimmed.length > 0 && !isRevertExact && (
              <p className="mt-1 text-xs text-red-500">
                Please Type REVERT
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={loading} size="sm">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            size="sm"
            disabled={!isRevertExact || loading}
            icon={
              loading ? (
                <ApolloIcon name="loading" className="h-4 w-4 animate-spin" />
              ) : (
                <ApolloIcon name="rotate-right" />
              )
            }
          >
            {loading ? 'Reverting...' : 'Revert Import'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default RevertImportModal;
