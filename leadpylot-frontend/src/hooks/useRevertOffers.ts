import { useState } from 'react';
import { apiGetRevert } from '@/services/OffersProgressService';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import React from 'react';

interface UseRevertOffersOptions {
    onSuccess?: (revertedCount: number) => void;
    onError?: (error: any) => void;
}

interface RevertResult {
    success: boolean;
    revertedCount: number;
    errors: string[];
}

export const useRevertOffers = (options?: UseRevertOffersOptions) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const revertOffers = async (offerIds: string[], params: string): Promise<RevertResult> => {
        if (!offerIds || offerIds.length === 0) {
            return { success: false, revertedCount: 0, errors: ['No offers selected'] };
        }

        setIsLoading(true);
        setError(null);

        let revertedCount = 0;
        const errors: string[] = [];

        try {
            // Process each offer one by one
            for (const offerId of offerIds) {
                try {
                    await apiGetRevert(offerId, params);
                    revertedCount++;
                } catch (offerError: any) {
                    const errorMessage = offerError?.response?.data?.message ||
                        offerError?.message ||
                        `Failed to revert offer ${offerId}`;
                    errors.push(errorMessage);
                }
            }

            const result: RevertResult = {
                success: revertedCount > 0,
                revertedCount,
                errors
            };

            // Show success notification
            if (revertedCount > 0) {
                toast.push(
                    React.createElement(
                        Notification,
                        {
                            title: 'Offers Reverted',
                            type: 'success'
                        },
                        `Successfully reverted ${revertedCount} out of ${offerIds.length} offer${offerIds.length > 1 ? 's' : ''}`
                    )
                );
            }

            // Show error notification if there were any errors
            if (errors.length > 0) {
                toast.push(
                    React.createElement(
                        Notification,
                        {
                            title: 'Some Reverts Failed',
                            type: 'warning'
                        },
                        `${errors.length} offer${errors.length > 1 ? 's' : ''} could not be reverted. Check console for details.`
                    )
                );
            }

            // Call success callback
            if (options?.onSuccess) {
                options.onSuccess(revertedCount);
            }

            return result;

        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to revert offers';
            setError(error);

            toast.push(
                React.createElement(
                    Notification,
                    {
                        title: 'Revert Failed',
                        type: 'danger'
                    },
                    errorMessage
                )
            );

            // Call error callback
            if (options?.onError) {
                options.onError(error);
            }

            return { success: false, revertedCount: 0, errors: [errorMessage] };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        revertOffers,
        isLoading,
        error
    };
};
