'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Form from '@/components/ui/Form/Form';
import FormItem from '@/components/ui/Form/FormItem';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useCreateBoard } from '@/hooks/useBoards';
import { useForm } from 'react-hook-form';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { BoardVisibilityToggle } from './BoardVisibilityToggle';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (boardId: string) => void;
}

interface CreateBoardFormData {
  name: string;
  description: string;
  onlyMe: boolean;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createBoardMutation = useCreateBoard();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateBoardFormData>({
    defaultValues: {
      name: '',
      description: '',
      onlyMe: false,
    },
  });

  const onlyMeValue = watch('onlyMe');

  const onSubmit = async (data: CreateBoardFormData) => {
    if (!data.name.trim()) {
      toast.push(
        <Notification title="Validation Error" type="danger">
          Board name is required
        </Notification>,

      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createBoardMutation.mutateAsync({
        name: data.name.trim(),
        board_type: 'CUSTOM',
        description: data.description?.trim() || undefined,
        onlyMe: data.onlyMe || false,
      });

      toast.push(
        <Notification title="Success" type="success">
          Board created successfully
        </Notification>,

      );

      reset();
      onClose();
      if (onSuccess && response.data?._id) {
        onSuccess(response.data._id);
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create board. Please try again.';

      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>,

      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} width={500}>
      <div className="p-2">
        <h4 className="mb-2 text-lg font-semibold text-gray-900">Create New Board</h4>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormItem
            label="Board Name"
            invalid={Boolean(errors.name)}
            errorMessage={errors.name?.message}
            className="mb-4"
          >
            <Input
              {...register('name', {
                required: 'Board name is required',
                minLength: {
                  value: 1,
                  message: 'Board name cannot be empty',
                },
              })}
              placeholder="Enter board name"
              disabled={isSubmitting}
            />
          </FormItem>

          <FormItem
            label="Description"
            invalid={Boolean(errors.description)}
            errorMessage={errors.description?.message}
            className="mb-6"
          >
            <Input
              {...register('description')}
              textArea
              rows={4}
              placeholder="Enter board description (optional)"
              disabled={isSubmitting}
            />
          </FormItem>

          <BoardVisibilityToggle
            value={onlyMeValue}
            isSubmitting={isSubmitting}
            register={register('onlyMe')}
            setValue={setValue}
            error={errors.onlyMe}
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="plain"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Board
            </Button>
          </div>
        </Form>
      </div>
    </Dialog>
  );
};
