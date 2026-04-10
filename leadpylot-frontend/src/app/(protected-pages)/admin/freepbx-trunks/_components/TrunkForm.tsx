'use client';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { useCreateTrunk, useUpdateTrunk, useTrunk } from '@/services/hooks/useFreePBXTrunks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useDrawerStore } from '@/stores/drawerStore';

const TrunkSchema = z.object({
  name: z
    .string()
    .min(2, 'Trunk name must be at least 2 characters')
    .max(50, 'Trunk name must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Trunk name can only contain letters, numbers, hyphens, and underscores'
    ),
  sipServer: z
    .string()
    .min(3, 'SIP server address must be at least 3 characters')
    .max(255, 'SIP server address must not exceed 255 characters'),
  outboundCID: z
    .string()
    .min(3, 'Outbound caller ID must be at least 3 characters')
    .max(20, 'Outbound caller ID must not exceed 20 characters'),
});

type TrunkForm = z.infer<typeof TrunkSchema>;

interface TrunkFormProps {
  onSuccess?: (data: any) => void;
  onClose?: () => void;
  isPage?: boolean;
}

const TrunkFormComponent = ({ onSuccess, onClose, isPage = true }: TrunkFormProps) => {
  const [submitting, setSubmitting] = useState(false);
  const { sidebarType, selectedId } = useDrawerStore();
  const isEditMode = sidebarType === 'edit' && selectedId;
  const trunkId = selectedId ? parseInt(selectedId) : 0;

  const createTrunkMutation = useCreateTrunk();
  const updateTrunkMutation = useUpdateTrunk();
  const { data: trunkData, isLoading: isTrunkLoading } = useTrunk(trunkId, {
    enabled: !!isEditMode,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TrunkForm>({
    resolver: zodResolver(TrunkSchema),
    defaultValues: {
      name: '',
      sipServer: '',
      outboundCID: '',
    },
  });

  // Load trunk data when editing
  useEffect(() => {
    if (isEditMode && trunkData?.data) {
      const trunk = trunkData?.data?.trunk;
      const sipServerSetting = trunkData?.data?.pjsipSettings?.find(
        (s) => s.keyword === 'sip_server'
      );

      reset({
        name: trunk?.name || '',
        sipServer: sipServerSetting?.data || '',
        outboundCID: trunk?.outcid || '',
      });
    }
  }, [trunkData, isEditMode, reset]);

  const onSubmit = async (data: TrunkForm) => {
    if (submitting) return;

    setSubmitting(true);

    try {
      let result;

      if (isEditMode) {
        result = await updateTrunkMutation.mutateAsync({
          id: trunkId,
          data,
        });
      } else {
        result = await createTrunkMutation.mutateAsync(data);
        // Reset form only after successful creation
        reset();
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      // Close sidebar after success
      if (isPage) {
        onClose?.();
      }
    } catch {
      // Error is handled by the mutation
    } finally {
      setSubmitting(false);
    }
  };

  if (isTrunkLoading && isEditMode) {
    return (
      <Card>
        <div className="flex items-center justify-center p-8">
          <ApolloIcon name="loading" className="text-ocean-2 animate-spin text-2xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card className='border-none mx-0 p-0 inset-0'>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          {isPage && (
            <div className="flex items-center justify-between">
              <p className="capitalize text-base font-medium">{isEditMode ? 'Edit' : 'Create'} FreePBX Trunk</p>
              <Button
                variant="secondary"
                onClick={onClose}
                size="sm"
                icon={<ApolloIcon name="times" className="text-md" />}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Trunk Name <span className="text-rust">*</span>
            </label>
            <Input
              {...register('name')}
              placeholder="e.g., MyProvider"
              invalid={!!errors.name}
              disabled={submitting}
            />
            {errors.name && <span className="text-rust text-sm">{errors.name.message}</span>}
            <span className="mt-1 block text-xs text-gray-500">
              Alphanumeric, hyphens, and underscores only
            </span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              SIP Server Address <span className="text-rust">*</span>
            </label>
            <Input
              {...register('sipServer')}
              placeholder="e.g., sip.provider.com or 192.168.1.100"
              invalid={!!errors.sipServer}
              disabled={submitting}
            />
            {errors.sipServer && (
              <span className="text-rust text-sm">{errors.sipServer.message}</span>
            )}
            <span className="mt-1 block text-xs text-gray-500">
              Hostname or IP address of your SIP provider
            </span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Outbound Caller ID <span className="text-rust">*</span>
            </label>
            <Input
              {...register('outboundCID')}
              placeholder="e.g., 1234567890"
              invalid={!!errors.outboundCID}
              disabled={submitting}
            />
            {errors.outboundCID && (
              <span className="text-rust text-sm">{errors.outboundCID.message}</span>
            )}
            <span className="mt-1 block text-xs text-gray-500">
              Phone number to display for outbound calls
            </span>
          </div>

          <div className="bg-ocean-9 border-ocean-3 rounded-md border p-3">
            <p className="text-ocean-1 mb-2 text-sm font-medium">
              <ApolloIcon name="info-circle" className="mr-2" />
              Configuration Details
            </p>
            <ul className="text-ocean-2 ml-6 list-disc space-y-1 text-xs">
              <li>Trunk will be created with 33 standard PJSIP settings</li>
              <li>Codecs: alaw, ulaw (G.711)</li>
              <li>DTMF: RFC4733</li>
              <li>RTP: Symmetric, Force rport enabled</li>
              <li>FreePBX will be automatically reloaded (~15-20 seconds)</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          {isPage && (
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            variant="solid"
            icon={<ApolloIcon name={isEditMode ? 'check' : 'plus'} className="text-md" />}
            loading={submitting || createTrunkMutation?.isPending || updateTrunkMutation?.isPending}
          >
            {isEditMode ? 'Update' : 'Create'} Trunk
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default TrunkFormComponent;
