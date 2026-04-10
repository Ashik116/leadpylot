'use client';

import FormPreloader from '@/components/shared/loaders/FormPreloader';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import { toast } from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import {
  useAllowedSite,
  useCreateAllowedSite,
  useUpdateAllowedSite,
  useDeleteAllowedSite,
} from '@/services/hooks/useAllowedSites';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const allowedSiteSchema = z.object({
  url: z.string().url('Please enter a valid URL').min(1, 'URL is required'),
  name: z.string().optional(),
});

type AllowedSiteFormData = z.infer<typeof allowedSiteSchema>;

interface AllowedSiteFormSidebarProps {
  type: 'create' | 'edit';
  siteId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function AllowedSiteFormSidebar({
  type,
  siteId,
  onClose,
  onSuccess,
}: AllowedSiteFormSidebarProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: site, isLoading: isLoadingSite } = useAllowedSite(siteId || '');
  const { mutate: createSite, isPending: isCreating } = useCreateAllowedSite();
  const { mutate: updateSite, isPending: isUpdating } = useUpdateAllowedSite(siteId || '');
  const { mutate: deleteSite, isPending: isDeleting } = useDeleteAllowedSite();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AllowedSiteFormData>({
    resolver: zodResolver(allowedSiteSchema),
    defaultValues: {
      url: '',
      name: '',
    },
  });

  useEffect(() => {
    if (type === 'edit' && site) {
      reset({
        url: site.url || '',
        name: site.name || '',
      });
    }
  }, [site, type, reset]);

  const onSubmit = (data: AllowedSiteFormData) => {
    if (type === 'create') {
      createSite(data, {
        onSuccess: () => {
          toast.push(<Notification type="success">Allowed site added successfully</Notification>);
          reset();
          if (onSuccess) onSuccess();
        },
        onError: (error: any) => {
          const message = error?.response?.data?.error || 'Failed to add allowed site';
          toast.push(<Notification type="danger">{message}</Notification>);
        },
      });
    } else {
      updateSite(data, {
        onSuccess: () => {
          toast.push(<Notification type="success">Allowed site updated successfully</Notification>);
          if (onSuccess) onSuccess();
        },
        onError: (error: any) => {
          const message = error?.response?.data?.error || 'Failed to update allowed site';
          toast.push(<Notification type="danger">{message}</Notification>);
        },
      });
    }
  };

  const handleDelete = () => {
    if (!siteId) return;
    deleteSite(siteId, {
      onSuccess: () => {
        toast.push(<Notification type="success">Allowed site deleted successfully</Notification>);
        setIsDeleteDialogOpen(false);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      },
      onError: () => {
        toast.push(<Notification type="danger">Failed to delete allowed site</Notification>);
        setIsDeleteDialogOpen(false);
      },
    });
  };

  const isLoading = isLoadingSite || isCreating || isUpdating || isDeleting;

  if (type === 'edit' && (isLoadingSite || !site)) {
    return (
      <div className="flex h-full flex-col">
        <FormPreloader
          showTitle={true}
          titleWidth="200px"
          formFields={['Site URL', 'Site Name']}
          showButtons={true}
          buttonCount={3}
          className="p-2"
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col px-2">
        <Form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="py-2 flex items-center justify-between">
            <h2 className="text-sm capitalize">
              {type === 'create' ? 'Add Allowed Site' : `${site?.name || site?.url || 'Site'} Details`}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="solid"
                size="xs"
                loading={isCreating || isUpdating}
                icon={<ApolloIcon name="file" className="text-md" />}
              >
                {type === 'create' ? 'Add' : 'Update'}
              </Button>
              {type === 'edit' && (
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isLoading}
                  size="xs"
                  icon={<ApolloIcon name="trash" className="text-md" />}
                >
                  Delete
                </Button>
              )}
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

          <div className="flex-1 space-y-2 overflow-y-auto text-sm">
            <FormItem label="Site URL" invalid={Boolean(errors?.url)} errorMessage={errors?.url?.message}>
              <Controller
                name="url"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="https://your-wordpress-site.com" disabled={isLoading} />
                )}
              />
            </FormItem>

            <FormItem label="Site Name (optional)" invalid={Boolean(errors?.name)} errorMessage={errors?.name?.message}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="My WordPress Site" disabled={isLoading} />
                )}
              />
            </FormItem>

            {type === 'edit' && site && (
              <div className="space-y-4 rounded-md bg-gray-50 p-4">
                <h3 className="font-semibold">Site Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-gray-600">Status:</label>
                    <p className="mt-1">
                      {site.active ? (
                        <span className="bg-evergreen rounded-full px-2 py-1 text-xs font-bold text-white">Active</span>
                      ) : (
                        <span className="rounded-full bg-gray-500 px-2 py-1 text-xs font-bold text-white">Inactive</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-600">Created:</label>
                    <p className="mt-1">{site.createdAt ? dateFormateUtils(site.createdAt) : 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Form>
      </div>

      <Dialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold">Delete Allowed Site</h3>
          <p className="mt-2 text-sm text-gray-600">
            Are you sure you want to delete &quot;{site?.url}&quot;? WordPress forms from this URL will no longer be accepted.
          </p>
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="default" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} loading={isDeleting}>Delete</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
