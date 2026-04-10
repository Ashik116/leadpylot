import { usePaymentTerm } from '@/services/hooks/settings/usePaymentsTerm';
import { CreatePaymentTermRequest } from '@/services/settings/PaymentsTerm';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCreatePaymentTerm, apiUpdatePaymentTerm } from '@/services/settings/PaymentsTerm';
import useNotification from '@/utils/hooks/useNotification';

const PaymentTermSchema = z.object({
    type: z.string().min(1, 'Type is required'),
    name: z.string().min(1, 'Name is required'),
    months: z.number().min(1, 'Months must be at least 1'),
    description: z.string().optional(),
});

export type PaymentTermForm = z.infer<typeof PaymentTermSchema>;

interface UsePaymentTermFormProps {
    type: 'create' | 'edit' | 'changePassword';
    id?: string;
    onSuccess?: () => void;
    existingData?: any;
    onClose?: () => void;
}

export function usePaymentTermForm({
    type,
    id,
    onSuccess,
    existingData,
    onClose,
}: UsePaymentTermFormProps) {
    const queryClient = useQueryClient();
    const { openNotification } = useNotification();

    const { data: paymentTerm, isLoading } = usePaymentTerm(
        type === 'edit' && id ? id : ''
    );

    const termData = existingData || paymentTerm;

    const createPaymentTermMutation = useMutation({
        mutationFn: (data: CreatePaymentTermRequest) => apiCreatePaymentTerm(data),
        onMutate: async (newTerm) => {
            await queryClient.cancelQueries({ queryKey: ['payment-terms'] });

            const queryKey = ['payment-terms', undefined];

            const previousTerms = queryClient.getQueryData(queryKey);

            const optimisticTerm = {
                _id: `temp-${Date.now()}`,
                type: newTerm?.type,
                name: newTerm?.name,
                info: {
                    type: newTerm?.type,
                    info: {
                        months: newTerm?.info?.months,
                        description: newTerm?.info?.description,
                    },
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            queryClient.setQueryData(queryKey, (old: any) =>
                old ? [...old, optimisticTerm] : [optimisticTerm]
            );

            return { previousTerms, queryKey };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
            const queryKey = ['payment-terms', undefined];
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return [data];
                return old?.map((term: any) => (term?._id?.startsWith('temp-') ? data : term));
            });
            openNotification({ type: 'success', massage: 'Payment term created successfully' });
            onSuccess?.();
            if (!onSuccess) {
                onClose?.();
            }
        },
        onError: (err, newTerm, context) => {
            const errorMessage = (err as any).response.data.error || 'Failed to create payment term';
            if (context?.queryKey) {
                queryClient.setQueryData(context.queryKey, context.previousTerms);
            }
            openNotification({ type: 'danger', massage: errorMessage });
        },
    });

    const updatePaymentTermMutation = useMutation({
        mutationFn: (data: Partial<CreatePaymentTermRequest>) =>
            apiUpdatePaymentTerm(data, id as string),
        onMutate: async (updatedData) => {
            await queryClient.cancelQueries({ queryKey: ['payment-terms'] });

            const queryKey = ['payment-terms', undefined];

            const previousTerms = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old?.map((term: any) =>
                    term?._id === id
                        ? {
                            ...term,
                            type: updatedData?.type || term?.type,
                            name: updatedData?.name || term?.name,
                            info: {
                                ...term?.info,
                                type: updatedData?.type || term?.info?.type,
                                info: {
                                    ...term?.info?.info,
                                    months: updatedData?.info?.months ?? term?.info?.info?.months,
                                    description: updatedData?.info?.description || term?.info?.info?.description,
                                },
                            },
                            updatedAt: new Date().toISOString(),
                        }
                        : term
                );
            });

            return { previousTerms, queryKey };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
            openNotification({ type: 'success', massage: 'Payment term updated successfully' });
            onSuccess?.();
            if (!onSuccess) {
                onClose?.();
            }
        },
        onError: (err, updatedData, context) => {
            const errorMessage = (err as any).response.data.error || 'Failed to update payment term';
            if (context?.queryKey) {
                queryClient.setQueryData(context.queryKey, context.previousTerms);
            }
            openNotification({ type: 'danger', massage: errorMessage });
        },
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<PaymentTermForm>({
        resolver: zodResolver(PaymentTermSchema),
        defaultValues: {
            type: '',
            name: '',
            months: 0,
            description: '',
        },
    });

    React.useEffect(() => {
        if (termData) {
            reset({
                type: termData?.info?.type || '',
                name: termData?.name || '',
                months: termData?.info?.info?.months || 0,
                description: termData?.info?.info?.description || '',
            });
        } else if (type === 'create') {
            reset({
                type: '',
                name: '',
                months: 0,
                description: '',
            });
        }
    }, [termData, type, reset]);

    const onSubmit = (data: PaymentTermForm) => {
        const paymentTermData: CreatePaymentTermRequest = {
            type: data.type,
            name: data.name,
            info: {
                months: data.months,
                description: data.description || '',
            },
        };

        if (type === 'create') {
            createPaymentTermMutation.mutate(paymentTermData);
        } else if (type === 'edit' && id) {
            updatePaymentTermMutation.mutate(paymentTermData);
        }
    };

    const showLoading = isLoading && type === 'edit' && !existingData;

    return {
        register,
        handleSubmit,
        errors,
        onSubmit,
        showLoading,
        termData,
        isLoading,
        createPaymentTermMutation,
        updatePaymentTermMutation,
    };
}

