'use client';

import Switcher from '@/components/ui/Switcher';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Table from '@/components/ui/Table';
import { toast } from '@/components/ui/toast';
import { useDeleteStage, useStage, useUpdateStage } from '@/services/hooks/useStages';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { stageSchema, type StageFormData } from './CreateStageDialog';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { FormPreloader } from '@/components/shared/loaders';

const { Tr, Th, Td, THead, TBody } = Table;

interface StageDetailsFormProps {
  stageId: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function StageDetailsForm({ stageId, onClose, onSuccess }: StageDetailsFormProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: stage, isLoading: isLoadingStage } = useStage(stageId);
  const { mutate: updateStage, isPending: isUpdating } = useUpdateStage(stageId);
  const { mutate: deleteStage, isPending: isDeleting } = useDeleteStage(stageId);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    values: {
      name: stage?.name || '',
      isWonStage: !!stage?.info?.isWonStage,
      statuses: stage?.info?.statuses || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'statuses',
  });

  useEffect(() => {
    if (stage) {
      reset({
        name: stage.name || '',
        isWonStage: stage.info.isWonStage || false,
        statuses: stage.info.statuses || [],
      });
    }
  }, [stage, reset]);

  const onSubmit = (data: StageFormData) => {
    // Format data to match the backend's expected structure
    const formattedData = {
      name: data.name,
      isWonStage: data.isWonStage,
      statuses: data.statuses || [],
    };

    updateStage(formattedData, {
      onSuccess: () => {
        toast.push(<Notification type="success">Stage updated successfully</Notification>);
        if (onSuccess) onSuccess();
      },
      onError: (error) => {
        console.error('Failed to update stage:', error);
        toast.push(<Notification type="danger">Failed to update stage</Notification>);
      },
    });
  };

  const handleDelete = () => {
    deleteStage(undefined, {
      onSuccess: () => {
        toast.push(<Notification type="success">Stage deleted successfully</Notification>);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      },
      onError: () => {
        toast.push(<Notification type="danger">Failed to delete stage</Notification>);
        setIsDeleteDialogOpen(false);
      },
    });
  };

  const isLoading = isLoadingStage || isUpdating || isDeleting;

  if (isLoadingStage || !stage) {
    return (
      <FormPreloader
        formFields={['Stage Name', 'Is Won Stage', 'Statuses']}
        showButtons={true}
        buttonCount={4}
        className="p-2"
      />
    );
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <Form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          {/* Header with action buttons */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold">Stage Details</h2>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="solid"
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
                icon={<ApolloIcon name="trash" className="text-md" />}
              >
                Delete
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6 overflow-y-auto">
            {/* Stage Name */}
            <FormItem
              label="Stage Name"
              invalid={Boolean(errors.name)}
              errorMessage={errors.name?.message}
            >
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <Input {...field} disabled={isLoading} />
                  </div>
                )}
              />
            </FormItem>

            {/* Is Won Stage */}
            <FormItem
              label="Is Won Stage"
              invalid={Boolean(errors.isWonStage)}
              errorMessage={errors.isWonStage?.message}
            >
              <Controller
                name="isWonStage"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <div>
                    <Checkbox {...field} checked={value} onChange={onChange} disabled={isLoading} />
                  </div>
                )}
              />
            </FormItem>

            {/* Statuses */}
            <div>
              <h4 className="mb-4 text-lg font-bold">Statuses</h4>
              <div className="flex flex-col gap-2">
                <Table>
                  <THead>
                    <Tr>
                      <Th>NAME</Th>
                      <Th>CODE</Th>
                      <Th>ALLOWED</Th>
                      <Th className="w-10"></Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {fields.map((item, index) => (
                      <Tr key={item.id}>
                        <Td>
                          <Controller
                            name={`statuses.${index}.name`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                disabled={isLoading}
                                className="border-none bg-transparent"
                              />
                            )}
                          />
                          {errors.statuses?.[index]?.name && (
                            <p className="text-xs text-red-500">
                              {errors.statuses[index]?.name?.message}
                            </p>
                          )}
                        </Td>
                        <Td>
                          <Controller
                            name={`statuses.${index}.code`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                disabled={isLoading}
                                className="border-none bg-transparent"
                              />
                            )}
                          />
                          {errors.statuses?.[index]?.code && (
                            <p className="text-xs text-red-500">
                              {errors.statuses[index]?.code?.message}
                            </p>
                          )}
                        </Td>
                        <Td>
                          <Controller
                            name={`statuses.${index}.allowed`}
                            control={control}
                            render={({ field: { value, onChange, ...fieldProps } }) => (
                              <Switcher
                                {...fieldProps}
                                checked={value}
                                onChange={onChange}
                                disabled={isLoading}
                              />
                            )}
                          />
                        </Td>
                        <Td>
                          <Button
                            size="xs"
                            variant="plain"
                            icon={<ApolloIcon name="trash" className="text-md" />}
                            onClick={() => remove(index)}
                            disabled={isLoading}
                            type="button"
                            className="text-gray-500 hover:text-red-700"
                          />
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>

                <Button
                  size="sm"
                  variant="plain"
                  icon={<ApolloIcon name="plus" className="text-md" />}
                  onClick={() =>
                    append({
                      name: '',
                      code: '',
                      allowed: true,
                    })
                  }
                  disabled={isLoading}
                  type="button"
                  className="self-start"
                >
                  Add a status
                </Button>
              </div>
            </div>
          </div>
        </Form>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onRequestClose={() => setIsDeleteDialogOpen(false)}
      >
        <h4 className="mb-4 text-lg font-semibold">Delete Stage</h4>
        <p className="mb-6">
          Are you sure you want to delete this stage? This action cannot be undone.
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
