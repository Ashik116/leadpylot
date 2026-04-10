'use client';

import React from 'react';
import { z } from 'zod';
import Dialog from '@/components/ui/Dialog';
import BaseFormComponent from '@/components/shared/form/BaseFormComponent';
import type { FieldDefinition } from '@/components/shared/form/types';
import { useCreateOfferPayment } from '@/services/hooks/useOffersProgress';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  onSuccess?: () => void;
}

// Payment method options
const paymentMethodOptions = [
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cash', value: 'cash' },
  { label: 'Credit Card', value: 'credit_card' },
  { label: 'Wire Transfer', value: 'wire_transfer' },
  { label: 'Other', value: 'other' },
];

// Zod schema for form validation
const paymentSchema = z.object({
  amount: z
    .number({ message: 'Amount must be a number' })
    .positive({ message: 'Amount must be positive' })
    .min(0.01, { message: 'Amount must be at least 0.01' }),
  payment_method: z.string().min(1, { message: 'Payment method is required' }),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  offerId,
  onSuccess,
}) => {
  const createPaymentMutation = useCreateOfferPayment();

  const handleSubmit = async (data: PaymentFormData) => {
    if (!offerId) {
      return;
    }

    try {
      await createPaymentMutation.mutateAsync({
        offerId,
        data: {
          amount: data.amount,
          payment_method: data.payment_method as 'bank_transfer' | 'cash' | 'check' | 'other',
          reference: data.reference || undefined,
          notes: data.notes || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error handling is done by the hook
    }
  };

  const fields: FieldDefinition[] = [
    {
      name: 'amount',
      label: 'Amount',
      type: 'input',
      inputType: 'number',
      placeholder: 'Enter amount',
      step: '0.01',
      className: 'col-span-12',
    },
    {
      name: 'payment_method',
      label: 'Payment Method',
      type: 'select',
      options: paymentMethodOptions,
      placeholder: 'Select payment method',
      className: 'col-span-12',
    },
    {
      name: 'reference',
      label: 'Reference',
      type: 'input',
      inputType: 'text',
      placeholder: 'Enter reference (optional)',
      className: 'col-span-12',
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      placeholder: 'Enter notes (optional)',
      className: 'col-span-12',
    },
  ];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={600}>
      <div className="mb-4">
        <h4 className="text-lg font-semibold">Add Payment</h4>
      </div>
      <BaseFormComponent
        schema={paymentSchema}
        fields={fields}
        onSubmit={handleSubmit}
        isLoading={createPaymentMutation.isPending}
        actionButtons={{
          submit: true,
          text: 'Create Payment',
          loadingText: 'Creating...',
        }}
        handleSubmitInternally={false}
        toastConfig={{
          showSuccessToast: false, // Hook handles notifications
          showErrorToast: false, // Hook handles notifications
        }}
      />
    </Dialog>
  );
};

export default AddPaymentModal;
