/**
 * Cashflow Hooks
 * React Query hooks for cashflow management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCashflowEntries,
  getCashflowEntry,
  getCashflowEntryByOffer,
  getBankSummaries,
  getBankSummary,
  getBankTransactions,
  getBanks,
  createTransaction,
  createBankTransfer,
  markTransactionReceived,
  createRefundTransaction,
  createBounceTransaction,
  type CashflowEntriesResponse,
  type CashflowEntryResponse,
  type BankSummariesResponse,
  type BankTransactionsResponse,
  type BanksListResponse,
  type CreateTransactionRequest,
  type CreateBankTransferRequest,
  type CreateRefundRequest,
  type CreateBounceRequest,
} from '../CashflowService';
import useNotification from '@/utils/hooks/useNotification';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const cashflowKeys = {
  all: ['cashflow'] as const,
  entries: () => [...cashflowKeys.all, 'entries'] as const,
  entry: (id: string) => [...cashflowKeys.all, 'entry', id] as const,
  entryByOffer: (offerId: string) => [...cashflowKeys.all, 'entry-by-offer', offerId] as const,
  bankSummaries: () => [...cashflowKeys.all, 'bank-summaries'] as const,
  bankSummary: (bankId: string) => [...cashflowKeys.all, 'bank-summary', bankId] as const,
  bankTransactions: (bankId: string, perspective: string) =>
    [...cashflowKeys.all, 'bank-transactions', bankId, perspective] as const,
  banks: () => [...cashflowKeys.all, 'banks'] as const,
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Hook to fetch all cashflow entries
 * Supports domain filtering for grouped views
 */
export const useCashflowEntries = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  bank_id?: string;
  enabled?: boolean;
  domain?: string; // JSON stringified domain filters for grouped view
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const { enabled = true, ...queryParams } = params || {};

  return useQuery<CashflowEntriesResponse>({
    queryKey: [...cashflowKeys.entries(), queryParams],
    queryFn: () => getCashflowEntries(queryParams),
    enabled,
    placeholderData: (prev) => prev,
  });
};

/**
 * Hook to fetch a single cashflow entry with transactions
 */
export const useCashflowEntry = (entryId?: string, enabled: boolean = true) => {
  return useQuery<CashflowEntryResponse>({
    queryKey: cashflowKeys.entry(entryId || ''),
    queryFn: () => {
      if (!entryId) throw new Error('Entry ID is required');
      return getCashflowEntry(entryId);
    },
    enabled: enabled && !!entryId,
  });
};

/**
 * Hook to fetch cashflow entry by offer ID
 */
export const useCashflowEntryByOffer = (offerId?: string, enabled: boolean = true) => {
  return useQuery<CashflowEntryResponse>({
    queryKey: cashflowKeys.entryByOffer(offerId || ''),
    queryFn: () => {
      if (!offerId) throw new Error('Offer ID is required');
      return getCashflowEntryByOffer(offerId);
    },
    enabled: enabled && !!offerId,
  });
};

/**
 * Hook to fetch all bank summaries
 */
export const useBankSummaries = (enabled: boolean = true) => {
  return useQuery<BankSummariesResponse>({
    queryKey: cashflowKeys.bankSummaries(),
    queryFn: getBankSummaries,
    enabled,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

/**
 * Hook to fetch single bank summary
 */
export const useBankSummary = (bankId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: cashflowKeys.bankSummary(bankId || ''),
    queryFn: () => {
      if (!bankId) throw new Error('Bank ID is required');
      return getBankSummary(bankId);
    },
    enabled: enabled && !!bankId,
  });
};

/**
 * Hook to fetch bank transactions (incoming or outgoing)
 */
export const useBankTransactions = (
  bankId?: string,
  perspective: 'incoming' | 'outgoing' = 'incoming',
  params?: { page?: number; limit?: number },
  enabled: boolean = true
) => {
  return useQuery<BankTransactionsResponse>({
    queryKey: [...cashflowKeys.bankTransactions(bankId || '', perspective), params],
    queryFn: () => {
      if (!bankId) throw new Error('Bank ID is required');
      return getBankTransactions(bankId, perspective, params);
    },
    enabled: enabled && !!bankId,
  });
};

/**
 * Hook to fetch all banks for dropdowns
 */
export const useBanks = (enabled: boolean = true) => {
  return useQuery<BanksListResponse>({
    queryKey: cashflowKeys.banks(),
    queryFn: getBanks,
    enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Hook to create a new transfer transaction (tied to an entry)
 */
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: CreateTransactionRequest }) =>
      createTransaction(entryId, data),
    onSuccess: () => {
      openNotification({
        type: 'success',
        massage: 'Transfer has been initiated',
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: cashflowKeys.all });
    },
    onError: (error: Error) => {
      openNotification({
        type: 'danger',
        massage: error.message || 'Failed to create transaction',
      });
    },
  });
};

/**
 * Hook to create a general bank transfer (not tied to an entry)
 */
export const useCreateBankTransfer = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: CreateBankTransferRequest) => createBankTransfer(data),
    onSuccess: () => {
      openNotification({
        type: 'success',
        massage: 'Bank transfer has been initiated',
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: cashflowKeys.all });
    },
    onError: (error: Error) => {
      openNotification({
        type: 'danger',
        massage: error.message || 'Failed to create bank transfer',
      });
    },
  });
};

/**
 * Hook to mark transaction as received
 */
export const useMarkTransactionReceived = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ transactionId, notes }: { transactionId: string; notes?: string }) =>
      markTransactionReceived(transactionId, notes),
    onSuccess: () => {
      openNotification({
        type: 'success',
        massage: 'Transaction marked as received',
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: cashflowKeys.all });
    },
    onError: (error: Error) => {
      openNotification({
        type: 'danger',
        massage: error.message || 'Failed to mark transaction as received',
      });
    },
  });
};

/**
 * Hook to fetch all transactions
 * Supports domain filtering for grouped views
 */
export const useAllTransactions = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  direction?: 'incoming' | 'outgoing';
  transaction_type?: string;
  bank_id?: string;
  cashflow_entry_id?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  domain?: string; // JSON stringified domain filters for grouped view
  enabled?: boolean;
}) => {
  const { enabled = true, ...queryParams } = params || {};

  return useQuery({
    queryKey: [...cashflowKeys.all, 'transactions', queryParams],
    queryFn: () => import('../CashflowService').then((m) => m.getAllTransactions(queryParams)),
    enabled,
    placeholderData: (prev) => prev,
  });
};

/**
 * Hook to create a refund transaction (return money to customer)
 */
export const useCreateRefundTransaction = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ transactionId, data }: { transactionId: string; data: CreateRefundRequest }) =>
      createRefundTransaction(transactionId, data),
    onSuccess: () => {
      openNotification({
        type: 'success',
        massage: 'Refund transaction created successfully',
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: cashflowKeys.all });
    },
    // Don't show error notification here - Axios interceptor already handles it
    // This prevents duplicate error messages
  });
};

/**
 * Hook to create a bounce transaction (bank returned payment)
 */
export const useCreateBounceTransaction = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ transactionId, data }: { transactionId: string; data: CreateBounceRequest }) =>
      createBounceTransaction(transactionId, data),
    onSuccess: () => {
      openNotification({
        type: 'success',
        massage: 'Bounce transaction created successfully',
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: cashflowKeys.all });
    },
    // Don't show error notification here - Axios interceptor already handles it
    // This prevents duplicate error messages
  });
};
