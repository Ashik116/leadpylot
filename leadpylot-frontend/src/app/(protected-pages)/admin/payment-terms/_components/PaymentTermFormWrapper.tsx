'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FormPreloader } from '@/components/shared/loaders';
import { usePaymentTermForm } from '../_hooks/usePaymentTermForm';

interface PaymentTermFormWrapperProps {
  type: 'create' | 'edit' | 'changePassword';
  id?: string;
  onSuccess?: () => void;
  isPage?: boolean;
  existingData?: any; // Pass existing data to avoid refetching
  onClose?: () => void;
}

function PaymentTermFormWrapper({
  type,
  id,
  onSuccess,
  isPage = true,
  existingData,
  onClose,
}: PaymentTermFormWrapperProps) {
  // HookS dATA
  const {
    register,
    handleSubmit,
    errors,
    onSubmit,
    showLoading,
    termData,
    isLoading,
    createPaymentTermMutation,
    updatePaymentTermMutation,
  } = usePaymentTermForm({
    type,
    id,
    onSuccess,
    existingData,
    onClose,
  });

  if (showLoading) {
    return (
      <FormPreloader
        showTitle={isPage}
        formFields={['Type', 'Name', 'Months', 'Description']}
        showButtons={true}
        buttonCount={isPage ? 2 : 1}
        className="p-2"
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-sm">
      <div className="space-y-2">
        {isPage && (
          <div className="flex items-center justify-between">
            <h1 className="text-lg capitalize">
              {type === 'create'
                ? 'Create Payment Term'
                : `${termData?.name || 'Payment Term'} Edit`}
            </h1>
            <Button
              variant="secondary"
              onClick={onClose}
              size="sm"
              icon={<ApolloIcon name="times" className="text-md" />}
            ></Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <Input
              {...register('type')}
              placeholder="e.g. standard"
              invalid={!!errors.type}
              disabled={isLoading}
            />
            {errors.type && <span className="text-sm text-red-500">{errors.type.message}</span>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input
              {...register('name')}
              placeholder="e.g. Standard Plan"
              invalid={!!errors.name}
              disabled={isLoading}
            />
            {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Months</label>
          <Input
            {...register('months', { valueAsNumber: true })}
            type="number"
            placeholder="e.g. 60"
            invalid={!!errors.months}
            disabled={isLoading}
          />
          {errors.months && <span className="text-sm text-red-500">{errors.months.message}</span>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            {...register('description')}
            placeholder="e.g. Standard 5-year financing plan"
            className={`w-full rounded-md border ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            } px-4 py-2 focus:border-blue-500 focus:outline-none`}
            disabled={isLoading}
            rows={3}
          />
          {errors.description && (
            <span className="text-sm text-red-500">{errors.description.message}</span>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onClose} size="sm">
          Close
        </Button>
        <Button
          type="submit"
          variant="solid"
          size="sm"
          icon={<ApolloIcon name="file" className="text-md" />}
          loading={createPaymentTermMutation.isPending || updatePaymentTermMutation.isPending}
          disabled={isLoading}
        >
          {type === 'create' ? 'Create Payment Term' : 'Update Payment Term'}
        </Button>
      </div>
    </form>
  );
}

export default PaymentTermFormWrapper;
