'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Select from '@/components/ui/Select';
import toast from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useCreatePredefinedSubtask } from '@/services/hooks/usePredefinedSubtasks';
import { usePredefinedSubtaskCategories } from '@/services/hooks/usePredefinedSubtaskCategories';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { predefinedSubtaskSchema, type PredefinedSubtaskFormData } from './todoTypeSchema';
import Switcher from '@/components/ui/Switcher';

interface TodoTypeFormWrapperProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const multiSelectCategoryLabels = new Set(['email', 'opening', 'offer', 'lead']);
const primaryCategoryLabels = ['lead', 'email', 'offer', 'opening'] as const;

const normalizeCategoryLabel = (label?: string) => (label || '').trim().toLowerCase();

const isMultiSelectCategory = (option?: { label?: string }) =>
  Boolean(option?.label && multiSelectCategoryLabels.has(normalizeCategoryLabel(option.label)));

const getPrimaryCategoryFromPath = (pathname?: string | null) => {
  if (!pathname) return null;
  if (/^\/dashboards\/leads\/[a-f0-9]{24}$/i.test(pathname)) return 'lead';
  if (pathname.startsWith('/dashboards/mails')) return 'email';
  if (pathname.startsWith('/dashboards/offers')) return 'offer';
  if (
    pathname.startsWith('/dashboards/openings') ||
    pathname.startsWith('/dashboards/confirmation') ||
    pathname.startsWith('/dashboards/payment') ||
    pathname.startsWith('/dashboards/netto') ||
    pathname.startsWith('/dashboards/payment-vouchers')
  ) {
    return 'opening';
  }
  return null;
};

const parseTags = (tagsInput?: string) => {
  if (!tagsInput) return undefined;
  const tags = tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
};

