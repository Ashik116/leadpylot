'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import Dialog from '@/components/ui/Dialog';
import BaseFormComponent from '@/components/shared/form/BaseFormComponent';
import type { FieldDefinition } from '@/components/shared/form/types';
import { useCreateOfferPayment } from '@/services/hooks/useOffersProgress';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useQueryClient } from '@tanstack/react-query';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import { apiUpdateOfferPayment, apiDeleteOfferPayment } from '@/services/OffersService';
import useNotification from '@/utils/hooks/useNotification';
import Button from '@/components/ui/Button';

interface PaymentRecord {
  _id?: string;
  amount: number;
  payment_date?: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
}

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  financials: {
    expected_from_customer?: number;
    customer_payments?: PaymentRecord[];
    payment_summary?: {
      total_received: number;
      outstanding: number;
      payment_status: 'pending' | 'partial' | 'complete' | 'overpaid';
      payment_count: number;
      last_payment_date?: string;
      overpayment?: number;
      balance_due?: number;
    };
  };
  invalidateQueries?: string[] | string;
  refetch?: () => void;
  onSuccess?: () => void;
  openAddFormByDefault?: boolean;
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

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  offerId,
  financials,
  invalidateQueries,
  refetch,
  onSuccess,
  openAddFormByDefault = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(openAddFormByDefault);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const createPaymentMutation = useCreateOfferPayment();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  const payments = financials?.customer_payments || [];
  const summary = financials?.payment_summary;
  const expectedAmount = financials?.expected_from_customer || 0;

  const handleInvalidateAndRefetch = async () => {
    // The mutation (useCreateOfferPayment) already invalidates:
    // - ['opening', offerId]
    // - All opening queries (which triggers automatic refetch)
    // - ['offers-progress']
    // - ['offers-progress-all']
    // - ['offers']
    // So we only need to invalidate additional specific queries if provided
    if (invalidateQueries) {
      if (Array.isArray(invalidateQueries)) {
        invalidateQueries.forEach((query) => {
          queryClient.invalidateQueries({ queryKey: [query] });
        });
      } else {
        queryClient.invalidateQueries({ queryKey: [invalidateQueries] });
      }
    }
    // Call refetch callback if provided - but it should only invalidate, not refetch
    // The mutation's invalidation already triggers automatic refetch
    if (refetch) {
      await refetch();
    }
    onSuccess?.();
  };

  const handleSubmit = async (data: PaymentFormData) => {
    if (!offerId) return;

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
      setShowAddForm(false);
      await handleInvalidateAndRefetch();
    } catch {
      // Error handling is done by the hook
    }
  };

  const handleUpdatePayment = async (paymentId: string, data: PaymentFormData) => {
    if (!offerId || !paymentId) return;

    setIsUpdating(true);
    try {
      await apiUpdateOfferPayment(offerId, paymentId, {
        amount: data.amount,
        payment_method: data.payment_method as 'bank_transfer' | 'cash' | 'check' | 'other',
        reference: data.reference || undefined,
        notes: data.notes || undefined,
      });
      setEditingPaymentId(null);
      await handleInvalidateAndRefetch();
      openNotification({
        type: 'success',
        massage: 'Payment updated successfully',
      });
    } catch {
      openNotification({
        type: 'danger',
        massage: 'Failed to update payment',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!offerId || !paymentId) return;

    setIsUpdating(true);
    try {
      await apiDeleteOfferPayment(offerId, paymentId);
      setDeletingPaymentId(null);
      await handleInvalidateAndRefetch();
      openNotification({
        type: 'success',
        massage: 'Payment deleted successfully',
      });
    } catch {
      openNotification({
        type: 'danger',
        massage: 'Failed to delete payment',
      });
    } finally {
      setIsUpdating(false);
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
      className: 'col-span-6',
    },
    // {
    //   name: 'payment_method',
    //   label: 'Payment Method',
    //   type: 'select',
    //   options: paymentMethodOptions,
    //   placeholder: 'Select method',
    //   className: 'col-span-6',
    // },
    {
      name: 'reference',
      label: 'Reference',
      type: 'input',
      inputType: 'text',
      placeholder: 'Reference (optional)',
      className: 'col-span-6',
    },
    // {
    //   name: 'notes',
    //   label: 'Notes',
    //   type: 'input',
    //   inputType: 'text',
    //   placeholder: 'Notes (optional)',
    //   className: 'col-span-6',
    // },
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'overpaid':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    const option = paymentMethodOptions.find((opt) => opt.value === method);
    return option?.label || method || 'Unknown';
  };

  const editingPayment = editingPaymentId ? payments.find((p) => p._id === editingPaymentId) : null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={700}>
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-1">
          <div>
            <h4 className="text-lg font-semibold">Payment History</h4>
            {/* <p className="text-sm text-gray-500">Expected: €{expectedAmount.toLocaleString()}</p> */}
          </div>
          {summary && (
            <div className="mr-6 text-right">
              <span
                className={`inline-block rounded-full px-2 text-xs font-medium ${getStatusColor(summary.payment_status)}`}
              >
                {summary.payment_status?.toUpperCase() || 'PENDING'}
              </span>
              {/* <p className="mt-1 text-sm text-gray-600">
                Received: €{summary.total_received?.toLocaleString() || '0'}
              </p> */}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <p className="text-base text-blue-600">Expected</p>
            <p className="text-base font-bold text-blue-800">€{expectedAmount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-2">
            <p className="text-base text-green-600">Received</p>
            <p className="text-base font-bold text-green-800">
              €{summary?.total_received?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="rounded-lg bg-orange-50 p-2">
            <p className={`text-base ${summary?.overpayment && summary.overpayment > 0
              ? 'text-orange-800'
              : summary?.balance_due && summary.balance_due > 0
                ? 'text-red-600'
                : 'text-green-600'
              }`}>
              {summary?.overpayment && summary.overpayment > 0
                ? 'Extra'
                : summary?.balance_due && summary.balance_due > 0
                  ? 'Pending'
                  : 'Paid'}
            </p>
            {summary?.overpayment && summary.overpayment > 0 ? (
              <p className="text-lg font-bold text-orange-800">
                €{summary.overpayment.toLocaleString()}
              </p>
            ) : summary?.balance_due && summary.balance_due > 0 ? (
              <p className="text-lg font-bold text-red-600">
                €{summary.balance_due.toLocaleString()}
              </p>
            ) : (
              <p className="text-lg font-bold text-green-600">€0</p>
            )}
          </div>
        </div>

        {/* Payment List */}
        <div className="max-h-[300px] overflow-y-auto">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-5 text-gray-400">
              {/* <ApolloIcon name="dollar" className="mb-2 text-3xl" /> */}
              <p>No payments recorded yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-2 py-2 ">Date</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Method</th>
                  <th className="px-2 py-2">Reference</th>
                  <th className="px-2 py-2">Notes</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments?.map((payment, index) => (
                  <tr key={payment._id || index} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-sm">
                      {payment.payment_date
                        ? dateFormateUtils(payment.payment_date, DateFormatType.SHOW_DATE)
                        : '-'}
                    </td>
                    <td className="px-2 py-2 text-sm font-medium text-green-600">
                      €{payment.amount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-2 py-2 text-sm">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-600">{payment.reference || '-'}</td>
                    <td
                      className="max-w-[100px] truncate px-2 py-2 text-sm text-gray-500"
                      title={payment.notes}
                    >
                      {payment.notes || '-'}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingPaymentId(payment._id || null)}
                          title="Edit payment"
                          disabled={isUpdating}
                        >
                          <ApolloIcon name="file-edit" className="text-sm" />
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => setDeletingPaymentId(payment._id || null)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete payment"
                          disabled={isUpdating}
                        >
                          <ApolloIcon name="trash" className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Delete Confirmation */}
        {deletingPaymentId && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2">
            <p className="mb-3 text-sm text-red-800">
              Are you sure you want to delete this payment? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeletePayment(deletingPaymentId)}
                disabled={isUpdating}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isUpdating ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeletingPaymentId(null)}
                disabled={isUpdating}
                className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Edit Payment Form */}
        {editingPayment && !deletingPaymentId && (
          <div className="border-t pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="font-medium">Edit Payment</h5>
              <button
                onClick={() => setEditingPaymentId(null)}
                className="text-lg text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <BaseFormComponent
              schema={paymentSchema}
              fields={fields}
              defaultValues={{
                amount: editingPayment.amount,
                payment_method: editingPayment.payment_method || '',
                reference: editingPayment.reference || '',
                notes: editingPayment.notes || '',
              }}
              onSubmit={(data) => handleUpdatePayment(editingPaymentId!, data)}
              isLoading={isUpdating}
              actionButtons={{
                submit: true,
                text: 'Update Payment',
                loadingText: 'Updating...',
              }}
              handleSubmitInternally={false}
              toastConfig={{
                showSuccessToast: false,
                showErrorToast: false,
              }}
            />
          </div>
        )}

        {/* Add Payment Form */}
        {showAddForm && !editingPaymentId && !deletingPaymentId ? (
          <div className="border-t pt-2">
            <div className="mb-2 flex items-center justify-between">
              <h5 className="font-medium">Add New Payment</h5>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-lg text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <BaseFormComponent
              schema={paymentSchema}
              fields={fields}
              onSubmit={handleSubmit}
              defaultValues={{
                amount: summary?.balance_due || 0,
                payment_method: 'bank_transfer',
                reference: '',
                notes: '',
              }}
              isLoading={createPaymentMutation.isPending}
              actionButtons={{
                submit: true,
                text: 'Add Payment',
                loadingText: 'Adding...',
              }}
              handleSubmitInternally={false}
              toastConfig={{
                showSuccessToast: false,
                showErrorToast: false,
              }}
            />
          </div>
        ) : !editingPaymentId && !deletingPaymentId ? (
          <Button
            variant="secondary"
            icon={<ApolloIcon name="plus" />}
            onClick={() => setShowAddForm(true)}
          >
            <span>Add Payment</span>
          </Button>
        ) : null}
      </div>
    </Dialog>
  );
};

export default PaymentHistoryModal;
