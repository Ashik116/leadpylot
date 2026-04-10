'use client';

import React, { useMemo, useEffect } from 'react';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useForm, Controller } from 'react-hook-form';
import { useBanks } from '@/services/hooks/useCashflow';

export interface TransferFormData {
  from_bank_id: string;
  to_bank_id: string;
  amount: number;
  currency: string;
  fees: number;
  transaction_reference: string;
  notes: string;
}

interface TransferTransactionFormProps {
  onSubmit: (data: TransferFormData) => void;
  onCancel?: () => void;
  selectedRows?: any[];
}

const TransferTransactionForm: React.FC<TransferTransactionFormProps> = ({
  onSubmit,
  onCancel,
  selectedRows = [],
}) => {
  // Fetch banks for dropdowns
  const { data: banksData, isLoading: banksLoading } = useBanks(true);

  // Initialize form
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TransferFormData>({
    defaultValues: {
      from_bank_id: '',
      to_bank_id: '',
      amount: 0,
      currency: 'EUR',
      fees: 0,
      transaction_reference: '',
      notes: '',
    },
  });

  // Pre-fill form with selected row data
  useEffect(() => {
    if (selectedRows.length > 0) {
      const firstRow = selectedRows[0];
      // Extract values from the selected row
      const fromBankId = firstRow.fromBankId || '';
      const toBankId = firstRow.toBankId || '';
      const amount = firstRow.amount || 0;
      const currency = firstRow.currency || 'EUR';
      const fees = firstRow.fees || 0;

      // Reset form with pre-filled values
      reset({
        from_bank_id: fromBankId,
        to_bank_id: toBankId,
        amount: amount,
        currency: currency,
        fees: fees,
        transaction_reference: '',
        notes: '',
      });
    }
  }, [selectedRows, reset]);

  // Prepare bank options for Select dropdowns
  const bankOptions = useMemo(() => {
    if (!banksData?.data) return [];
    return banksData.data.map((bank) => ({
      value: bank._id,
      label: bank.nickName ? `${bank.name} (${bank.nickName})` : bank.name,
    }));
  }, [banksData]);

  // Currency options
  const currencyOptions = [
    { value: 'EUR', label: 'EUR' },
    { value: 'USD', label: 'USD' },
    { value: 'GBP', label: 'GBP' },
  ];

  return (
    <div>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          {/* From Bank */}
          <FormItem
            label="From Bank"
            invalid={!!errors.from_bank_id}
            errorMessage={errors.from_bank_id?.message}
          >
            <Controller
              name="from_bank_id"
              control={control}
              rules={{ required: 'From bank is required' }}
              render={({ field }) => {
                const selectedOption = bankOptions.find((opt) => opt.value === field.value);
                return (
                  <Select
                    placeholder="Select from bank"
                    options={bankOptions}
                    value={
                      selectedOption
                        ? { value: selectedOption.value, label: selectedOption.label }
                        : null
                    }
                    onChange={(option: any) => field.onChange(option?.value || '')}
                    isLoading={banksLoading}
                    isDisabled={banksLoading}
                  />
                );
              }}
            />
          </FormItem>

          {/* To Bank */}
          <FormItem
            label="To Bank"
            invalid={!!errors.to_bank_id}
            errorMessage={errors.to_bank_id?.message}
          >
            <Controller
              name="to_bank_id"
              control={control}
              rules={{ required: 'To bank is required' }}
              render={({ field }) => {
                const selectedOption = bankOptions.find((opt) => opt.value === field.value);
                return (
                  <Select
                    placeholder="Select to bank"
                    options={bankOptions}
                    value={
                      selectedOption
                        ? { value: selectedOption.value, label: selectedOption.label }
                        : null
                    }
                    onChange={(option: any) => field.onChange(option?.value || '')}
                    isLoading={banksLoading}
                    isDisabled={banksLoading}
                  />
                );
              }}
            />
          </FormItem>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <FormItem
              label="Amount"
              invalid={!!errors.amount}
              errorMessage={errors.amount?.message}
            >
              <Controller
                name="amount"
                control={control}
                rules={{
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' },
                }}
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </FormItem>

            {/* Currency */}
            <FormItem
              label="Currency"
              invalid={!!errors.currency}
              errorMessage={errors.currency?.message}
            >
              <Controller
                name="currency"
                control={control}
                rules={{ required: 'Currency is required' }}
                render={({ field }) => {
                  const selectedOption = currencyOptions.find((opt) => opt.value === field.value);
                  return (
                    <Select
                      placeholder="Select currency"
                      options={currencyOptions}
                      value={
                        selectedOption
                          ? { value: selectedOption.value, label: selectedOption.label }
                          : null
                      }
                      onChange={(option: any) => field.onChange(option?.value || 'EUR')}
                    />
                  );
                }}
              />
            </FormItem>
          </div>

          {/* Fees */}
          <FormItem label="Fees" invalid={!!errors.fees} errorMessage={errors.fees?.message}>
            <Controller
              name="fees"
              control={control}
              rules={{
                required: 'Fees is required',
                min: { value: 0, message: 'Fees cannot be negative' },
              }}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              )}
            />
          </FormItem>

          {/* Transaction Reference */}
          <FormItem
            label="Transaction Reference"
            invalid={!!errors.transaction_reference}
            errorMessage={errors.transaction_reference?.message}
          >
            <Controller
              name="transaction_reference"
              control={control}
              rules={{ required: 'Transaction reference is required' }}
              render={({ field }) => <Input type="text" placeholder="Enter reference" {...field} />}
            />
          </FormItem>

          {/* Notes */}
          <FormItem label="Notes" invalid={!!errors.notes} errorMessage={errors.notes?.message}>
            <Controller
              name="notes"
              control={control}
              rules={{ required: 'Notes is required' }}
              render={({ field }) => (
                <Input textArea rows={4} placeholder="Enter notes" {...field} />
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
            Transfer
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default TransferTransactionForm;
