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
import { useCreateSource } from '@/services/hooks/useSources';

import { useState } from 'react';
import {
  createSourceFormSchema,
  type CreateSourceFormInput,
} from './sourceFormSchemas';
import { SourceColorFormItem } from './SourceColorFormItem';

interface CreateSourcesDialogProps {
  isOpen: boolean;
  onClose: (newSourceId?: string) => void;
}

// Define provider type based on the data structure
interface Provider {
  _id: string;
  info: {
    email: string;
    name: string;
  };
  active: boolean;
  login: string;
  role: string;
  notification_type: string;
  create_date: string;
  write_date: string;
  lastModified: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Define the response type from the API
interface ProvidersResponse {
  data: Provider[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export function CreateSourcesDialog({ isOpen, onClose }: CreateSourcesDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: providersData, isLoading: isLoadingProviders } = useUsersByRole('Provider') as {
    data: ProvidersResponse | undefined;
    isLoading: boolean;
  };
  const createSourceMutation = useCreateSource();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSourceFormInput>({
    resolver: zodResolver(createSourceFormSchema),
    defaultValues: {
      name: '',
      price: 0,
      provider_id: undefined,
      color: '',
    },
  });

  const onSubmit = async (data: CreateSourceFormInput) => {
    setIsSubmitting(true);
    try {
      const transformedData = createSourceFormSchema.parse(data);
      const result = await createSourceMutation.mutateAsync({
        name: transformedData.name,
        price: transformedData.price,
        provider_id: transformedData.provider_id,
        ...(transformedData.color ? { color: transformedData.color } : {}),
      });

      toast.push(
        <Notification title="Source created" type="success">
          Source created successfully
        </Notification>
      );
      reset();
      // Pass the newly created source ID back to the parent component
      onClose(result._id);
    } catch (error) {
      console.error('Error creating source:', error);
      toast.push(
        <Notification title="Failed to create source" type="danger">
          Failed to create source
        </Notification>
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} contentClassName="sm:max-w-[425px]">
      <h2 className="mb-4 text-lg font-semibold">Create New Source</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                invalid={!!errors?.name}
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
                invalid={!!errors?.price}
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
                invalid={!!errors?.provider_id}
                onChange={(selectedOption: any) => {
                  // Extract just the value from the selected option object
                  field.onChange(selectedOption ? selectedOption.value : undefined);
                }}
                value={
                  field.value
                    ? {
                        value: field?.value,
                        label:
                          providersData?.data?.find((p: Provider) => p?._id === field?.value)?.info
                            ?.name || field?.value,
                      }
                    : null
                }
                options={
                  providersData?.data?.map((provider: Provider) => ({
                    value: provider?._id,
                    label: `${provider?.info?.name} (${provider?.info?.email})`,
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
            Create
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
