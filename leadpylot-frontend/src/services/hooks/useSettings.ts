// Removed BankFormValues import as we're now using FormData
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiCreateBank,
  apiCreateEmailTemplate,
  apiCreateMailServer,
  apiDeleteBank,
  apiDeleteEmailTemplate,
  apiDeleteMailServer,
  apiBulkDeleteMailServers,
  apiGetBank,
  apiGetBanks,
  apiGetEmailTemplate,
  apiGetEmailTemplates,
  apiGetMailServer,
  apiGetMailServers,
  apiGetSettings,
  apiGetSettingsById,
  apiGetVoipServer,
  apiGetVoipServers,
  apiSearch,
  apiUpdateBank,
  apiUpdateEmailTemplate,
  apiUpdateMailServer,
  Bank,
  TGetAllMailServersResponse,
  type CreateMailServerRequest,
  type EmailTemplate,
  type GetAllEmailTemplatesResponse,
  type MailServerInfo,
  type Meta,
  type SearchResponse,
  type VoipServerInfo
} from '../SettingsService';

import { apiCreateVoipServer, apiUpdateVoipServer, CreateVoip } from '@/services/SettingsService';
import useNotification from '@/utils/hooks/useNotification';
import { useRouter } from 'next/navigation';

export interface UseBanksParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
}

export const useBanks = (params?: UseBanksParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['banks', params],
    queryFn: () => apiGetBanks(params),
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled !== false, // Default to true, but allow disabling
  });
};

export const useBank = (id: string) => {
  return useQuery({
    queryKey: ['bank', id],
    queryFn: () => apiGetBank(id),
  });
};

export const useBanksLazy = () => {
  return useMutation({
    mutationFn: async (ids: Bank[]) => {
      const queries = ids.map((bank) => apiGetBank(bank._id));
      return await Promise.all(queries);
    },
  });
};

export const useDeleteBank = (id: string) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async () => {
      // Don't attempt to delete with an empty ID
      if (!id) {
        return await Promise.reject(new Error('No bank ID provided for deletion'));
      }

      try {
        return await apiDeleteBank(id);
      } catch (error: any) {
        // Use any type for error to access response property
        // Log detailed error information for debugging
        // Error logging removed to prevent console clutter
        throw error; // Re-throw to be caught by onError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      openNotification({ type: 'success', massage: 'Bank deleted successfully' });
    },
    onError: (error: any) => {
      // Use any type for error to access response property
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      openNotification({
        type: 'danger',
        massage: `Failed to delete bank: ${errorMessage}`,
      });
    },
  });
};

export function useBankMutations(id?: string, isPage?: boolean) {
  const router = useRouter();
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  const createBankMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiCreateBank(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      openNotification({ type: 'success', massage: 'Bank created successfully' });
      if (isPage) {
        router.push('/admin/banks');
      }
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to create Bank' }),
  });

  const updateBankMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiUpdateBank(data, id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      openNotification({ type: 'success', massage: 'Bank updated successfully' });
      if (isPage) {
        router.push('/admin/banks');
      }
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to update Bank' }),
  });

  return { createBankMutation, updateBankMutation };
}

export const useMailServers = () => {
  return useQuery<MailServerInfo[]>({
    queryKey: ['mailservers'],
    queryFn: () => apiGetMailServers(),
  });
};

export const useSettings = (type: string, params?: Record<string, unknown>) => {
  return useQuery<TGetAllMailServersResponse>({
    queryKey: ['settings', type, params],
    queryFn: () => apiGetSettings(type, params),
  });
};

export const useSetting = (type: string, id: string) => {
  return useQuery({
    queryKey: ['settings', type, id],
    queryFn: () => (type && id ? apiGetSettingsById(type, id) : Promise.resolve(null)),
    enabled: !!(type && id), // Only run the query if both type and id are truthy
  });
};

export const useDeleteMailServer = (id: string) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: () => apiDeleteMailServer(id),
    onSuccess: () => {
      // Show success toast first
      openNotification({ type: 'success', massage: 'Mail Server deleted successfully' });

      // Then remove from cache after toast is shown
      queryClient.setQueryData(['settings', 'mailservers'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.filter((server: any) => server._id !== id);
      });

      // Ensure cache is consistent
      queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
      queryClient.invalidateQueries({ queryKey: ['mailservers'] });
    },
    onError: () => {
      openNotification({ type: 'danger', massage: 'Failed to delete Mail Server' });
    },
  });
};