export function TodoTypeFormWrapper({ onSuccess, onClose }: TodoTypeFormWrapperProps) {
  const createPredefinedSubtaskMutation = useCreatePredefinedSubtask();
  const pathname = usePathname();
  const { data: categoriesData, isLoading: isCategoriesLoading } = usePredefinedSubtaskCategories({
    isActive: true,
  });
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const newTodoInputRef = useRef<HTMLInputElement>(null);

  const primaryCategoryFromPath = useMemo(
    () => getPrimaryCategoryFromPath(pathname),
    [pathname]
  );

  const categoryOptions = useMemo(
    () =>
      (categoriesData?.data || [])
        .map((category) => ({
          value: category._id,
          label: category.taskCategoryTitle || 'Untitled',
        }))
        .filter((option) => {
          if (!primaryCategoryFromPath) return true;
          const normalizedLabel = normalizeCategoryLabel(option.label);
          if (!primaryCategoryLabels.includes(normalizedLabel as typeof primaryCategoryLabels[number])) {
            return true;
          }
          return normalizedLabel === primaryCategoryFromPath;
        }),
    [categoriesData, primaryCategoryFromPath]
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PredefinedSubtaskFormData>({
    resolver: zodResolver(predefinedSubtaskSchema),
    mode: 'onChange',
    defaultValues: {
      taskTitle: '',
      taskDescription: '',
      priority: 'medium',
      category: [],
      tags: '',
      isActive: true,
      todo: [],
    },
  });

  const { fields: todoFields, append: appendTodo, remove: removeTodo } = useFieldArray({
    control,
    name: 'todo',
  });

  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      appendTodo({
        title: newTodoTitle.trim(),
        priority: 'low',
      });
      setNewTodoTitle('');
      // Focus back on the input field after adding
      setTimeout(() => {
        newTodoInputRef.current?.focus();
      }, 0);
    }
  };

  const onSubmit = useCallback(async (data: PredefinedSubtaskFormData) => {
    try {
      setNewTodoTitle('');

      // Simple: filter out items without title, todo is optional
      const validTodos = (data.todo || [])
        .filter((item) => item.title && item.title.trim().length > 0)
        .map((item) => ({
          title: item.title!,
          description: item.description,
          priority: item.priority || 'low', // Default to 'low' for create
          isCompleted: item.isCompleted,
          dueDate: item.dueDate,
        }));

      const formattedData = {
        taskTitle: data.taskTitle.trim(),
        taskDescription: data.taskDescription?.trim() || undefined,
        priority: data.priority || 'medium',
        category: data.category,
        tags: parseTags(data.tags),
        isActive: data.isActive,
        todo: validTodos.length > 0 ? validTodos : undefined,
      };

      await createPredefinedSubtaskMutation?.mutateAsync?.(formattedData);
      toast?.push?.(
        <Notification title="Predefined subtask created" type="success">
          Predefined subtask created successfully
        </Notification>
      );

      if (onSuccess) {
        onSuccess();
      }

      reset?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error || error?.message || 'Failed to create predefined subtask';
      toast?.push?.(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    }
  }, [createPredefinedSubtaskMutation, onSuccess, reset]);

  const isLoading = createPredefinedSubtaskMutation.isPending;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(onSubmit)(e);
  };

  const formId = 'add-predefined-task-form';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Form id={formId} onSubmit={handleFormSubmit} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
          <FormItem
            label="Title"
            invalid={Boolean(errors?.taskTitle)}
            errorMessage={errors.taskTitle?.message}
          >
            <Controller
              name="taskTitle"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter title"
                  maxLength={200}
                  disabled={isLoading}
                />
              )}
            />
          </FormItem>

          <FormItem
            label="Description"
            invalid={Boolean(errors?.taskDescription)}
            errorMessage={errors.taskDescription?.message}
          >
            <Controller
              name="taskDescription"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter description (optional)"
                  rows={4}
                  maxLength={1000}
                  disabled={isLoading}
                />
              )}
            />
            <small className="text-gray-500">
              {(watch('taskDescription') as string)?.length || 0}/1000 characters
            </small>
          </FormItem>

          

          <FormItem
            label="Category"
            invalid={Boolean(errors?.category)}
            errorMessage={errors.category?.message}
          >
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  isMulti
                  selectMultipleOptions
                  placeholder={isCategoriesLoading ? 'Loading categories...' : 'Select categories'}
                  options={categoryOptions}
                  value={categoryOptions.filter((option) =>
                    (field.value || []).includes(option.value)
                  )}
                  onChange={(selected: unknown, actionMeta: any) => {
                    const selectedOptions = Array.isArray(selected)
                      ? (selected as Array<{ value: string; label?: string }>)
                      : [];

                    if (selectedOptions.length <= 1) {
                      field.onChange(selectedOptions.map((option) => option.value));
                      return;
                    }

                    const hasNonMultiCategory = selectedOptions.some((option) => !isMultiSelectCategory(option));
                    if (!hasNonMultiCategory) {
                      field.onChange(selectedOptions.map((option) => option.value));
                      return;
                    }

                    const actionOption = actionMeta?.option as { value: string; label?: string } | undefined;
                    const nonMultiOption = selectedOptions.find((option) => !isMultiSelectCategory(option));
                    const keepOption =
                      actionOption && !isMultiSelectCategory(actionOption) ? actionOption : nonMultiOption;
                    field.onChange(keepOption ? [keepOption.value] : []);
                  }}
                  isDisabled={isLoading || isCategoriesLoading}
                  instanceId="predefined-subtask-category-select"
                />
              )}
            />
          </FormItem>
          <FormItem
            label="Priority"
            invalid={Boolean(errors?.priority)}
            errorMessage={errors.priority?.message}
          >
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={priorityOptions}
                  value={priorityOptions.find((option) => option.value === field.value)}
                  onChange={(option: any) => field.onChange(option?.value)}
                  isDisabled={isLoading}
                />
              )}
            />
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

          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Active</p>
                <p className="text-xs text-gray-500">Show this task in lists</p>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => <Switcher checked={field.value} onChange={field.onChange} />}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <FormItem label="Todo Items" invalid={Boolean(errors?.todo)} errorMessage={errors.todo?.message}>
            <div className="space-y-2">
              <div className="flex w-full items-center gap-2">
                <Input
                  ref={newTodoInputRef}
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTodo();
                    }
                  }}
                  placeholder="Enter todo item title and press Enter"
                  disabled={isLoading}
                  className="flex-1 min-w-0 py-[4px]"
                />
                <Button
                  type="button"
                  variant="solid"
                  size="sm"
                  icon={<ApolloIcon name="plus" />}
                  onClick={handleAddTodo}
                  disabled={isLoading || !newTodoTitle.trim()}
                  className="shrink-0"
                >
                  Add
                </Button>
              </div>
              {todoFields.length > 0 && (
                <div className="space-y-2">
                  {todoFields.map((field, index) => {
                    const todoError = errors.todo?.[index];
                    const titleError = todoError?.title;
                    const priorityError = todoError?.priority;
                    
                    return (
                      <div key={field.id} className="space-y-1">
                        <div className="flex items-center gap-2 rounded border p-2">
                          <div className="flex-1">
                            <Controller
                              name={`todo.${index}.title`}
                              control={control}
                              render={({ field: todoField }) => (
                                <Input
                                  {...todoField}
                                  placeholder="Todo item title"
                                  className={titleError ? 'border-red-500' : ''}
                                  disabled={isLoading}
                                />
                              )}
                            />
                            {titleError && (
                              <p className="mt-1 text-xs text-red-500">{titleError.message}</p>
                            )}
                          </div>
                          <div className="w-32">
                            <Controller
                              name={`todo.${index}.priority`}
                              control={control}
                              render={({ field: priorityField }) => (
                                <Select
                                  {...priorityField}
                                  options={priorityOptions}
                                  value={priorityOptions.find((option) => option.value === priorityField.value)}
                                  onChange={(option: any) => priorityField.onChange(option?.value)}
                                  isDisabled={isLoading}
                                  className={priorityError ? 'border-red-500' : ''}
                                />
                              )}
                            />
                            {priorityError && (
                              <p className="mt-1 text-xs text-red-500">{priorityError.message}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="plain"
                            size="xs"
                            icon={<ApolloIcon name="trash" />}
                            onClick={() => removeTodo(index)}
                            disabled={isLoading}
                            className="text-red-600"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </FormItem>
          </div>
        </div>

        <div className="mt-4 shrink-0 flex justify-end space-x-2 border-t border-gray-200 bg-white pt-4">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            Close
          </Button>
          <Button variant="solid" type="submit" loading={isLoading}>
            Create
          </Button>
        </div>
      </Form>
    </div>
  );
}
