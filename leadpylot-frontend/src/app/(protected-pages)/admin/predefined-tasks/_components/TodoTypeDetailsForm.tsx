'use client';

import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Select from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { FormPreloader } from '@/components/shared/loaders';
import { useDeletePredefinedSubtask, usePredefinedSubtask, useUpdatePredefinedSubtask } from '@/services/hooks/usePredefinedSubtasks';
import type { UpdatePredefinedSubtaskRequest } from '@/services/PredefinedSubtasksService';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { predefinedSubtaskSchema, type PredefinedSubtaskFormData } from './todoTypeSchema';
import Switcher from '@/components/ui/Switcher';
import { usePredefinedSubtaskCategories } from '@/services/hooks/usePredefinedSubtaskCategories';

interface TodoTypeDetailsFormProps {
  todoTypeId: string;
  onClose?: () => void;
  onSuccess?: () => void;
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

export function TodoTypeDetailsForm({
  todoTypeId,
  onClose,
  onSuccess,
}: TodoTypeDetailsFormProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [todoDirty, setTodoDirty] = useState(false);
  const newTodoInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const { data: predefinedSubtaskResponse, isLoading: isLoadingSubtask } = usePredefinedSubtask(todoTypeId);
  const predefinedSubtask = predefinedSubtaskResponse?.data;
  const { data: categoriesData, isLoading: isCategoriesLoading } = usePredefinedSubtaskCategories({
    isActive: true,
  });
  const { mutate: updatePredefinedSubtask, isPending: isUpdating } = useUpdatePredefinedSubtask(todoTypeId);
  const { mutate: deletePredefinedSubtask, isPending: isDeleting } = useDeletePredefinedSubtask(todoTypeId, {
    onSuccess: () => {
      toast?.push?.(<Notification type="success">Predefined subtask deleted successfully</Notification>);
      if (onSuccess) {
        onSuccess();
      }
      if (onClose) {
        onClose();
      }
    },
      onError: (error: any) => {
        const errorMessage =
          error?.response?.data?.error || error?.message || 'Failed to delete predefined subtask';
        toast?.push?.(<Notification type="danger">{errorMessage}</Notification>);
        setIsDeleteDialogOpen(false);
      },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, dirtyFields },
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

  useEffect(() => {
    if (predefinedSubtask) {
      const initialTodoItems = predefinedSubtask.todo?.map((item) => ({
        _id: item._id,
        title: item.title,
        priority: item.priority,
      })) || [];

      reset({
        taskTitle: predefinedSubtask.taskTitle || '',
        taskDescription: predefinedSubtask.taskDescription || '',
        priority: predefinedSubtask.priority || 'medium',
        category: (predefinedSubtask.category || [])
          .map((category: any) =>
            typeof category === 'string' ? category : category?._id || category?.id
          )
          .filter(Boolean) as string[],
        tags: predefinedSubtask.tags?.join(', ') || '',
        isActive: predefinedSubtask.isActive ?? true,
        todo: initialTodoItems,
      });
      // Reset dirty state after form reset
      setTimeout(() => {
        setTodoDirty(false);
      }, 0);
    }
  }, [predefinedSubtask, reset]);

  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      appendTodo({
        title: newTodoTitle.trim(),
        priority: 'low',
      });
      setNewTodoTitle('');
      setTodoDirty(true);
      // Focus back on the input field after adding
      setTimeout(() => {
        newTodoInputRef.current?.focus();
      }, 0);
    }
  };

  const handleRemoveTodo = (index: number) => {
    removeTodo(index);
    setTodoDirty(true);
  };

  const onSubmit = useCallback((data: PredefinedSubtaskFormData) => {
    setNewTodoTitle('');

    const formattedData: UpdatePredefinedSubtaskRequest = {};

    if (dirtyFields.taskTitle) {
      formattedData.taskTitle = data.taskTitle.trim();
    }

    if (dirtyFields.taskDescription) {
      formattedData.taskDescription = data.taskDescription ? data.taskDescription.trim() : '';
    }

    if (dirtyFields.priority) {
      formattedData.priority = data.priority || 'medium';
    }

    if (dirtyFields.category) {
      formattedData.category = data.category;
    }

    if (dirtyFields.tags) {
      formattedData.tags = parseTags(data.tags) ?? [];
    }

    if (dirtyFields.isActive) {
      formattedData.isActive = data.isActive;
    }

    if (todoDirty) {
      const validTodos = (data.todo || [])
        .filter((item) => item.title && item.title.trim().length > 0)
        .map((item) => {
          const todoItem: {
            _id?: string;
            title: string;
            description?: string;
            priority?: 'low' | 'medium' | 'high';
            dueDate?: string;
          } = {
            title: item.title!.trim(),
          };
          if (item._id) todoItem._id = item._id;
          if (item.description) todoItem.description = item.description;
          if (item.priority) todoItem.priority = item.priority;
          if (item.dueDate) todoItem.dueDate = item.dueDate;
          return todoItem;
        });

      formattedData.todo = validTodos;
    }

    if (Object.keys(formattedData).length === 0) {
      toast?.push?.(<Notification type="info">No changes to save</Notification>);
      return;
    }

    updatePredefinedSubtask?.(formattedData, {
      onSuccess: () => {
        toast?.push?.(<Notification type="success">Predefined subtask updated successfully</Notification>);
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: any) => {
        const errorMessage =
          error?.response?.data?.error || error?.message || 'Failed to update predefined subtask';
        toast?.push?.(<Notification type="danger">{errorMessage}</Notification>);
      },
    });
  }, [dirtyFields, todoDirty, updatePredefinedSubtask, onSuccess]);

