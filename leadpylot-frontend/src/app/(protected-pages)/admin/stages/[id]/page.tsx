'use client';

import Loading from '@/components/shared/Loading';
import Switcher from '@/components/ui/Switcher';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Checkbox from '@/components/ui/Checkbox';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Table from '@/components/ui/Table';
import { toast } from '@/components/ui/toast';
import { useDeleteStage, useStage, useUpdateStage } from '@/services/hooks/useStages';
import { zodResolver } from '@hookform/resolvers/zod';
import { use, useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { stageSchema, type StageFormData } from '../_components/CreateStageDialog';
import ApolloIcon from '@/components/ui/ApolloIcon';

const { Tr, Th, Td, THead, TBody } = Table;

export default function StageDetails({ params }: { params: Promise<{ id: string }> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { id } = use(params);

  const { data: stage, isLoading: isLoadingStage } = useStage(id);
  const { mutate: updateStage, isPending: isUpdating } = useUpdateStage(id);
  const { mutate: deleteStage, isPending: isDeleting } = useDeleteStage(id);
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
      statuses: data.statuses || []
    };

    updateStage(formattedData, {
      onSuccess: () => {
        setIsEditing(false);
        toast.push(<Notification type="success">Stage updated successfully</Notification>);
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
      },
      onError: () => {
        toast.push(<Notification type="danger">Failed to delete stage</Notification>);
        setIsDeleteDialogOpen(false);
      },
    });
  };

  const isLoading = isLoadingStage || isUpdating || isDeleting;

  if (isLoadingStage || !stage) {
    return <Loading className="absolute inset-0" loading={true} />;
  }

  return (
    <>
      <div className="container mx-auto p-4">
        <Card>
          <Form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">Stage Details</h1>
                <div className="flex items-center gap-2">
                  <Button
                    variant={isEditing ? 'default' : 'solid'}
                    onClick={() => {
                      if (isEditing) {
                        reset({
                          name: stage?.name || '',
                          isWonStage: stage?.info?.isWonStage || false,
                          statuses: stage?.info?.statuses || [],
                        });
                      }
                      setIsEditing(!isEditing);
                    }}
                    disabled={isLoading}
                    icon={isEditing ? undefined : <ApolloIcon name="pen" className="text-md" />}
                  // size="xs"
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                  {isEditing && (
                    <Button
                      type="submit"
                      variant="solid"
                      loading={isUpdating}
                      icon={<ApolloIcon name="file" className="text-md" />}
                    >
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isLoading}
                    // size="xs"
                    icon={<ApolloIcon name="trash" className="text-md" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="flex gap-4">
                <FormItem
                  label="Stage Name"
                  invalid={Boolean(errors.name)}
                  errorMessage={errors.name?.message}
                >
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => <Input {...field} disabled={!isEditing || isLoading} />}
                  />
                </FormItem>
              </div>

              <FormItem
                label="Is Won Stage"
                invalid={Boolean(errors.isWonStage)}
                errorMessage={errors.isWonStage?.message}
              >
                <Controller
                  name="isWonStage"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Checkbox
                      {...field}
                      checked={value}
                      onChange={onChange}
                      disabled={!isEditing || isLoading}
                    />
                  )}
                />
              </FormItem>
            </div>

            <div className="p-6">
              <h4 className="mb-4 text-lg font-bold">Statuses</h4>
              <div className="flex flex-col gap-2">
                <Table>
                  <THead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Code</Th>
                      <Th>Allowed</Th>
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
                                disabled={!isEditing || isLoading}
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
                                disabled={!isEditing || isLoading}
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
                                onChange={(checked) => onChange(checked)}
                                disabled={!isEditing || isLoading}
                              />
                            )}
                          />
                        </Td>
                        <Td>
                          {isEditing && (
                            <Button
                              size="xs"
                              icon={<ApolloIcon name="trash" className="text-md" />}
                              onClick={() => remove(index)}
                              disabled={isLoading}
                              type="button"
                            />
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>

                {isEditing && (
                  <Button
                    size="xs"
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
                  >
                    Add a status
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </Card>
      </div>
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
