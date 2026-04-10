'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Dialog from '@/components/ui/Dialog';
import Form from '@/components/ui/Form/Form';
import FormItem from '@/components/ui/Form/FormItem';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { X } from 'lucide-react';
import { Task } from '../types';
import { UpdateTaskRequest } from '@/services/TaskService';

interface UpdateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdate: (id: string, data: UpdateTaskRequest) => Promise<void>;
  isUpdating?: boolean;
}

export const UpdateTaskModal: React.FC<UpdateTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onUpdate,
  isUpdating = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ taskTitle: string; taskDescription?: string }>({
    defaultValues: {
      taskTitle: '',
      taskDescription: '',
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      reset({
        taskTitle: task.title || '',
        taskDescription: task.description || '',
      });
    }
  }, [task, reset]);

  const onSubmit = async (data: { taskTitle: string; taskDescription?: string }) => {
    if (!task) return;

    try {
      await onUpdate(task.id, {
        taskTitle: data.taskTitle.trim(),
        taskDescription: data.taskDescription?.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} width={500}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-gray-900">Update Task</h4>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormItem
            label="Task Title"
            invalid={!!errors.taskTitle}
            errorMessage={errors.taskTitle?.message}
          >
            <Input
              {...register('taskTitle', {
                required: 'Task title is required',
                minLength: {
                  value: 1,
                  message: 'Task title must be at least 1 character',
                },
              })}
              placeholder="Enter task title"
              autoFocus
            />
          </FormItem>

          <FormItem
            label="Description"
            invalid={!!errors.taskDescription}
            errorMessage={errors.taskDescription?.message}
          >
            <Input
              {...register('taskDescription')}
              textArea
              rows={4}
              placeholder="Enter task description (optional)"
            />
          </FormItem>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="plain"
              onClick={handleClose}
              disabled={isSubmitting || isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              loading={isSubmitting || isUpdating}
              disabled={isSubmitting || isUpdating}
            >
              Update Task
            </Button>
          </div>
        </Form>
      </div>
    </Dialog>
  );
};
