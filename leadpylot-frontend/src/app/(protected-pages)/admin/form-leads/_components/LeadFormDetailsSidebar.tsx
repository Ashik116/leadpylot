'use client';

import FormPreloader from '@/components/shared/loaders/FormPreloader';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import { toast } from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useLeadForm, useUpdateLeadForm, useDeleteLeadForm } from '@/services/hooks/useLeadForms';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const leadFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  site_link: z.string().optional(),
  source: z.string().optional(),
  expected_revenue: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(z.number().min(0)),
});

type LeadFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  site_link?: string;
  source?: string;
  expected_revenue: string | number;
};

interface LeadFormDetailsSidebarProps {
  leadId: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function LeadFormDetailsSidebar({ leadId, onClose, onSuccess }: LeadFormDetailsSidebarProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: lead, isLoading: isLoadingLead } = useLeadForm(leadId);
  const { mutate: updateLead, isPending: isUpdating } = useUpdateLeadForm(leadId);
  const { mutate: deleteLead, isPending: isDeleting } = useDeleteLeadForm();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    values: {
      first_name: lead?.first_name || '',
      last_name: lead?.last_name || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      site_link: lead?.site_link || '',
      source: lead?.source || '',
      expected_revenue: lead?.expected_revenue || 0,
    },
  });

  useEffect(() => {
    if (lead) {
      reset({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone || '',
        site_link: lead.site_link || '',
        source: lead.source || '',
        expected_revenue: lead.expected_revenue || 0,
      });
    }
  }, [lead, reset]);

  const onSubmit = (data: LeadFormData) => {
    const transformedData = leadFormSchema.parse(data);
    updateLead(transformedData, {
      onSuccess: () => {
        toast.push(<Notification type="success">Lead updated successfully</Notification>);
        if (onSuccess) onSuccess();
      },
      onError: () => {
        toast.push(<Notification type="danger">Failed to update lead</Notification>);
      },
    });
  };

  const handleDelete = () => {
    deleteLead(leadId, {
      onSuccess: () => {
        toast.push(<Notification type="success">Lead deleted successfully</Notification>);
        setIsDeleteDialogOpen(false);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      },
      onError: () => {
        toast.push(<Notification type="danger">Failed to delete lead</Notification>);
        setIsDeleteDialogOpen(false);
      },
    });
  };

  const isLoading = isLoadingLead || isUpdating || isDeleting;

  if (isLoadingLead || !lead) {
    return (
      <div className="flex h-full flex-col">
        <FormPreloader
          showTitle={true}
          titleWidth="200px"
          formFields={['First Name', 'Last Name', 'Email', 'Phone', 'Expected Revenue']}
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
            <h2 className="text-sm capitalize">{lead?.contact_name || 'Lead'} Details</h2>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="solid"
                size="xs"
                loading={isUpdating}
                icon={<ApolloIcon name="file" className="text-md" />}
              >
                Update
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

          <div className="flex-1 space-y-2 overflow-y-auto text-sm">
            <FormItem label="First Name" invalid={Boolean(errors?.first_name)} errorMessage={errors?.first_name?.message}>
              <Controller name="first_name" control={control} render={({ field }) => <Input {...field} disabled={isLoading} />} />
            </FormItem>

            <FormItem label="Last Name" invalid={Boolean(errors?.last_name)} errorMessage={errors?.last_name?.message}>
              <Controller name="last_name" control={control} render={({ field }) => <Input {...field} disabled={isLoading} />} />
            </FormItem>

            <FormItem label="Email" invalid={Boolean(errors?.email)} errorMessage={errors?.email?.message}>
              <Controller name="email" control={control} render={({ field }) => <Input {...field} type="email" disabled={isLoading} />} />
            </FormItem>

            <FormItem label="Phone" invalid={Boolean(errors?.phone)} errorMessage={errors?.phone?.message}>
              <Controller name="phone" control={control} render={({ field }) => <Input {...field} disabled={isLoading} />} />
            </FormItem>

            <FormItem label="Source" invalid={Boolean(errors?.source)} errorMessage={errors?.source?.message}>
              <Controller name="source" control={control} render={({ field }) => <Input {...field} disabled={isLoading} />} />
            </FormItem>

            <FormItem label="Expected Revenue" invalid={Boolean(errors?.expected_revenue)} errorMessage={errors?.expected_revenue?.message}>
              <Controller name="expected_revenue" control={control} render={({ field }) => <Input {...field} type="number" disabled={isLoading} />} />
            </FormItem>

            <div className="space-y-4 rounded-md bg-gray-50 p-4">
              <h3 className="font-semibold">Lead Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-600">Lead ID:</label>
                  <p className="mt-1 font-mono">{lead?.lead_source_no || '-'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">Contact Name:</label>
                  <p className="mt-1">{lead?.contact_name || '-'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">Site Link:</label>
                  <p className="mt-1 truncate">{lead?.site_link || '-'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">Created:</label>
                  <p className="mt-1">{lead?.createdAt ? dateFormateUtils(lead.createdAt) : 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">Last Modified:</label>
                  <p className="mt-1">{lead?.updatedAt ? dateFormateUtils(lead.updatedAt) : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>

      <Dialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold">Delete Lead</h3>
          <p className="mt-2 text-sm text-gray-600">
            Are you sure you want to delete &quot;{lead?.contact_name}&quot;? This action cannot be undone.
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
