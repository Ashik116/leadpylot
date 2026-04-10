'use client';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { useVoipServerMutations, useVoipServer } from '@/services/hooks/useSettings';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import useNotification from '@/utils/hooks/useNotification';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { FormPreloader } from '@/components/shared/loaders';

const ServerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().min(1, 'Domain is required'),
  websocket_address: z.string().min(1, ' Websocket address is required'),
});

type ServerForm = z.infer<typeof ServerSchema>;

const VoipFromWrapperComponent = ({
  type,
  id,
  isPage = true,
  onSuccess,
  onClose,
}: {
  type: 'create' | 'edit' | 'changePassword';
  id?: string;
  isPage?: boolean;
  onSuccess?: (data: any) => void;
  onClose?: () => void;
}) => {
  const [submitting, setSubmitting] = useState(false);
  const { openNotification } = useNotification();

  // Always call useVoipServer hook regardless of type
  // It will only be used if we're in edit mode
  const { data: serverData, isLoading, error } = useVoipServer(id ? id.toString() : '');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServerForm>({
    resolver: zodResolver(ServerSchema),
    values: {
      name: serverData?.name || '',
      domain: serverData?.info?.domain || '',
      websocket_address: serverData?.info?.websocket_address || '',
    },
  });

  const { createServerMutation, updateServerMutation } = useVoipServerMutations(
    type === 'edit' && id ? (id as string) : undefined
  );

  // Show error notification if data fetch fails
  useEffect(() => {
    if (error && type === 'edit') {
      //console.error('Error loading VOIP server data:', error);
      openNotification({
        type: 'danger',
        massage: 'Failed to load VOIP server data. Please try again.',
      });
    }
  }, [error, openNotification, type]);

  const onSubmit = async (data: ServerForm) => {
    if (submitting) return;

    setSubmitting(true);
    const payload = {
      name: data.name,
      domain: data.domain,
      websocket_address: data.websocket_address,
    };

    try {
      if (type === 'create') {
        const result = await createServerMutation.mutateAsync(payload);
        openNotification({ type: 'success', massage: 'VOIP server created successfully' });

        // If onSuccess callback is provided, call it with the result
        if (onSuccess) {
          onSuccess(result);
        }

        if (!onSuccess && isPage) {
          onClose?.();
        }
      } else if (type === 'edit' && id) {
        const result = await updateServerMutation.mutateAsync(payload);
        openNotification({ type: 'success', massage: 'VOIP server updated successfully' });

        // If onSuccess callback is provided, call it with the result
        if (onSuccess) {
          onSuccess(result);
        }

        if (!onSuccess && isPage) {
          onClose?.();
        }
      }
    } catch (error) {
      console.error('Error saving VOIP server:', error);
      openNotification({
        type: 'danger',
        massage:
          type === 'create' ? 'Failed to create VOIP server' : 'Failed to update VOIP server',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Display loading state
  if (isLoading && type === 'edit') {
    return (
      <FormPreloader
        showTitle={isPage}
        formFields={['Name', 'Domain', 'Websocket Address']}
        showButtons={true}
        buttonCount={isPage ? 2 : 1}
        className="p-2"
      />
    );
  }
  return (
    <>
      <Card className="border-none">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 text-sm">
          <div className="space-y-2">
            {isPage && (
              <div className="flex items-center justify-between">
                <h1 className="text-lg capitalize">
                  {type === 'create'
                    ? 'Create VOIP Server'
                    : `${serverData?.name || 'VOIP'} Server`}
                </h1>
                <Button
                  variant="secondary"
                  onClick={onClose}
                  size="sm"
                  icon={<ApolloIcon name="times" className="text-md" />}
                ></Button>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input
                {...register('name')}
                placeholder="VOIP Server Name"
                invalid={!!errors?.name}
                disabled={submitting}
              />
              {errors.name && <span className="text-rust text-sm">{errors.name.message}</span>}{' '}
              {/* Old: "text-sm text-red-500" */}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Domain</label>
              <Input
                {...register('domain')}
                placeholder="sip.example.com"
                invalid={!!errors.domain}
                disabled={submitting}
              />
              {errors.domain && (
                <span className="text-rust text-sm">{errors.domain.message}</span> // Old: "text-sm text-red-500"
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Websocket address</label>
                <Input
                  {...register('websocket_address')}
                  placeholder="wss://sip.example.com"
                  invalid={!!errors.websocket_address}
                  disabled={submitting}
                />
                {errors.websocket_address && (
                  <span className="text-rust text-sm">{errors.websocket_address.message}</span> // Old: "text-sm text-red-500"
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {isPage && (
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                close
              </Button>
            )}

            <Button
              type="submit"
              variant="solid"
              icon={<ApolloIcon name="file" className="text-md" />}
              loading={
                submitting || createServerMutation?.isPending || updateServerMutation?.isPending
              }
            >
              {type === 'create' ? 'Save' : 'Update'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
};

export default VoipFromWrapperComponent;
