'use client';

import { useCallback } from 'react';
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
import { useCreatePredefinedSubtaskCategory } from '@/services/hooks/usePredefinedSubtaskCategories';

interface CategoryFormWrapperProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

const parseTags = (tagsInput?: string) => {
  if (!tagsInput) return undefined;
  const tags = tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
};

export function CategoryFormWrapper({ onSuccess, onClose }: CategoryFormWrapperProps) {
  const createCategoryMutation = useCreatePredefinedSubtaskCategory();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
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

  const onSubmit = useCallback(
    async (data: PredefinedSubtaskCategoryFormData) => {
      try {
        const payload = {
          taskCategoryTitle: data.taskCategoryTitle.trim(),
          taskCategoryDescription: data.taskCategoryDescription?.trim() || undefined,
          tags: parseTags(data.tags),
          isStandaloneEnabled: data.isStandaloneEnabled,
          isActive: data.isActive,
        };

        await createCategoryMutation.mutateAsync(payload);
        toast?.push?.(
          <Notification title="Category created" type="success">
            Category created successfully
          </Notification>
        );

        if (onSuccess) {
          onSuccess();
        }

        reset?.();
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.error || error?.message || 'Failed to create category';
        toast?.push?.(
          <Notification title="Error" type="danger">
            {errorMessage}
          </Notification>
        );
      }
    },
    [createCategoryMutation, onSuccess, reset]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(onSubmit)(e);
  };

  const isLoading = createCategoryMutation.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Form onSubmit={handleFormSubmit} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
          <FormItem
            label="Title"
            invalid={Boolean(errors?.taskCategoryTitle)}
            errorMessage={errors.taskCategoryTitle?.message}
          >
            <Controller
              name="taskCategoryTitle"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="Enter category title" maxLength={100} disabled={isLoading} />
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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

          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-gray-200 bg-white pt-4">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
              Close
            </Button>
            <Button type="submit" variant="solid" loading={isLoading} disabled={isLoading}>
              Create Category
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
