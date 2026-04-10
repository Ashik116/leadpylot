'use client';

import Loading from '@/components/shared/Loading';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Select from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import { useSource, useUpdateSource, useDeleteSource } from '@/services/hooks/useSources';
import { useUsersByRole } from '@/services/hooks/useUsers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

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

// Define source form data type
interface SourceFormData {
  name: string;
  price: number;
  provider_id?: string;
}

// Source schema for validation
const sourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  provider_id: z.string().optional(),
});

export default function SourceDetails({ params }: { params: Promise<{ id: string }> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const router = useRouter();
  const { id } = params as any;

  // Fetch source data
  const { data: source, isLoading: isLoadingSource } = useSource(id);
  const { mutate: updateSource, isPending: isUpdating } = useUpdateSource(id);
  const { mutate: deleteSource, isPending: isDeleting } = useDeleteSource(id);

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
  } = useForm<SourceFormData>({
    resolver: zodResolver(sourceSchema) as any,
    defaultValues: {
      name: '',
      price: 0,
      provider_id: '',
    },
  });

  // Update form values when source data is loaded
  useEffect(() => {
    if (source) {
      reset({
        name: source?.name,
        price: source?.price,
        provider_id: source?.provider?._id,
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

  // Handle form submission for updating a source
  const onSubmit = handleSubmit((data: SourceFormData) => {
    updateSource(data, {
      onSuccess: () => {
        setIsEditing(false);
        toast.push(
          <Notification title="Source updated" type="success">
            Source updated successfully
          </Notification>
        );
      },
      onError: (error: any) => {
        const errorMessage =
          error?.response?.data?.message || 'Failed to update source. Please try again.';
        toast.push(
          <Notification title="Update failed" type="danger">
            {errorMessage}
          </Notification>
        );
      },
    });
  });

  // Handle source deletion
  const handleDelete = () => {
    deleteSource(undefined, {
      onSuccess: () => {
        toast.push(
          <Notification title="Source deleted" type="success">
            Source deleted successfully
          </Notification>
        );
        router.push('/admin/sources');
      },
      onError: (error: any) => {
        const errorMessage =
          error?.response?.data?.message || 'Failed to delete source. Please try again.';
        toast.push(
          <Notification title="Delete failed" type="danger">
            {errorMessage}
          </Notification>
        );
        setIsDeleteDialogOpen(false);
      },
    });
  };

  // Go back to sources list
  const goToSourcesList = () => {
    router.push('/admin/sources');
  };

  if (isLoadingSource || !source) {
    return <Loading className="absolute inset-0" loading={true} />;
  }

  return (
    <>
      {/* Header section with title and action buttons */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h4 className="text-lg font-semibold">Source Details</h4>
          {/* Back button */}
          <div className="flex gap-2">
            <Button
              onClick={goToSourcesList}
              icon={<ApolloIcon name="arrow-left" className="text-md" />}
            >
              <span>Back to Sources</span>
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <Button
              type="button"
              variant="solid"
              size="sm"
              icon={<ApolloIcon name="file" className="text-md" />}
              onClick={onSubmit}
              loading={isUpdating}
            >
              Save
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              icon={<ApolloIcon name="pen" className="text-md" />}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            icon={<ApolloIcon name="trash" className="text-md" />}
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Main content with form */}
      <Card className="p-6">
        <Form onSubmit={onSubmit} containerClassName="grid grid-cols-1 gap-x-8 xl:grid-cols-3">
          {/* Name */}
          <FormItem
            label="Name"
            invalid={Boolean(errors?.name)}
            errorMessage={errors?.name?.message}
          >
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input {...field} disabled={!isEditing} invalid={Boolean(errors?.name)} />
              )}
            />
          </FormItem>

          {/* Price */}
          <FormItem
            label="Price"
            invalid={Boolean(errors?.price)}
            errorMessage={errors?.price?.message}
          >
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  disabled={!isEditing}
                  invalid={Boolean(errors?.price)}
                  prefix="€"
                />
              )}
            />
          </FormItem>

          {/* Provider */}
          <FormItem
            label="Provider"
            invalid={Boolean(errors?.provider_id)}
            errorMessage={errors?.provider_id?.message}
          >
            {!isEditing ? (
              <div className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-400">
                {getProviderDisplayName(source?.provider)}
              </div>
            ) : (
              <Controller
                name="provider_id"
                control={control}
                render={({ field }) => (
                  <Select
                    id="provider_id"
                    isLoading={isLoadingProviders}
                    placeholder="Select a provider"
                    invalid={!!errors?.provider_id}
                    onChange={(selectedOption: any) => {
                      // Extract just the value from the selected option object
                      field.onChange(selectedOption ? selectedOption?.value : undefined);
                    }}
                    value={
                      field?.value
                        ? {
                            value: field?.value,
                            label:
                              providersData?.data?.find((p: Provider) => p?._id === field?.value)
                                ?.info?.name || field?.value,
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
                )}
              />
            )}
          </FormItem>

          {/* Additional Info Section */}
          <div className="col-span-1 xl:col-span-3">
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h5 className="mb-4 text-base font-medium">Additional Information</h5>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Lead Count</div>
                  <div className="mt-1 text-lg">{source?.lead_count || 0}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Created At</div>
                  <div className="mt-1 text-sm text-gray-500">
                    {new Date(source?.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Updated At</div>
                  <div className="mt-1 text-sm text-gray-500">
                    {new Date(source?.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        contentClassName="max-w-md"
      >
        <div className="p-6">
          <h4 className="mb-4 text-lg font-semibold">Confirm Delete</h4>
          <p className="mb-6 text-gray-600">
            Are you sure you want to delete this source? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              icon={<ApolloIcon name="trash" className="text-md" />}
              onClick={handleDelete}
              loading={isDeleting}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
