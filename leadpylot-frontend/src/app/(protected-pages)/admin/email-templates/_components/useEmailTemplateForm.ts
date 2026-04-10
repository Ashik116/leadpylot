import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmailTemplate } from '@/services/SettingsService';
import { useEmailTemplateMutations } from '@/services/hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';

function getCategoryIdValue(
  categoryId: string | { _id?: string; name?: string } | undefined
): string {
  if (!categoryId) return '';
  if (typeof categoryId === 'string') return categoryId;
  return (categoryId as { _id?: string })._id ?? '';
}

export const emailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  template_content: z.string().min(1, 'Template content is required'),
  include_signature: z.boolean().optional().default(false),
  has_signature_file: z.boolean().optional().default(false),
  how_many_offers: z.string().optional().default('1'),
  type: z.string().optional().default('Offer'),
  subject: z.string().optional(),
  category_id: z.string().optional(),
  signature_file_id: z.string().nullable().optional(),
  gender_type: z.string().nullable().optional().default(null),
  project_ids: z.array(z.object({ label: z.string(), value: z.string() })).optional().default([]),
});

export type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;

export const useEmailTemplateForm = (
  initialData: (EmailTemplate & { include_signature?: boolean }) | undefined,
  isPage: boolean,
  onSuccess?: (data: any) => void
) => {
  const queryClient = useQueryClient();
  const { createEmailTemplateMutation, updateEmailTemplateMutation } = useEmailTemplateMutations(
    initialData?._id,
    isPage
  );

  const formMethods = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateSchema as any),
    defaultValues: initialData
      ? {
        name: initialData.name,
        template_content: initialData.template_content,
        include_signature: initialData.include_signature || false,
        has_signature_file: initialData.has_signature_file || false,
        how_many_offers:
          initialData.how_many_offers !== undefined ? String(initialData.how_many_offers) : '1',
        type: initialData.type || '',
        subject: initialData.subject || '',
        category_id: getCategoryIdValue(
          initialData.category_id ?? (initialData.category as { _id?: string } | undefined)
        ),
        signature_file_id: initialData.signature_file_id?._id ?? '',
        gender_type: initialData.gender_type || null,
        project_ids: Array.isArray(initialData.projects)
          ? initialData.projects.map((p: { _id: string; name: string }) => ({ label: p.name, value: p._id }))
          : [],
      }
      : {
        name: '',
        template_content: '',
        include_signature: false,
        has_signature_file: false,
        how_many_offers: '1',
        type: 'Offer',
        subject: '',
        category_id: '',
        signature_file_id: null,
        gender_type: null,
        project_ids: [],
      },
  });

  const handleSubmit = (data: EmailTemplateFormValues) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('template_content', data.template_content);
    formData.append('include_signature', data.include_signature.toString());
    formData.append('type', data.type);
    formData.append('how_many_offers', data.how_many_offers);
    if (data.subject) {
      formData.append('subject', data.subject);
    }
    if (data.category_id) {
      formData.append('category_id', data.category_id);
    }
    // if (data.signature_file_id) {
    //   formData.append('signature_file_id', data.signature_file_id);
    // }
    if (data.gender_type) {
      formData.append('gender_type', data.gender_type);
    }
    if (data.project_ids && data.project_ids.length > 0) {
      formData.append('project_ids', JSON.stringify(data.project_ids.map(p => p.value)));
    } else {
      formData.append('project_ids', JSON.stringify([]));
    }

    const mutation = initialData ? updateEmailTemplateMutation : createEmailTemplateMutation;

    mutation.mutate(formData, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: ['email_templates'] });
        if (onSuccess) {
          onSuccess(initialData ? result.template || result : result);
        }
      },
    });
  };

  return {
    formMethods,
    handleSubmit: formMethods.handleSubmit(handleSubmit as any),
  };
};
