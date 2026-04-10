import { useCallback } from 'react';
import { useUpdateOffer } from '@/services/hooks/useLeads';
import { useUpdateOpening } from '@/services/hooks/useOpenings';
import { useAddDocumentsToPaymentVoucher } from '@/services/hooks/usePaymentVouchers';
import { useUpdateConfirmation } from '@/services/hooks/useConfirmations';
import { OpeningFileType } from '@/services/OpeningsService';

interface UseFileUploadOptions {
    onSuccess?: () => void;
    onError?: (error: any) => void;
}

export const useFileUpload = (options?: UseFileUploadOptions) => {
    // Initialize all possible mutations
    const updateOfferMutation = useUpdateOffer({
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    });

    const updateOpeningMutation = useUpdateOpening({
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    });

    const addDocumentsToPaymentVoucherMutation = useAddDocumentsToPaymentVoucher();
    const updateConfirmationMutation = useUpdateConfirmation();

    const handleFileUpload = useCallback(
        async (id: string, files: File[] | null, table?: string, type?: string) => {
            if (!files || files.length === 0) return;

            try {
                // Create FormData for file upload
                const formData = new FormData();
                files.forEach((file) => {
                    formData.append('files', file);
                });
                formData.append('documentType', type as string);

                // Route to appropriate mutation based on table type
                switch (table) {
                    case 'offer':
                        await updateOfferMutation.mutateAsync({
                            id: id,
                            data: formData as any,
                        });
                        break;

                    case 'opening':
                        await updateOpeningMutation.mutateAsync({
                            id: id,
                            data: { files: formData as any, documentType: type as OpeningFileType },
                        });
                        break;

                    case 'confirmation':
                        await updateConfirmationMutation.mutateAsync({
                            id: id,
                            data: { files },
                        });
                        break;

                    case 'payment_voucher':
                    default:
                        await addDocumentsToPaymentVoucherMutation.mutateAsync({
                            id: id,
                            data: formData,
                        });
                        break;
                }

                console.log(`Files uploaded successfully for ${table || 'payment_voucher'}:`, id);
            } catch (error) {
                console.error('Error uploading files:', error);
                if (options?.onError) {
                    options.onError(error);
                }
            }
        },
        [
            updateOfferMutation,
            updateOpeningMutation,
            addDocumentsToPaymentVoucherMutation,
            updateConfirmationMutation,
            options?.onError,
        ]
    );

    return {
        handleFileUpload,
        isUploading:
            updateOfferMutation.isPending ||
            updateOpeningMutation.isPending ||
            addDocumentsToPaymentVoucherMutation.isPending ||
            updateConfirmationMutation.isPending,
    };
}; 