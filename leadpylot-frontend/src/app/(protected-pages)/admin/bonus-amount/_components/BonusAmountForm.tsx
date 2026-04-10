'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useBonusAmount, useBonusAmountMutations } from '@/services/hooks/settings/useBonus';
import { CreateBonusAmountRequest } from '@/services/settings/BonusService';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const BonusAmountSchema = z.object({
  name: z.string().min(1, 'Bonus Amount name is required'),
  amount: z.number().min(0, 'Amount must be 0 or greater'),
  code: z.string().min(1, 'Code is required'),
});

type BonusAmountForm = z.infer<typeof BonusAmountSchema>;

function BonusAmountForm({ type }: { type: 'create' | 'edit' }) {
  const { id } = useParams();

  // Get the bonus amount data when in edit mode
  const { data: bonusAmount, isLoading } = useBonusAmount(
    type === 'edit' && id ? (id as string) : ''
  );

  // Get mutations for create and update operations
  const { createBonusAmountMutation, updateBonusAmountMutation } = useBonusAmountMutations(
    type === 'edit' && id ? (id as string) : undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BonusAmountForm>({
    resolver: zodResolver(BonusAmountSchema),
    values: {
      name: bonusAmount?.name || '',
      amount: bonusAmount?.info?.amount || 0,
      code: bonusAmount?.info?.code || '',
    },
  });

  const onSubmit = (data: BonusAmountForm) => {
    const bonusData: CreateBonusAmountRequest = {
      name: data.name,
      amount: data.amount,
      code: data.code,
    };

    if (type === 'create') {
      createBonusAmountMutation.mutate(bonusData);
    } else if (type === 'edit' && id) {
      updateBonusAmountMutation.mutate(bonusData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h1>{type === 'create' ? 'Create Bonus Amount' : 'Edit Bonus Amount'}</h1>

        <div>
          <label className="mb-1 block text-sm font-medium">Bonus Amount</label>
          <Input
            {...register('name')}
            placeholder="e.g. Sales Bonus"
            invalid={!!errors?.name}
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
              invalid={!!errors.code}
              disabled={isLoading}
            />
            {errors.code && <span className="text-sm text-red-500">{errors.code.message}</span>}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="solid"
          icon={<ApolloIcon name="file" className="text-md" />}
          loading={createBonusAmountMutation.isPending || updateBonusAmountMutation.isPending}
          disabled={isLoading}
        >
          Save
        </Button>
      </div>
    </form>
  );
}

export default BonusAmountForm;
