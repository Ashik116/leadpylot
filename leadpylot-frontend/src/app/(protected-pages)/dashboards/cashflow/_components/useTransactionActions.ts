/**
 * Custom hook to handle all transaction actions
 * This hook centralizes all action logic for better maintainability
 */

import { useCallback } from 'react';
import {
  useCreateBankTransfer,
  useCreateRefundTransaction,
  useCreateBounceTransaction,
} from '@/services/hooks/useCashflow';
import type { TransactionActionType } from './TransactionActionDialog';
import type { TransferFormData } from './TransferTransactionForm';
import type { RefundFormData } from './RefundTransactionForm';
import type { BouncedFormData } from './BouncedTransactionForm';

interface UseTransactionActionsProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to handle transaction actions (transfer, refund, bounced, bulk_update)
 */
export const useTransactionActions = ({ onSuccess, onError }: UseTransactionActionsProps = {}) => {
  // Initialize all mutation hooks for different actions
  const createBankTransferMutation = useCreateBankTransfer();
  const createRefundTransactionMutation = useCreateRefundTransaction();
  const createBounceTransactionMutation = useCreateBounceTransaction();

  // Handle transfer action
  const handleTransfer = useCallback(
    async (formData: TransferFormData) => {
      try {
        await createBankTransferMutation.mutateAsync({
          from_bank_id: formData.from_bank_id,
          to_bank_id: formData.to_bank_id,
          amount: formData.amount,
          currency: formData.currency || 'EUR',
          fees: formData.fees || 0,
          transaction_reference: formData.transaction_reference || '',
          notes: formData.notes || '',
        });
        onSuccess?.();
      } catch (error) {
        onError?.(error as Error);
        throw error; // Re-throw to let caller handle if needed
      }
    },
    [createBankTransferMutation, onSuccess, onError]
  );

  // Handle refund action - creates refund for each selected transaction
  const handleRefund = useCallback(
    async (formData: RefundFormData, selectedRows: any[]) => {
      try {
        if (!selectedRows || selectedRows.length === 0) {
          throw new Error('No transactions selected for refund');
        }

        // Process refunds for each selected transaction
        const refundPromises = selectedRows.map((row) => {
          // Always use originalData._id as it's the full transaction object from API
          const transactionId = row.originalData?._id || row._id;

          if (!transactionId) {
            throw new Error('Transaction ID is required for refund');
          }

          // Get original transaction amount from the row
          const originalAmount = row.originalData?.amount || row.amount;
          if (!originalAmount) {
            throw new Error('Original transaction amount is required for refund');
          }

          // Ensure transactionId is a string
          const txId = String(transactionId);

          return createRefundTransactionMutation.mutateAsync({
            transactionId: txId,
            data: {
              amount: originalAmount, // Send original deposit amount
              fees: formData.fees || 0,
              notes: formData.notes || '',
            },
          });
        });

        await Promise.all(refundPromises);
        onSuccess?.();
      } catch (error) {
        // Don't call onError here - the mutation hook already handles error notifications
        // Just re-throw to let the caller know an error occurred
        throw error;
      }
    },
    [createRefundTransactionMutation, onSuccess]
  );

  // Handle bounced action - creates bounce for each selected transaction
  const handleBounced = useCallback(
    async (formData: BouncedFormData, selectedRows: any[]) => {
      try {
        if (!selectedRows || selectedRows.length === 0) {
          throw new Error('No transactions selected for bounce');
        }

        // Process bounces for each selected transaction
        const bouncePromises = selectedRows.map((row) => {
          // Always use originalData._id as it's the full transaction object from API
          const transactionId = row.originalData?._id || row._id;

          if (!transactionId) {
            throw new Error('Transaction ID is required for bounce');
          }

          // Get original transaction amount from the row
          const originalAmount = row.originalData?.amount || row.amount;
          if (!originalAmount) {
            throw new Error('Original transaction amount is required for bounce');
          }

          // Ensure transactionId is a string
          const txId = String(transactionId);

          return createBounceTransactionMutation.mutateAsync({
            transactionId: txId,
            data: {
              amount: originalAmount, // Send original deposit amount
              fees: formData.fees || 0,
              notes: formData.notes || '',
            },
          });
        });

        await Promise.all(bouncePromises);
        onSuccess?.();
      } catch (error) {
        // Don't call onError here - the mutation hook already handles error notifications
        // Just re-throw to let the caller know an error occurred
        throw error;
      }
    },
    [createBounceTransactionMutation, onSuccess]
  );

  // Handle bulk update action (TODO: Implement when API is ready)
  const handleBulkUpdate = useCallback(async (formData: any) => {
    // TODO: Implement bulk update API call
    // await bulkUpdateMutation.mutateAsync(formData);
    throw new Error('Bulk update action not yet implemented');
  }, []);

  // Main handler that routes to the appropriate action handler
  const handleAction = useCallback(
    async (actionType: TransactionActionType, formData: any, selectedRows: any[] = []) => {
      switch (actionType) {
        case 'transfer':
          return handleTransfer(formData);
        case 'refund':
          return handleRefund(formData, selectedRows);
        case 'bounced':
          return handleBounced(formData, selectedRows);
        case 'bulk_update':
          return handleBulkUpdate(formData);
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }
    },
    [handleTransfer, handleRefund, handleBounced, handleBulkUpdate]
  );

  return {
    handleAction,
    handleTransfer,
    handleRefund,
    handleBounced,
    handleBulkUpdate,
    isLoading:
      createBankTransferMutation.isPending ||
      createRefundTransactionMutation.isPending ||
      createBounceTransactionMutation.isPending, // TODO: Add other mutations' loading states
  };
};
