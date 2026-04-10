'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { usePaymentTerm, usePaymentTermMutations } from '@/services/hooks/settings/usePaymentsTerm';
import { CreatePaymentTermRequest } from '@/services/settings/PaymentsTerm';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const PaymentTermSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  name: z.string().min(1, 'Name is required'),
  months: z.number().min(1, 'Months must be at least 1'),
  description: z.string().min(1, 'Description is required'),
});

type PaymentTermForm = z.infer<typeof PaymentTermSchema>;

function PaymentTermForm({ type }: { type: 'create' | 'edit' }) {
  const { id } = useParams();

  // Get the payment term data when in edit mode
  const { data: paymentTerm, isLoading } = usePaymentTerm(
    type === 'edit' && id ? (id as string) : ''
  );

  // Get mutations for create and update operations
  const { createPaymentTermMutation, updatePaymentTermMutation } = usePaymentTermMutations(
    type === 'edit' && id ? (id as string) : undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentTermForm>({
    resolver: zodResolver(PaymentTermSchema),
    values: {
      type: paymentTerm?.info?.type || '',
      name: paymentTerm?.name || '',
      months: paymentTerm?.info?.info?.months || 0,
      description: paymentTerm?.info?.info?.description || '',
    },
  });

  const onSubmit = (data: PaymentTermForm) => {
    const paymentTermData: CreatePaymentTermRequest = {
      type: data?.type,
      name: data?.name,
      info: {
        months: data?.months,
        description: data?.description,
      },
    };

    if (type === 'create') {
      createPaymentTermMutation.mutate(paymentTermData);
    } else if (type === 'edit' && id) {
      updatePaymentTermMutation.mutate(paymentTermData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h1>{type === 'create' ? 'Create Payment Term' : 'Edit Payment Term'}</h1>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <Input
              {...register('type')}
              placeholder="e.g. standard"
              invalid={!!errors?.type}
              disabled={isLoading}
            />
            {errors?.type && <span className="text-sm text-red-500">{errors?.type?.message}</span>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input
              {...register('name')}
              placeholder="e.g. Standard Plan"
              invalid={!!errors?.name}
              disabled={isLoading}
            />
            {errors?.name && <span className="text-sm text-red-500">{errors?.name?.message}</span>}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Months</label>
          <Input
            {...register('months', { valueAsNumber: true })}
            type="number"
            placeholder="e.g. 60"
            invalid={!!errors?.months}
            disabled={isLoading}
          />
          {errors?.months && (
            <span className="text-sm text-red-500">{errors?.months?.message}</span>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            {...register('description')}
            placeholder="e.g. Standard 5-year financing plan"
            className={`w-full rounded-md border ${
              errors?.description ? 'border-red-500' : 'border-gray-300'
            } px-4 py-2 focus:border-blue-500 focus:outline-none`}
            disabled={isLoading}
            rows={3}
          />
          {errors?.description && (
            <span className="text-sm text-red-500">{errors?.description?.message}</span>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="solid"
          icon={<ApolloIcon name="file" className="text-md" />}
          loading={createPaymentTermMutation.isPending || updatePaymentTermMutation.isPending}
          disabled={isLoading}
        >
          Save
        </Button>
      </div>
    </form>
  );
}

export default PaymentTermForm;