export const useMailServer = (id: string) => {
  return useQuery({
    queryKey: ['mailserver', id],
    queryFn: () => apiGetMailServer(id),
  });
};
export const useMailServerLazy = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiGetMailServer(id);
    },
  });
};

export function useMailServerMutations(id?: string, isPage?: boolean) {
  const router = useRouter();
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  const createMailServerMutation = useMutation({
    mutationFn: (data: CreateMailServerRequest) => apiCreateMailServer(data),
    onSuccess: (response) => {
      // Add optimistic update to cache immediately
      queryClient.setQueryData(['settings', 'mailservers'], (oldData: any) => {
        if (!oldData) return [response];
        return [...oldData, response];
      });

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
      queryClient.invalidateQueries({ queryKey: ['mailservers'] });
      openNotification({ type: 'success', massage: 'Mail server created successfully' });
      if (isPage) {
        router.push('/admin/mailservers');
      }
    },
    onError: () => {
      // Invalidate on error to reset any optimistic updates
      queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
      queryClient.invalidateQueries({ queryKey: ['mailservers'] });
      openNotification({ type: 'danger', massage: 'Failed to create mail server' });
    },
  });

  const updateMailServerMutation = useMutation({
    mutationFn: (data: CreateMailServerRequest) => apiUpdateMailServer(data, id as string),
    onSuccess: (response, variables) => {
      // Update both the list and individual server caches immediately
      queryClient.setQueryData(['settings', 'mailservers'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((server: any) =>
          server._id === id
            ? {
              ...server,
              ...response,
              name: variables.name,
              info: {
                smtp: variables.smtp,
                imap: variables.imap,
                ssl: variables.ssl,
                smtp_port: variables.smtp_port,
                imap_port: variables.imap_port,
              },
            }
            : server
        );
      });

      // Update individual server cache
      queryClient.setQueryData(['settings', 'mailservers', id], response);

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
      queryClient.invalidateQueries({ queryKey: ['mailservers'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers', id] });

      openNotification({ type: 'success', massage: 'Mail server updated successfully' });
      if (isPage) {
        router.push('/admin/mailservers');
      }
    },
    onError: () => {
      // Invalidate on error to reset any optimistic updates
      queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
      queryClient.invalidateQueries({ queryKey: ['mailservers'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers', id] });
      openNotification({ type: 'danger', massage: 'Failed to update mail server' });
    },
  });

  return { createMailServerMutation, updateMailServerMutation };
}

export interface UseEmailTemplatesParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
}

export const useEmailTemplates = (params?: UseEmailTemplatesParams) => {
  return useQuery<GetAllEmailTemplatesResponse>({
    queryKey: ['email-templates', params],
    queryFn: async () => {
      const response = await apiGetEmailTemplates(params);
      // Add slug to templates if not present
      const templatesWithSlug = response.data.map((template) => ({
        ...template,
        slug: template.slug || template.name?.toLowerCase().replace(/\s+/g, '-') || '',
      }));
      return {
        ...response,
        data: templatesWithSlug,
      };
    },
    placeholderData: (previousData: GetAllEmailTemplatesResponse | undefined) => previousData,
  });
};

export const useEmailTemplate = (id: string) => {
  return useQuery({
    queryKey: ['email-template', id],
    queryFn: async () => {
      const response = await apiGetEmailTemplate(id);
      // Backend returns { success: true, template: {...}, message: "..." }
      // We need to extract just the template data
      return (response as any).template || response;
    },
  });
};

export const useDeleteEmailTemplate = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async (deleteId: string) => {
      if (!deleteId) {
        return Promise.reject(new Error('No email template ID provided for deletion'));
      }

      try {
        return await apiDeleteEmailTemplate(deleteId);
      } catch (error: any) {
        // Error logging removed to prevent console clutter
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      openNotification({ type: 'success', massage: 'Email template deleted successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      openNotification({
        type: 'danger',
        massage: `Failed to delete email template: ${errorMessage}`,
      });
    },
  });
};
export const useBulkDeleteMailServers = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids) {
        return Promise.reject(new Error('No mail server IDs provided for deletion'));
      }
      try {
        return await apiBulkDeleteMailServers(ids);
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mailservers'] });
      openNotification({ type: 'success', massage: 'Mail servers deleted successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({ type: 'danger', massage: `Failed to delete mail servers: ${errorMessage}` });
    },
  });
};
export function useEmailTemplateMutations(id?: string, isPage?: boolean) {
  const router = useRouter();
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  const createEmailTemplateMutation = useMutation({
    mutationFn: (data: EmailTemplate | FormData) => apiCreateEmailTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      openNotification({ type: 'success', massage: 'Email template created successfully' });
      if (isPage) {
        router.push('/admin/email-templates');
      }
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to create email template' }),
  });

  const updateEmailTemplateMutation = useMutation({
    mutationFn: (data: EmailTemplate | FormData) => apiUpdateEmailTemplate(data, id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      openNotification({ type: 'success', massage: 'Email template updated successfully' });
      if (isPage) {
        router.push('/admin/email-templates');
      }
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to update email template' }),
  });

  return {
    createEmailTemplateMutation,
    updateEmailTemplateMutation,
  };
}

export function useVoipServerMutations(id?: string, isPage?: boolean) {
  const router = useRouter();
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  const createServerMutation = useMutation({
    mutationFn: (data: CreateVoip) => apiCreateVoipServer(data),
    onSuccess: (response) => {
      // Add optimistic update to cache immediately
      queryClient.setQueryData(['voip-servers'], (oldData: any) => {
        if (!oldData) return { data: [response], meta: { total: 1, page: 1, limit: 10 } };
        return {
          ...oldData,
          data: [...oldData.data, response],
          meta: { ...oldData.meta, total: oldData.meta.total + 1 },
        };
      });

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['voip-servers'] });
      openNotification({ type: 'success', massage: 'Voip Server created successfully' });
      if (isPage) {
        router.push('/admin/voip-servers');
      }
    },
    onError: () => {
      // Invalidate on error to reset any optimistic updates
      queryClient.invalidateQueries({ queryKey: ['voip-servers'] });
      openNotification({ type: 'danger', massage: 'Failed to create Voip Server' });
    },
  });

  const updateServerMutation = useMutation({
    mutationFn: (data: CreateVoip) => apiUpdateVoipServer(data, id as string),
    onSuccess: (response, variables) => {
      // Update both the list and individual server caches immediately
      queryClient.setQueryData(['voip-servers'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((server: any) =>
            server._id === id
              ? {
                ...server,
                ...response,
                name: variables.name,
                info: {
                  domain: variables.domain,
                  websocket_address: variables.websocket_address,
                },
              }
              : server
          ),
        };
      });

      // Update individual server cache
      queryClient.setQueryData(['voipserver', id], response);

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['voip-servers'] });
      queryClient.invalidateQueries({ queryKey: ['voipserver', id] });

      // Don't automatically redirect - let the component handle this
      // This prevents unexpected page jumps
    },
    onError: () => {
      // Invalidate on error to reset any optimistic updates
      queryClient.invalidateQueries({ queryKey: ['voip-servers'] });
      queryClient.invalidateQueries({ queryKey: ['voipserver', id] });
      openNotification({ type: 'danger', massage: 'Failed to update Voip Server' });
    },
  });
  return { createServerMutation, updateServerMutation };
}

export const useVoipServerLazy = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiGetVoipServer(id);
    },
  });
};

export const useVoipServers = (params?: Record<string, unknown>) => {
  return useQuery<{ data: VoipServerInfo[]; meta: Meta }>({
    queryKey: ['voip-servers', params],
    queryFn: () => apiGetVoipServers(params),
  });
};

export const useVoipServer = (id: string) => {
  return useQuery({
    queryKey: ['voipserver', id],
    queryFn: () => (id ? apiGetVoipServer(id) : Promise.resolve(null)),
    enabled: !!id, // Only run the query if id is truthy
    retry: 1, // Only retry once to avoid continuous failures
  });
};

export const useSearch = (query: string) => {
  return useQuery<SearchResponse>({
    queryKey: ['search', query],
    queryFn: () => apiSearch(query),
    enabled: !!query && query.length > 0, // Only run the query if query is not empty
    staleTime: 30000, // 30 seconds
  });
};

export const useSearchLazy = () => {
  return useMutation<SearchResponse, Error, string>({
    mutationFn: (query: string) => apiSearch(query),
  });
};
