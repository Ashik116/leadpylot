'use client';

import Button from '@/components/ui/Button';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useUsersByRole } from '@/services/hooks/useUsers';
import { useCreateSource } from '@/services/hooks/useSources';
import { FormItem } from '@/components/ui/Form';
import { useState } from 'react';
import {
  createSourceFormSchema,
  type CreateSourceFormInput,
} from './sourceFormSchemas';
import UserColorPicker from '@/app/(protected-pages)/admin/users/_components/UserColorPicker';

interface SourceFormWrapperProps {
  onSuccess?: () => void;
  onClose?: () => void;
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

export function SourceFormWrapper({ onSuccess, onClose }: SourceFormWrapperProps) {
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
      // Schema transforms price to number during validation
      const transformedData = createSourceFormSchema.parse(data);
      await createSourceMutation.mutateAsync({
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
      if (onSuccess) onSuccess();
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

  return (
    <div className="flex h-full flex-col">
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto">
          <FormItem
            label="Name"
            invalid={Boolean(errors?.name)}
            errorMessage={errors?.name?.message}
          >
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="Enter source name" disabled={isSubmitting} />
              )}
            />
          </FormItem>

          <FormItem
            label="Price"
            invalid={Boolean(errors.price)}
            errorMessage={errors.price?.message}
          >
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <Input {...field} type="number" placeholder="Enter price" disabled={isSubmitting} />
              )}
            />
          </FormItem>

          <FormItem
            label="Provider"
            invalid={Boolean(errors?.provider_id)}
            errorMessage={errors?.provider_id?.message}
          >
            <Controller
              name="provider_id"
              control={control}
              render={({ field }) => (
                <Select
                  isLoading={isLoadingProviders}
                  placeholder="Select a provider"
                  menuPlacement="top"
                  isDisabled={isSubmitting}
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  onChange={(selectedOption: any) => {
                    field.onChange(selectedOption ? selectedOption?.value : undefined);
                  }}
                  value={
                    field.value
                      ? {
                        value: field.value,
                        label:
                          providersData?.data?.find((p: Provider) => p._id === field?.value)?.info
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
          </FormItem>

          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <UserColorPicker
                value={field.value ?? ''}
                onChange={field.onChange}
                disabled={isSubmitting}
                label="Color"
                error={errors.color?.message}
              />
            )}
          />
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Close
          </Button>
          <Button variant="solid" type="submit" loading={isSubmitting} disabled={isSubmitting}>
            Create Source
          </Button>
        </div>
      </form>
    </div>
  );
}