  const handleDelete = () => {
    deletePredefinedSubtask?.();
  };

  const onSubmitHandler = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(
        (data) => {
          onSubmit(data);
        },
        (errors) => {
          // Simple error message - just show the first error
          const firstError =
            errors.taskTitle?.message ||
            errors.category?.message ||
            errors.priority?.message ||
            'Please fix the form errors';
          toast?.push?.(
            <Notification type="danger">
              {firstError}
            </Notification>
          );
        }
      )(e);
    },
    [handleSubmit, onSubmit]
  );

  const isLoading = isLoadingSubtask || isUpdating || isDeleting;

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

  if (isLoadingSubtask || !predefinedSubtask) {
    return (
      <FormPreloader
        formFields={['Task Title', 'Task Description', 'Priority', 'Category', 'Tags', 'Active', 'Todo Items']}
        showButtons={true}
        buttonCount={2}
        className="p-2"
      />
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <Form onSubmit={onSubmitHandler} className="flex h-full min-h-0 flex-col">
          {/* Header with action buttons */}
          <div className="my-2 flex shrink-0 items-center justify-between">
            <h2 className="text-sm capitalize">Predefined Subtask Details</h2>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="solid"
                size="xs"
                loading={isUpdating}
                icon={<ApolloIcon name="file" className="text-md" />}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                Save Changes
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isLoading}
                size="xs"
                icon={<ApolloIcon name="trash" className="text-md" />}
              >
                Delete
              </Button>
            </div>
          </div>

          {/* Content - scrollable so full form is visible */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
            {/* Title */}
            <FormItem label="Title" invalid={Boolean(errors.taskTitle)} errorMessage={errors.taskTitle?.message}>
              <Controller
                name="taskTitle"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <Input {...field} disabled={isLoading} maxLength={200} />
                  </div>
                )}
              />
            </FormItem>

            {/* Description */}
            <FormItem
              label="Description"
              invalid={Boolean(errors.taskDescription)}
              errorMessage={errors.taskDescription?.message}
            >
              <Controller
                name="taskDescription"
                control={control}
                render={({ field }) => (
                  <div>
                    <textarea
                      {...field}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      placeholder="Enter description (optional)"
                      rows={4}
                      maxLength={1000}
                      disabled={isLoading}
                    />
                    <small className="text-gray-500">
                      {field.value?.length || 0}/1000 characters
                    </small>
                  </div>
                )}
              />
            </FormItem>

            {/* Priority */}
            <FormItem
              label="Priority"
              invalid={Boolean(errors.priority)}
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

            {/* Category */}
            <FormItem
              label="Category"
              invalid={Boolean(errors.category)}
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
                    instanceId="predefined-subtask-edit-category-select"
                  />
                )}
              />
            </FormItem>

            {/* Tags */}
            <FormItem label="Tags" invalid={Boolean(errors.tags)} errorMessage={errors.tags?.message}>
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

            <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Active</p>
                <p className="text-xs text-gray-500">Show this task in lists</p>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switcher checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            {/* Todo Items */}
            <FormItem label="Todo Items" invalid={Boolean(errors.todo)} errorMessage={errors.todo?.message}>
              <div className="space-y-2">
                <div className="flex w-full gap-2">
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
                    className="min-h-[40px] flex-1 min-w-0"
                  />
                  <Button
                    type="button"
                    variant="solid"
                    size="sm"
                    icon={<ApolloIcon name="plus" />}
                    onClick={handleAddTodo}
                    disabled={isLoading || !newTodoTitle.trim()}
                    className="h-10 shrink-0 px-4"
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
                                    onChange={(event) => {
                                      todoField.onChange(event);
                                      setTodoDirty(true);
                                    }}
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
                                    onChange={(option: any) => {
                                      priorityField.onChange(option?.value);
                                      setTodoDirty(true);
                                    }}
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
                              onClick={() => handleRemoveTodo(index)}
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

            {/* Created By Info */}
            {predefinedSubtask?.createdBy && (
              <div className="rounded-md bg-gray-50 p-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-700">Created By</h4>
                <p className="text-sm text-gray-600">
                  {predefinedSubtask?.createdBy?.first_name || ''} {predefinedSubtask?.createdBy?.last_name || ''} (
                  {predefinedSubtask?.createdBy?.login || 'Unknown'})
                </p>
                {predefinedSubtask?.createdAt && (
                  <p className="mt-1 text-xs text-gray-500">
                    Created: {new Date(predefinedSubtask.createdAt).toLocaleString()}
                  </p>
                )}
                {predefinedSubtask?.updatedAt && (
                  <p className="text-xs text-gray-500">
                    Updated: {new Date(predefinedSubtask.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </Form>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onRequestClose={() => setIsDeleteDialogOpen(false)}
      >
        <h4 className="mb-4 text-lg font-semibold">Delete Predefined Subtask</h4>
        <p className="mb-6">
          Are you sure you want to delete &quot;{predefinedSubtask?.taskTitle || 'this predefined subtask'}&quot;? This action cannot be undone.
          If this predefined subtask is being used by any todos, deletion will be prevented.
        </p>
        <div className="flex justify-end space-x-2">
          <Button
            variant="default"
            onClick={() => setIsDeleteDialogOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
