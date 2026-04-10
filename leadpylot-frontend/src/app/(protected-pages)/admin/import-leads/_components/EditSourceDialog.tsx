'use client';

import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useUsersByRole } from '@/services/hooks/useUsers';
import { useSource, useUpdateSource } from '@/services/hooks/useSources';
import { useState, useEffect } from 'react';
import Loading from '@/components/shared/Loading';
import {
  updateSourceFormSchema,
  type SourceFormParsed,
  type UpdateSourceFormInput,
} from '../../sources/_components/sourceFormSchemas';
import { SourceColorFormItem } from '../../sources/_components/SourceColorFormItem';

interface EditSourceDialogProps {
  isOpen: boolean;
  onClose: (updatedSourceId?: string) => void;
  sourceId: string;
}

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

export function EditSourceDialog({ isOpen, onClose, sourceId }: EditSourceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch source data
  const { data: source, isLoading: isLoadingSource } = useSource(sourceId);
  const updateSourceMutation = useUpdateSource(sourceId);

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
    defaultValues: {
      name: '',
      price: 0,
      provider_id: '',
      color: '',
    },
  });

  // Update form values when source data is loaded
  useEffect(() => {
    if (source) {
      reset({
        name: source.name,
        price: source.price,
        provider_id: source.provider?._id || '',
        color: source.color ?? '',
      });
    }
  }, [source, reset]);

  // Get provider display name
  const getProviderDisplayName = (provider: Provider | null | undefined) => {
    if (!provider) return 'No options';

    const name = provider.name || provider.info?.name || '';
    const email = provider.email || provider.info?.email || '';

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
  const onSubmit = handleSubmit((data: UpdateSourceFormInput) => {
    const transformedData: SourceFormParsed = updateSourceFormSchema.parse(data);
    setIsSubmitting(true);
    updateSourceMutation.mutate(
      {
        name: transformedData.name,
        price: transformedData.price,
        provider_id: transformedData.provider_id,
        color: transformedData.color ?? null,
      },
      {
        onSuccess: () => {
          toast.push(
            <Notification title="Source updated" type="success">
              Source updated successfully
            </Notification>
          );
          reset();
          onClose(sourceId);
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
        onSettled: () => {
          setIsSubmitting(false);
        },
      }
    );
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} contentClassName="sm:max-w-[425px]">
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Edit Source</h2>
        </div>

        {isLoadingSource ? (
          <Loading className="absolute inset-0" loading={true} />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    id="name"
                    placeholder="Enter source name"
                    invalid={!!errors.name}
                    {...field}
                  />
                )}
              />
              {errors.name && <div className="text-sm text-red-500">{errors.name.message}</div>}
            </div>

            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium">
                Price
              </label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <Input
                    id="price"
                    type="number"
                    placeholder="Enter price"
                    invalid={!!errors.price}
                    prefix="$"
                    {...field}
                  />
                )}
              />
              {errors.price && <div className="text-sm text-red-500">{errors.price.message}</div>}
            </div>

            <div className="space-y-2">
              <label htmlFor="provider_id" className="text-sm font-medium">
                Provider
              </label>
              <Controller
                name="provider_id"
                control={control}
                render={({ field }) => (
                  <Select
                    id="provider_id"
                    isLoading={isLoadingProviders}
                    placeholder="Select a provider"
                    invalid={!!errors.provider_id}
                    onChange={(selectedOption: any) => {
                      // Extract just the value from the selected option object
                      field.onChange(selectedOption ? selectedOption.value : undefined);
                    }}
                    value={
                      field.value
                        ? {
                            value: field.value,
                            label:
                              providersData?.data?.find((p: Provider) => p._id === field.value)
                                ?.info?.name || field.value,
                          }
                        : null
                    }
                    options={
                      providersData?.data?.map((provider: Provider) => ({
                        value: provider._id,
                        label: getProviderDisplayName(provider),
                      })) || []
                    }
                  />
                )}
              />
              {errors.provider_id && (
                <div className="text-sm text-red-500">{errors.provider_id.message}</div>
              )}
            </div>

            <SourceColorFormItem
              control={control}
              name="color"
              disabled={isSubmitting}
              invalid={Boolean(errors.color)}
              errorMessage={errors.color?.message}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="solid" type="submit" loading={isSubmitting} disabled={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
