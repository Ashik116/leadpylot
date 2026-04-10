import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    apiGetDefaultGroupingFields,
    apiGetDefaultGroupingFieldsPages,
    apiUpdateDefaultGroupingFields,
    type DefaultGroupingFieldsRequest,
    type DefaultGroupingFieldsResponse,
} from '../SettingsService';

/**
 * Hook to fetch default grouping fields for users
 */
export const useGetDefaultGroupingFieldsPages = (params?: Record<string, unknown> & { enabled?: boolean }) => {
    return useQuery<DefaultGroupingFieldsResponse>({
        queryKey: ['default-grouping-fields-pages', params],
        queryFn: () => apiGetDefaultGroupingFieldsPages(params),
        enabled: params?.enabled !== false && !!params,
    });
};

/**
 * Hook to fetch default grouping fields for users
 */
// export const useGetDefaultGroupingFields = (userIds: string[], options?: { enabled?: boolean }) => {
//     return useQuery<DefaultGroupingFieldsResponse>({
//         queryKey: ['default-grouping-fields', userIds],
//         queryFn: () => apiGetDefaultGroupingFields(userIds),
//         enabled: options?.enabled !== false && userIds.length > 0,
//     });
// };

/**
 * Hook to update default grouping fields
 */
export const useUpdateDefaultGroupingFields = () => {
    const queryClient = useQueryClient();

    return useMutation<DefaultGroupingFieldsResponse, Error, DefaultGroupingFieldsRequest>({
        mutationFn: (data) => apiUpdateDefaultGroupingFields(data),
        onSuccess: (_, variables) => {
            // Invalidate queries for the updated users
            queryClient.invalidateQueries({
                queryKey: ['default-grouping-fields', variables.user_ids],
            });
        },
    });
};

