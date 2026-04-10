import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    apiCreateLostOffer,
    apiBulkCreateLostOffers,
    apiGetLostOffers,
    apiGetLostOfferById,
    apiUpdateLostOffer,
    apiDeleteLostOffer,
    CreateLostOfferRequest,
    LostOffer,
} from '@/services/LostOffersService';

/**
 * Hook to create a single lost offer
 */
export const useCreateLostOffer = (options?: {
    onSuccess?: (data: LostOffer) => void;
    onError?: (error: any) => void;
}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateLostOfferRequest) => apiCreateLostOffer(data),
        onSuccess: (data) => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['lost-offers'] });
            queryClient.invalidateQueries({ queryKey: ['offers'] });
            queryClient.invalidateQueries({ queryKey: ['openings'] });
            queryClient.invalidateQueries({ queryKey: ['confirmations'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
            queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] }); // Invalidate multi-table query

            options?.onSuccess?.(data);
        },
        onError: options?.onError,
    });
};

/**
 * Hook to bulk create lost offers USED IN USINIFIED DASHBOARD
 */
export const useBulkCreateLostOffers = (options?: {
    onSuccess?: (data: LostOffer[]) => void;
    onError?: (error: any) => void;
}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (offerIds: string[]) => apiBulkCreateLostOffers(offerIds),
        onSuccess: (data) => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['lost-offers'] });
            queryClient.invalidateQueries({ queryKey: ['offers'] });
            queryClient.invalidateQueries({ queryKey: ['openings'] });
            queryClient.invalidateQueries({ queryKey: ['confirmations'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
            queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] }); // Invalidate multi-table query

            options?.onSuccess?.(data);
        },
        onError: options?.onError,
    });
};

/**
 * Hook to get lost offers with pagination and filters
 */
export const useLostOffers = (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}) => {
    return useQuery({
        queryKey: ['lost-offers', params],
        queryFn: () => apiGetLostOffers(params),
        enabled: true,
    });
};

/**
 * Hook to get a single lost offer by ID
 */
export const useLostOffer = (id: string) => {
    return useQuery({
        queryKey: ['lost-offers', id],
        queryFn: () => apiGetLostOfferById(id),
        enabled: !!id,
    });
};

/**
 * Hook to update a lost offer
 */
export const useUpdateLostOffer = (options?: {
    onSuccess?: (data: LostOffer) => void;
    onError?: (error: any) => void;
}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateLostOfferRequest> }) =>
            apiUpdateLostOffer(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['lost-offers'] });
            options?.onSuccess?.(data);
        },
        onError: options?.onError,
    });
};

/**
 * Hook to delete a lost offer
 */
export const useDeleteLostOffer = (options?: {
    onSuccess?: () => void;
    onError?: (error: any) => void;
}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiDeleteLostOffer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lost-offers'] });
            queryClient.invalidateQueries({ queryKey: ['offers'] });
            options?.onSuccess?.();
        },
        onError: options?.onError,
    });
};
