'use client';

import FormPreloader from '@/components/shared/loaders/FormPreloader';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Select from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import { useSource, useUpdateSource, useDeleteSource } from '@/services/hooks/useSources';
import { useUsersByRole } from '@/services/hooks/useUsers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import ApolloIcon from '@/components/ui/ApolloIcon';
import {
  updateSourceFormSchema,
  type SourceFormParsed,
  type UpdateSourceFormInput,
} from './sourceFormSchemas';
import UserColorPicker from '@/app/(protected-pages)/admin/users/_components/UserColorPicker';
import { dateFormateUtils } from '@/utils/dateFormateUtils';

// Define provider type based on the data structure
interface Provider {
  _id: string;
  name?: string;
  email?: string;
  info?: {
    email: string;
    name: string;
  };
}

interface SourceDetailsFormProps {
  sourceId: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function SourceDetailsForm({ sourceId, onClose, onSuccess }: SourceDetailsFormProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: source, isLoading: isLoadingSource } = useSource(sourceId);
  const { mutate: updateSource, isPending: isUpdating } = useUpdateSource(sourceId);
  const { mutate: deleteSource, isPending: isDeleting } = useDeleteSource(sourceId);

  // Define the type for providers data
  interface ProvidersResponse {
    data: Provider[];
    total: number;
    page: number;
    limit: number;
  }

  // Fetch providers for dropdown with proper typing
  const { data: providersData, isLoading: isLoadingProviders } = useUsersByRole('Provider') as {
    data: ProvidersResponse | undefined;
    isLoading: boolean;
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateSourceFormInput>({
    resolver: zodResolver(updateSourceFormSchema),
    values: {
      name: source?.name || '',
      price: source?.price || 0,
      provider_id: source?.provider?._id || '',
      color: source?.color ?? '',
    },
  });

  useEffect(() => {
    if (source) {
      reset({
        name: source?.name,
        price: source?.price,
        provider_id: source?.provider?._id || '',
        color: source?.color ?? '',
      });
    }
  }, [source, reset]);

  // Get provider display name
  const getProviderDisplayName = (provider: Provider | null | undefined) => {
    if (!provider) return 'No options';

    const name = provider?.name || provider?.info?.name || '';
    const email = provider?.email || provider?.info?.email || '';

    if (name && email) {
      return `${name} (${email})`;
    } else if (name) {
      return name;
    } else if (email) {
      return email;
    }

    return '';
  };

  const onSubmit = (data: UpdateSourceFormInput) => {
    const transformedData: SourceFormParsed = updateSourceFormSchema.parse(data);
    updateSource(
      {
        name: transformedData.name,
        price: transformedData.price,
        provider_id: transformedData.provider_id,
        color: transformedData.color ?? null,
      },
      {
        onSuccess: () => {
          toast.push(<Notification type="success">Source updated successfully</Notification>);
          if (onSuccess) onSuccess();
        },
        onError: (error: any) => {
          console.error('Failed to update source:', error);
          toast.push(<Notification type="danger">Failed to update source</Notification>);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteSource(undefined, {
      onSuccess: () => {
        toast.push(<Notification type="success">Source deleted successfully</Notification>);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      },
      onError: () => {
        toast.push(<Notification type="danger">Failed to delete source</Notification>);
        setIsDeleteDialogOpen(false);
      },
    });
  };

  const isLoading = isLoadingSource || isUpdating || isDeleting;

  if (isLoadingSource || !source) {
    return (
      <div className="flex h-full flex-col">
        <FormPreloader
          showTitle={true}
          titleWidth="200px"
          formFields={['Source Name', 'Price (€)', 'Provider', 'Color']}
          showButtons={true}
          buttonCount={4}
          className="p-2"
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col px-2">
        <Form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          {/* Header with action buttons */}
          <div className="mb-2 flex items-center justify-between pt-2">
            <h2 className="capitalize text-sm">{source?.name || 'Source'} Details</h2>
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
              {onClose && (
                <Button
                  variant="secondary"
                  size="xs"
                  icon={<ApolloIcon name="times" className="text-md" />}
                  onClick={onClose}
                  disabled={isLoading}
                />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2 overflow-y-auto text-sm">
            {/* Source Name */}
            <FormItem
              label="Source Name"
              invalid={Boolean(errors?.name)}
              errorMessage={errors?.name?.message}
            >
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input {...field} disabled={isLoading} />}
              />
            </FormItem>

            {/* Source Price */}
            <FormItem
              label="Price (€)"
              invalid={Boolean(errors?.price)}
              errorMessage={errors?.price?.message}
            >
              <Controller
                name="price"
                control={control}
                render={({ field }) => <Input {...field} type="number" disabled={isLoading} />}
              />
            </FormItem>

            {/* Provider */}
            <FormItem
              label="Provider"
              invalid={Boolean(errors?.provider_id)}
              errorMessage={errors?.provider_id?.message}
            >
              <Controller
                name="provider_id"
                control={control}
                render={({ field }) => (
                  <div>
                    <Select
                      isLoading={isLoadingProviders}
                      placeholder="Select a provider"
                      isDisabled={isLoading}
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      }}
                      onChange={(selectedOption: any) => {
                        field.onChange(selectedOption ? selectedOption?.value : undefined);
                      }}
                      value={
                        field?.value
                          ? {
                            value: field?.value,
                            label: getProviderDisplayName(
                              providersData?.data?.find((p: Provider) => p?._id === field?.value)
                            ),
                          }
                          : null
                      }
                      options={
                        providersData?.data?.map((provider: Provider) => ({
                          value: provider?._id,
                          label: getProviderDisplayName(provider),
                        })) || []
                      }
                    />
                  </div>
                )}
              />
            </FormItem>

            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <UserColorPicker
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={isLoading}
                  label="Color"
                  error={errors.color?.message}
                />
              )}
            />

            {/* Source Info */}
            <div className="space-y-4 rounded-md bg-gray-50 p-4">
              <h3 className="text-lg font-semibold">Source Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-600">Status:</label>
                  <p className="mt-1">
                    {source.active ? (
                      <span className="bg-evergreen rounded-full px-2 py-1 text-xs font-bold text-white">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-500 px-2 py-1 text-xs font-bold text-white">
                        Inactive
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">Lead Count:</label>
                  <p className="mt-1">{source?.lead_count || 0}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">Created:</label>
                  <p className="mt-1">
                    {source?.createdAt ? dateFormateUtils(source?.createdAt) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">Last Modified:</label>
                  <p className="mt-1">
                    {source?.updatedAt ? dateFormateUtils(source?.updatedAt) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold">Delete Source</h3>
          <p className="mt-2 text-sm text-gray-600">
            Are you sure you want to delete &quot;{source?.name}&quot;? This action cannot be
            undone.
          </p>
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="default" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={isDeleting}>
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
