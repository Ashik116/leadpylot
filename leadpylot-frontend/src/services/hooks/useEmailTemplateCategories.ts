import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmailTemplateCategory } from '../EmailTemplateCategoryService';
import {
  apiCreateEmailTemplateCategory,
  apiDeleteEmailTemplateCategory,
  apiGetEmailTemplateCategories,
  apiUpdateEmailTemplateCategory,
} from '../EmailTemplateCategoryService';
import useNotification from '@/utils/hooks/useNotification';

const QUERY_KEY = 'email-template-categories';

export function useEmailTemplateCategories() {
  return useQuery<EmailTemplateCategory[]>({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<EmailTemplateCategory[]> => {
      const response = await apiGetEmailTemplateCategories();
      const data = (response as { data?: EmailTemplateCategory[] })?.data ?? response;
      return Array.isArray(data) ? (data as EmailTemplateCategory[]) : [];
    },
  });
}

export function useCreateEmailTemplateCategory() {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: (body: { name: string }) => apiCreateEmailTemplateCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      openNotification({ type: 'success', massage: 'Category created successfully' });
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to create category' }),
  });
}

export function useUpdateEmailTemplateCategory() {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string } }) =>
      apiUpdateEmailTemplateCategory(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      openNotification({ type: 'success', massage: 'Category updated successfully' });
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to update category' }),
  });
}

export function useDeleteEmailTemplateCategory() {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: (categoryId: string) => apiDeleteEmailTemplateCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      openNotification({ type: 'success', massage: 'Category deleted successfully' });
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to delete category' }),
  });
}
