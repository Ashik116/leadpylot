'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import Form from '@/components/ui/Form/Form';
import FormItem from '@/components/ui/Form/FormItem';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useUpdateBoard } from '@/hooks/useBoards';
import { useForm } from 'react-hook-form';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { BoardVisibilityToggle } from './BoardVisibilityToggle';

interface EditBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string | null;
  initialName: string;
  initialOnlyMe?: boolean;
  onSuccess?: () => void;
}

interface EditBoardFormData {
  name: string;
  onlyMe: boolean;
}

export const EditBoardModal: React.FC<EditBoardModalProps> = ({
  isOpen,
  onClose,
  boardId,
  initialName,
  initialOnlyMe = false,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateBoardMutation = useUpdateBoard();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<EditBoardFormData>({
    defaultValues: {
      name: initialName,
      onlyMe: initialOnlyMe,
    },
  });

  const onlyMeValue = watch('onlyMe');

  // Reset form when modal opens or initialName changes
  useEffect(() => {
    if (isOpen) {
      reset({ name: initialName, onlyMe: initialOnlyMe });
    }
  }, [isOpen, initialName, initialOnlyMe, reset]);

  const onSubmit = async (data: EditBoardFormData) => {
    if (!data.name.trim()) {
      toast.push(
        <Notification title="Validation Error" type="danger">
          Board name is required
        </Notification>
      );
      return;
    }

    if (!boardId) {
      toast.push(
        <Notification title="Error" type="danger">
          Board ID is missing
        </Notification>
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await updateBoardMutation.mutateAsync({
        id: boardId,
        data: {
          name: data.name.trim(),
          onlyMe: data.onlyMe || false,
        },
      });

      toast.push(
        <Notification title="Success" type="success">
          Board updated successfully
        </Notification>
      );

      reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update board. Please try again.';

      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
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
        <h4 className="mb-2 text-lg font-semibold text-gray-900">Edit Board</h4>

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
              Update Board
            </Button>
          </div>
        </Form>
      </div>
    </Dialog>
  );
};
