'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dialog from '@/components/ui/Dialog';
// import { FcFolder } from 'react-icons/fc';

interface CreateDocumentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: { notes?: string; files: File[] }) => void;
    isCreating: boolean;
    selectedCount: number;
    type: 'confirmation' | 'payment-voucher';
    title?: string;
    description?: string;
    notesLabel?: string;
    notesPlaceholder?: string;
    uploadConfig?: {
        accept: string;
        supportPlaceholder: string;
    };
    buttonText?: {
        creating: string;
        create: string;
    };
    buttonIcon?: string;
}

// const CONFIRMATION_UPLOAD_CONFIG = {
//     accept: '.pdf,.doc,.docx,.png,.jpg,.jpeg',
//     supportPlaceholder: 'Support: PDF, DOC, DOCX, PNG, JPG, JPEG (Required)',
//     title: 'Create Confirmation with Documents',
// } as const;

const CreatePaymentVoucherDialog: React.FC<CreateDocumentDialogProps> = ({
    isOpen,
    onClose,
    onCreate,
    isCreating,
}) => {
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<File[]>([]);

    const handleCreate = () => {
        onCreate({ notes: notes.trim() || undefined, files });
        setNotes('');
        setFiles([]);
        onClose();
    };

    const handleClose = () => {
        setNotes('');
        setFiles([]);
        onClose();
    };

    // const handleFileUpload = (uploadedFiles: File | File[] | null) => {
    //     if (Array.isArray(uploadedFiles)) {
    //         setFiles(uploadedFiles);
    //     } else if (uploadedFiles) {
    //         setFiles([uploadedFiles]);
    //     } else {
    //         setFiles([]);
    //     }
    // };

    return (
        <Dialog isOpen={isOpen} onClose={handleClose} width={600}>
            <h4 className="mb-4 text-lg font-semibold">Create Payment Voucher</h4>
            <div className="mb-6">
                <p className="mb-4 text-sm text-gray-600">Create a payment voucher for the selected offers</p>

                {/* Notes input */}
                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">Notes (Optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        rows={3}
                        placeholder="Add any notes about these payment vouchers..."
                    />
                </div>

                {/* File upload */}
                {/* <Upload
                    multiple
                    showList={true}
                    accept={CONFIRMATION_UPLOAD_CONFIG.accept}
                    className="h-40"
                    onChange={handleFileUpload}
                    draggable
                    fileList={files}
                >
                    <div className="my-16 text-center">
                        <div className="mb-4 flex justify-center text-6xl">
                            <FcFolder />
                        </div>
                        <p className="font-semibold">
                            <span className="text-gray-800">Drop your files here, or </span>
                            <span className="text-blue-500">browse</span>
                        </p>
                        <p className="mt-1 opacity-60">Support: PDF, DOC, DOCX, PNG, JPG, JPEG (Required)</p>
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
                        icon={<ApolloIcon name="plus" className="text-md" />}
                    >
                        {isCreating ? 'Creating...' : 'Create Payment Voucher'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

export default CreatePaymentVoucherDialog;