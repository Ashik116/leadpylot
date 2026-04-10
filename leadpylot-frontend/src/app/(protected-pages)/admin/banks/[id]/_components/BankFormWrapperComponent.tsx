import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetBank, apiUpdateBank } from '@/services/SettingsService';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import Loading from '@/components/shared/Loading';
import BankDetailsSkeleton from '@/components/shared/loaders/BankDetailsSkeleton';
import BankForm, { ALL_FIELDS } from '../../_components/BankForm';
import { BankFormSubmissionRef } from './hooks/useBankFormSubmission';

const BankFormWrapperComponent = forwardRef<BankFormSubmissionRef, {
  id: string;
  isPage: boolean;
  onSuccess?: (data: any) => void;
}>(({
  id,
  isPage,
  onSuccess,
}, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['bank', id], queryFn: () => apiGetBank(id as string) });

  const formRef = useRef<{ submitForm: () => void } | null>(null);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiUpdateBank(data, id as string),
    onSuccess: (result) => {
      // Force invalidate and refetch the banks query to update dropdown
      queryClient.invalidateQueries({ queryKey: ['banks'] });

      // Invalidate and refetch the current bank query to show updated data
      queryClient.invalidateQueries({ queryKey: ['bank', id] });

      // If onSuccess callback is provided, call it with the result
      if (onSuccess) {
        onSuccess(result);
      }

      toast.push(
        <Notification title="Bank updated" type="success">
          Bank updated successfully
        </Notification>
      );

      // Don't redirect - stay on the current page to show updated data
      // The form will automatically update with new data due to query invalidation
    },
  });

  // Expose form submission functionality to parent components
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      if (formRef.current) {
        formRef.current.submitForm();
      }
    },
    isSubmitting: updateMutation.isPending,
  }));

  if (isLoading) {
    // Use skeleton loading for sidebar, regular loading for full page
    return isPage ? <Loading loading={true} /> : <BankDetailsSkeleton />;
  }


  // Map API response to form fields
  const mappedData = data
    ? {
      name: data.name,
      nickName: data.nickName || '',
      lei_code: data.lei_code || '',
      country: data.country || '',
      country_flag: (data as any).country_flag ?? null,
      bank_country_code: (data as any).bank_country_code ?? '',
      address: data.address || '',
      note: data.note || '',
      min_limit: data.min_limit || 0,
      max_limit: data.max_limit || 0,
      state: data.state || 'active',
      is_default: data.is_default || false,
      is_allow: data.is_allow || false,
      multi_iban: data.multi_iban || false,
      phone: data.phone || '',
      email: data.email || '',
      account: data.account || '',
      account_number: data.account_number || '',
      swift_code: data.swift_code || '',
      iban: data.iban || '',
      code: data.code || '',
      projects: data.projects || [],
      logo: data.logo ?? null,
      isRestricted: data.isRestricted || false,
      allowedAgents: data.allowedAgents || [],
      restrictedAgents: [], // Always start empty - will be calculated by DualAgentSelection
      commission: (data as any).commission_percentage || 0,
    }
    : undefined;

  return (
    <>
      <BankForm
        ref={formRef as React.Ref<any>}
        defaultValues={mappedData}
        onSubmit={(data) => {
          updateMutation.mutate(data);
        }}
        submitLabel="Update Bank"
        isPage={isPage}
        loading={updateMutation.isPending}
        fields={ALL_FIELDS}
        title={`Edit ${data?.name || 'Bank'} Information`}
      />
    </>
  );
});

BankFormWrapperComponent.displayName = 'BankFormWrapperComponent';

export default BankFormWrapperComponent;
