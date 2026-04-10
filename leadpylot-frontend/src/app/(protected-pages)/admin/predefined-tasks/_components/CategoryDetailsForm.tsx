'use client';

import { useCallback, useEffect } from 'react';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import { toast } from '@/components/ui/toast';
import Button from '@/components/ui/Button';
import Switcher from '@/components/ui/Switcher';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  predefinedSubtaskCategorySchema,
  type PredefinedSubtaskCategoryFormData,
} from './predefinedSubtaskCategorySchema';
import {
  usePredefinedSubtaskCategory,
  useUpdatePredefinedSubtaskCategory,
} from '@/services/hooks/usePredefinedSubtaskCategories';
import { FormPreloader } from '@/components/shared/loaders';

interface CategoryDetailsFormProps {
  categoryId: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

const parseTags = (tagsInput?: string) => {
  if (!tagsInput) return undefined;
  const tags = tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
};

export function CategoryDetailsForm({ categoryId, onSuccess }: CategoryDetailsFormProps) {
  const { data: categoryResponse, isLoading } = usePredefinedSubtaskCategory(categoryId);
  const category = categoryResponse?.data;
  const updateCategoryMutation = useUpdatePredefinedSubtaskCategory(categoryId);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<PredefinedSubtaskCategoryFormData>({
    resolver: zodResolver(predefinedSubtaskCategorySchema),
    mode: 'onChange',
    defaultValues: {
      taskCategoryTitle: '',
      taskCategoryDescription: '',
      tags: '',
      isStandaloneEnabled: true,
      isActive: true,
    },
  });

  useEffect(() => {
    if (category) {
      reset({
        taskCategoryTitle: category.taskCategoryTitle || '',
        taskCategoryDescription: category.taskCategoryDescription || '',
        tags: category.tags?.join(', ') || '',
        isStandaloneEnabled: category.isStandaloneEnabled ?? true,
        isActive: category.isActive ?? true,
      });
    }
  }, [category, reset]);

  const onSubmit = useCallback(
    (data: PredefinedSubtaskCategoryFormData) => {
      const payload: Record<string, any> = {};

      if (dirtyFields.taskCategoryTitle) {
        payload.taskCategoryTitle = data.taskCategoryTitle.trim();
      }

      if (dirtyFields.taskCategoryDescription) {
        payload.taskCategoryDescription = data.taskCategoryDescription?.trim() || '';
      }

      if (dirtyFields.tags) {
        const normalizedTags = parseTags(data.tags);
        payload.tags = normalizedTags ?? [];
      }

      if (dirtyFields.isStandaloneEnabled) {
        payload.isStandaloneEnabled = data.isStandaloneEnabled;
      }

      if (dirtyFields.isActive) {
        payload.isActive = data.isActive;
      }

      if (Object.keys(payload).length === 0) {
        toast?.push?.(<Notification type="info">No changes to save</Notification>);
        return;
      }

      updateCategoryMutation.mutate(payload, {
        onSuccess: () => {
          toast?.push?.(<Notification type="success">Category updated successfully</Notification>);
          if (onSuccess) {
            onSuccess();
          }
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.error || error?.message || 'Failed to update category';
          toast?.push?.(<Notification type="danger">{errorMessage}</Notification>);
        },
      });
    },
    [dirtyFields, onSuccess, updateCategoryMutation]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(onSubmit)(e);
  };

  if (isLoading || !category) {
    return (
      <FormPreloader
        formFields={['Title', 'Description', 'Tags', 'Standalone', 'Active']}
        showButtons={true}
        buttonCount={1}
        className="p-2"
      />
    );
  }

  const isSaving = updateCategoryMutation.isPending;

  return (
    <div className="w-full">
      <Form onSubmit={handleFormSubmit}>
        <div className="space-y-4">
          <FormItem
            label="Title"
            invalid={Boolean(errors?.taskCategoryTitle)}
            errorMessage={errors.taskCategoryTitle?.message}
          >
            <Controller
              name="taskCategoryTitle"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="Enter category title" maxLength={100} disabled={isSaving} />
              )}
            />
          </FormItem>

          <FormItem
            label="Description"
            invalid={Boolean(errors?.taskCategoryDescription)}
            errorMessage={errors.taskCategoryDescription?.message}
          >
            <Controller
              name="taskCategoryDescription"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter description (optional)"
                  rows={4}
                  maxLength={500}
                  disabled={isSaving}
                />
              )}
            />
            <small className="text-gray-500">
              {(watch('taskCategoryDescription') as string)?.length || 0}/500 characters
            </small>
          </FormItem>

          <FormItem label="Tags" invalid={Boolean(errors?.tags)} errorMessage={errors.tags?.message}>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Comma separated tags (optional)"
                  disabled={isSaving}
                />
              )}
            />
          </FormItem>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Standalone Enabled</p>
                <p className="text-xs text-gray-500">Allow using as a standalone task</p>
              </div>
              <Controller
                name="isStandaloneEnabled"
                control={control}
                render={({ field }) => (
                  <Switcher checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Active</p>
                <p className="text-xs text-gray-500">Show this category in lists</p>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => <Switcher checked={field.value} onChange={field.onChange} />}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit" variant="solid" loading={isSaving} disabled={isSaving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
