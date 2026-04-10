'use client';

import React from 'react';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useForm, Controller } from 'react-hook-form';

export interface BulkUpdateFormData {
  status?: string;
  category?: string;
  notes?: string;
  transaction_ids: string[];
}

interface BulkUpdateTransactionFormProps {
  onSubmit: (data: BulkUpdateFormData) => void;
  onCancel?: () => void;
  selectedRows: any[];
}

const BulkUpdateTransactionForm: React.FC<BulkUpdateTransactionFormProps> = ({
  onSubmit,
  onCancel,
  selectedRows,
}) => {
  // Initialize form
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BulkUpdateFormData>({
    defaultValues: {
      status: '',
      category: '',
      notes: '',
      transaction_ids: selectedRows.map((row) => row._id || row.id),
    },
  });

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
  ];

  // Category options
  const categoryOptions = [
    { value: 'deposit', label: 'Deposit' },
    { value: 'withdrawal', label: 'Withdrawal' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'fee', label: 'Fee' },
    { value: 'refund', label: 'Refund' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          {/* Selected Transactions Info */}
          <Card className="mb-4" bodyClass="p-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                You are about to bulk update {selectedRows.length} transaction
                {selectedRows.length !== 1 ? 's' : ''}:
              </p>
              <div className="mt-3 max-h-60 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-sm font-semibold text-gray-700">
                  {selectedRows.length} transaction{selectedRows.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>
          </Card>

          {/* Status */}
          <FormItem label="Status (Optional)" invalid={!!errors.status} errorMessage={errors.status?.message}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => {
                const selectedOption = statusOptions.find((opt) => opt.value === field.value);
                return (
                  <Select
                    placeholder="Select status to update"
                    options={statusOptions}
                    value={
                      selectedOption ? { value: selectedOption.value, label: selectedOption.label } : null
                    }
                    onChange={(option: any) => field.onChange(option?.value || '')}
                    isClearable
                  />
                );
              }}
            />
          </FormItem>

          {/* Category */}
          <FormItem
            label="Category (Optional)"
            invalid={!!errors.category}
            errorMessage={errors.category?.message}
          >
            <Controller
              name="category"
              control={control}
              render={({ field }) => {
                const selectedOption = categoryOptions.find((opt) => opt.value === field.value);
                return (
                  <Select
                    placeholder="Select category to update"
                    options={categoryOptions}
                    value={
                      selectedOption ? { value: selectedOption.value, label: selectedOption.label } : null
                    }
                    onChange={(option: any) => field.onChange(option?.value || '')}
                    isClearable
                  />
                );
              }}
            />
          </FormItem>

          {/* Notes */}
          <FormItem label="Notes" invalid={!!errors.notes} errorMessage={errors.notes?.message}>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Input
                  type="text"
                  placeholder="Enter additional notes (optional)"
                  {...field}
                  className="min-h-[80px]"
                />
              )}
            />
          </FormItem>

          <div className="rounded-md bg-yellow-50 p-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Only fields with values will be updated. Empty fields will be ignored.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="default" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="solid">
            Update Transactions
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default BulkUpdateTransactionForm;
