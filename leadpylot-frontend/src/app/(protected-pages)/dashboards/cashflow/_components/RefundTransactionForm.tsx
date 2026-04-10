'use client';

import React, { useMemo } from 'react';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useForm, Controller } from 'react-hook-form';

export interface RefundFormData {
  fees?: number;
  notes?: string;
}

interface RefundTransactionFormProps {
  onSubmit: (data: RefundFormData) => void;
  onCancel?: () => void;
  selectedRows: any[];
}

const RefundTransactionForm: React.FC<RefundTransactionFormProps> = ({
  onSubmit,
  onCancel,
  selectedRows,
}) => {
  // Calculate total amount from selected rows
  const totalAmount = useMemo(() => {
    return selectedRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  }, [selectedRows]);

  // Initialize form
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RefundFormData>({
    defaultValues: {
      fees: 0,
      notes: '',
    },
  });

  return (
    <div>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          {/* Selected Transactions Info */}
          <Card className="mb-4" bodyClass="p-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                You are about to refund {selectedRows.length} transaction
                {selectedRows.length !== 1 ? 's' : ''}:
              </p>
              <div className="mt-2 text-sm">
                <span className="font-semibold">Total Amount: </span>
                <span className="text-primary text-lg font-bold">{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Fees */}
          <FormItem label="Fees" invalid={!!errors.fees} errorMessage={errors.fees?.message}>
            <Controller
              name="fees"
              control={control}
              rules={{
                min: { value: 0, message: 'Fees cannot be negative' },
              }}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                />
              )}
            />
          </FormItem>

          {/* Notes */}
          <FormItem label="Notes" invalid={!!errors.notes} errorMessage={errors.notes?.message}>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Input
                  textArea
                  rows={4}
                  placeholder="Enter additional notes (optional)"
                  {...field}
                />
              )}
            />
          </FormItem>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="default" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="solid">
            Process Refund
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default RefundTransactionForm;
