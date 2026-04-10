'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FormItem, FormContainer } from '@/components/ui/Form';
import {
  useCreateInboundRoute,
  useUpdateInboundRoute,
  useInboundRoute,
  useAvailableDestinations,
} from '@/services/hooks/useFreePBXInboundRoutes';
import { useDrawerStore } from '@/stores/drawerStore';

interface InboundRouteFormData {
  didNumber: string;
  description: string;
  destination: string;
  destinationType: string;
  cidNum: string;
}

interface InboundRouteFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

const InboundRouteForm = ({ onSuccess, onClose }: InboundRouteFormProps) => {
  const { selectedId, sidebarType } = useDrawerStore();
  const isEditMode = sidebarType === 'edit' && !!selectedId;

  const { data: inboundRouteData, isLoading: isLoadingRoute } = useInboundRoute(
    selectedId || ''
  );

  const { data: availableDestinationsData, isLoading: isLoadingDestinations } =
    useAvailableDestinations();

  const createMutation = useCreateInboundRoute();
  const updateMutation = useUpdateInboundRoute();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<InboundRouteFormData>({
    defaultValues: {
      didNumber: '',
      description: '',
      destination: '',
      destinationType: 'from-did-direct',
      cidNum: '',
    },
  });

  const selectedDestinationType = watch('destinationType');

  // Filter destinations based on selected type
  const filteredDestinations = useMemo(() => {
    if (!availableDestinationsData?.data) return [];

    switch (selectedDestinationType) {
      case 'from-did-direct':
        return availableDestinationsData.data.extensions;
      case 'ext-group':
        return availableDestinationsData.data.ringGroups;
      case 'ext-queues':
        return availableDestinationsData.data.queues;
      case 'app-blackhole':
        return [{ value: 'hangup', label: 'Hangup (Blackhole)', type: 'extension' as const }];
      default:
        return [];
    }
  }, [selectedDestinationType, availableDestinationsData]);

  // Load data for edit mode
  useEffect(() => {
    if (isEditMode && inboundRouteData?.data) {
      const route = inboundRouteData.data;
      reset({
        didNumber: route.extension || '',
        description: route.description || '',
        destination: route.destinationValue || '',
        destinationType: route.destinationType || 'from-did-direct',
        cidNum: route.cidnum || '',
      });
    }
  }, [isEditMode, inboundRouteData, reset]);

  const onSubmit = async (data: InboundRouteFormData) => {
    try {
      if (isEditMode && selectedId) {
        await updateMutation.mutateAsync({
          didNumber: selectedId,
          data: {
            description: data.description,
            destination: data.destination,
            destinationType: data.destinationType,
            cidNum: data.cidNum,
          },
        });
      } else {
        await createMutation.mutateAsync({
          didNumber: data.didNumber,
          description: data.description,
          destination: data.destination,
          destinationType: data.destinationType,
          cidNum: data.cidNum,
        });
      }
      onSuccess();
    } catch {
      // Error is handled by mutation hooks
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">
          {isEditMode ? 'Edit Inbound Route' : 'Create New Inbound Route'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {isEditMode
            ? 'Update the inbound route configuration'
            : 'Configure a new inbound route for DID management'}
        </p>
      </div>

      <FormContainer>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormItem
            label="DID Number"
            invalid={!!errors.didNumber}
            errorMessage={errors.didNumber?.message}
            className="w-full"
          >
            <Input
              type="text"
              placeholder="e.g., 4921196294885"
              disabled={isEditMode || isSubmitting}
              {...register('didNumber', {
                required: 'DID number is required',
                pattern: {
                  value: /^\+?\d{5,15}$/,
                  message: 'DID must be 5-15 digits',
                },
              })}
            />
          </FormItem>

          <FormItem
            label="Description"
            invalid={!!errors.description}
            errorMessage={errors.description?.message}
            className="w-full"
          >
            <Input
              type="text"
              placeholder="e.g., Main Office Line"
              disabled={isSubmitting}
              {...register('description', {
                maxLength: {
                  value: 255,
                  message: 'Description must be less than 255 characters',
                },
              })}
            />
          </FormItem>

          <FormItem
            label="Destination Type"
            invalid={!!errors.destinationType}
            errorMessage={errors.destinationType?.message}
            className="w-full"
          >
            <select
              className="input w-full rounded border border-gray-300 px-3 py-2 focus:border-ocean-2 focus:outline-none focus:ring-2 focus:ring-ocean-5"
              disabled={isSubmitting}
              {...register('destinationType', {
                required: 'Destination type is required',
              })}
            >
              <option value="from-did-direct">Extension (Direct)</option>
              <option value="ext-group">Ring Group</option>
              <option value="ext-queues">Queue</option>
              <option value="app-blackhole">Hangup (Blackhole)</option>
            </select>
          </FormItem>

          <FormItem
            label="Destination"
            invalid={!!errors.destination}
            errorMessage={errors.destination?.message}
            className="w-full"
          >
            {isLoadingDestinations ? (
              <div className="input w-full rounded border border-gray-300 px-3 py-2 text-gray-500">
                Loading destinations...
              </div>
            ) : (
              <select
                className="input w-full rounded border border-gray-300 px-3 py-2 focus:border-ocean-2 focus:outline-none focus:ring-2 focus:ring-ocean-5"
                disabled={isSubmitting || filteredDestinations.length === 0}
                {...register('destination', {
                  required: 'Destination is required',
                })}
              >
                <option value="">
                  {filteredDestinations.length === 0
                    ? 'No destinations available'
                    : 'Select a destination'}
                </option>
                {filteredDestinations.map((dest) => (
                  <option key={dest.value} value={dest.value}>
                    {dest.label}
                  </option>
                ))}
              </select>
            )}
            {selectedDestinationType !== 'app-blackhole' && (
              <p className="text-xs text-gray-500 mt-1">
                Select from existing {selectedDestinationType === 'from-did-direct' ? 'extensions' : selectedDestinationType === 'ext-group' ? 'ring groups' : 'queues'}
              </p>
            )}
          </FormItem>

          <FormItem
            label="Caller ID Filter (Optional)"
            invalid={!!errors.cidNum}
            errorMessage={errors.cidNum?.message}
            className="w-full"
          >
            <Input
              type="text"
              placeholder="Leave empty for any caller"
              disabled={isSubmitting}
              {...register('cidNum')}
            />
          </FormItem>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              loading={isSubmitting}
              disabled={isLoadingRoute}
            >
              {isEditMode ? 'Update Route' : 'Create Route'}
            </Button>
          </div>
        </form>
      </FormContainer>
    </div>
  );
};

export default InboundRouteForm;

