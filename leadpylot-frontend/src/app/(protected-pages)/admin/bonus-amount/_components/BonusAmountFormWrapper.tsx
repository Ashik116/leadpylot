'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useBonusAmount } from '@/services/hooks/settings/useBonus';
import { CreateBonusAmountRequest } from '@/services/settings/BonusService';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCreateBonusAmount, apiUpdateBonusAmount } from '@/services/settings/BonusService';
import useNotification from '@/utils/hooks/useNotification';
import Spinner from '@/components/ui/Spinner';

const BonusAmountSchema = z.object({
  name: z.string().min(1, 'Bonus Amount name is required'),
  amount: z.number().min(0, 'Amount must be 0 or greater'),
  code: z.string().min(1, 'Code is required'),
});

type BonusAmountForm = z.infer<typeof BonusAmountSchema>;

interface BonusAmountFormWrapperProps {
  type: 'create' | 'edit' | 'changePassword';
  id?: string;
  onSuccess?: () => void;
  isPage?: boolean;
  existingData?: any; // Pass existing data to avoid refetching
  onClose?: () => void;
}

function BonusAmountFormWrapper({
  type,
  id,
  onSuccess,
  isPage = true,
  existingData,
  onClose,
}: BonusAmountFormWrapperProps) {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  // Get the bonus amount data when in edit mode (only if not provided via existingData)
  const { data: bonusAmount, isLoading } = useBonusAmount(
    type === 'edit' && id && !existingData ? id : ''
  );

  // Use existing data if provided, otherwise use fetched data
  const bonusData = existingData || bonusAmount;

  const createBonusAmountMutation = useMutation({
    mutationFn: (data: CreateBonusAmountRequest) => apiCreateBonusAmount(data),
    onSuccess: (response) => {
      // Add the real response data to cache immediately
      queryClient.setQueryData(['bonus-amounts', undefined], (oldData: any) => {
        if (!oldData) return [response];
        return [...oldData, response];
      });

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['bonus-amounts'] });
      openNotification({ type: 'success', massage: 'Bonus amount created successfully' });
      onSuccess?.();
    },
    onError: () => {
      // Invalidate on error to reset any optimistic updates
      queryClient.invalidateQueries({ queryKey: ['bonus-amounts'] });
      openNotification({ type: 'danger', massage: 'Failed to create bonus amount' });
    },
  });

  const updateBonusAmountMutation = useMutation({
    mutationFn: (data: Partial<CreateBonusAmountRequest>) =>
      apiUpdateBonusAmount(data, id as string),
    onMutate: async (updatedData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bonus-amounts'] });

      // Get the exact query key used by the dashboard
      const queryKey = ['bonus-amounts', undefined];

      // Snapshot the previous value
      const previousBonuses = queryClient.getQueryData(queryKey);

      // Optimistically update the cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return old.map((bonus: any) =>
          bonus._id === id
            ? {
                ...bonus,
                name: updatedData?.name || bonus?.name,
                info: {
                  ...bonus?.info,
                  amount: updatedData?.amount ?? bonus?.info?.amount,
                  code: updatedData?.code || bonus?.info?.code,
                },
                updatedAt: new Date().toISOString(),
              }
            : bonus
        );
      });

      return { previousBonuses, queryKey };
    },
    onSuccess: () => {
      openNotification({ type: 'success', massage: 'Bonus amount updated successfully' });
      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: ['bonus-amounts'] });
    },
    onError: (err, updatedData, context) => {
      // Rollback on error
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousBonuses);
      }
      openNotification({ type: 'danger', massage: 'Failed to update bonus amount' });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BonusAmountForm>({
    resolver: zodResolver(BonusAmountSchema),
    defaultValues: {
      name: '',
      amount: 0,
      code: '',
    },
  });

  // Reset form with data when bonusData is available
  React.useEffect(() => {
    if (bonusData) {
      reset({
        name: bonusData?.name || '',
        amount: bonusData?.info?.amount || 0,
        code: bonusData?.info?.code || '',
      });
    } else if (type === 'create') {
      reset({
        name: '',
        amount: 0,
        code: '',
      });
    }
  }, [bonusData, type, reset]);

  const onSubmit = (data: BonusAmountForm) => {
    const bonusAmountData: CreateBonusAmountRequest = {
      name: data.name,
      amount: data.amount,
      code: data.code,
    };

    if (type === 'create') {
      createBonusAmountMutation.mutate(bonusAmountData);
    } else if (type === 'edit' && id) {
      updateBonusAmountMutation.mutate(bonusAmountData);
    }
  };

  // Show loading state only when we need to fetch data and don't have existing data
  const showLoading = isLoading && type === 'edit' && !existingData;

  if (showLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="text-blue-600" />
          <p className="text-sm text-gray-500">Loading bonus amount data...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 text-sm">
      <div className="space-y-2">
        {isPage && (
          <div className="flex items-center justify-between">
            <h1 className="text-lg capitalize">
              {type === 'create'
                ? 'Create Bonus Amount'
                : `${bonusData?.name || 'Bonus Amount'} Edit`}
            </h1>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              icon={<ApolloIcon name="times" className="text-md" />}
            ></Button>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Bonus Amount</label>
          <Input
            {...register('name')}
            placeholder="e.g. Sales Bonus"
            invalid={!!errors.name}
            disabled={isLoading}
          />
          {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
        </div>

        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Amount</label>
            <Input
              {...register('amount', { valueAsNumber: true })}
              placeholder="e.g. 1000"
              invalid={!!errors.amount}
              type="number"
              disabled={isLoading}
            />
            {errors.amount && <span className="text-sm text-red-500">{errors.amount.message}</span>}
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Code</label>
            <Input
              {...register('code')}
              placeholder="e.g. SB1K"
              invalid={!!errors?.code}
              disabled={isLoading}
            />
            {errors.code && <span className="text-sm text-red-500">{errors.code.message}</span>}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="secondary" onClick={onClose} size="sm">
          Close
        </Button>
        <Button
          type="submit"
          variant="solid"
          icon={<ApolloIcon name="file" className="text-md" />}
          loading={createBonusAmountMutation.isPending || updateBonusAmountMutation.isPending}
          disabled={isLoading}
        >
          {type === 'create' ? 'Create Bonus Amount' : 'Update Bonus Amount'}
        </Button>
      </div>
    </form>
  );
}

export default BonusAmountFormWrapper;
