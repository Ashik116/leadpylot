'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dialog from '@/components/ui/Dialog';
// import Upload from '@/components/ui/Upload';
// import { FcFolder } from 'react-icons/fc';

// // Constants for confirmation creation
// const CONFIRMATION_UPLOAD_CONFIG = {
//   accept: '.pdf,.doc,.docx,.png,.jpg,.jpeg',
//   supportPlaceholder: 'Support: PDF, DOC, DOCX, PNG, JPG, JPEG (Required)',
//   title: 'Create Confirmation with Documents',
// } as const;

interface CreateConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (notes?: string) => void;
  isCreating: boolean;
}

const CreateConfirmationDialog: React.FC<CreateConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  isCreating,
}) => {
  const [notes, setNotes] = useState('');

  // const handleFileChange = (files: File[]) => {
  //   setSelectedFiles(files);
  // };

  const handleCreate = () => {
    onCreate(notes.trim() || undefined);
    setNotes('');
    onClose();
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} width={600}>
      <h4 className="mb-4 text-lg font-semibold">Create Confirmation</h4>
      <div className="mb-6">
        {/* <p className="mb-4 text-sm text-gray-600">
          Upload confirmation documents. Files are required.
        </p> */}

        {/* Notes input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            rows={3}
            placeholder="Add any notes about this confirmation..."
          />
        </div>

        {/* <Upload
          multiple
          showList={true}
          accept={CONFIRMATION_UPLOAD_CONFIG.accept}
          className="h-40"
          onChange={handleFileChange}
          draggable
          fileList={selectedFiles}
        >
          <div className="my-16 text-center">
            <div className="mb-4 flex justify-center text-6xl">
              <FcFolder />
            </div>
            <p className="font-semibold">
              <span className="text-gray-800">Drop your files here, or </span>
              <span className="text-blue-500">browse</span>
            </p>
            <p className="mt-1 opacity-60">{CONFIRMATION_UPLOAD_CONFIG.supportPlaceholder}</p>
          </div>
        </Upload> */}
      </div>
      <div className="flex justify-between">
        <div className="flex space-x-2">
          <Button variant="plain" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={handleCreate}
            disabled={isCreating}
            icon={<ApolloIcon name="upload" className="text-md" />}
          >
            {isCreating ? 'Creating Confirmations...' : 'Create Confirmations'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default CreateConfirmationDialog;
