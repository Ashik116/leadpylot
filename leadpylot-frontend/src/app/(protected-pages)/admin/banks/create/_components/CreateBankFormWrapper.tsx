// app/admin/mailservers/create/page.tsx
'use client';
import { useBankMutations } from '@/services/hooks/useSettings';
import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import BankForm, {
  BankField,
  BankFormRef,
  CONTACT_FIELDS,
  REQUIRED_FIELDS,
} from '../../_components/BankForm';
import Button from '@/components/ui/Button';

const CreateBankFormWrapper = forwardRef<
  BankFormRef,
  {
    isPage?: boolean;
    onSuccess?: (data: any) => void;
    type?: 'create' | 'edit';
  }
>(({ isPage = true, onSuccess, type = 'edit' }, ref) => {
  const { createBankMutation } = useBankMutations(undefined, isPage);
  const formRef = useRef<BankFormRef | null>(null);

  // Example of switching between different field sets
  const [fieldSet, setFieldSet] = useState<'basic' | 'detailed'>('basic');

  // Define multiple field configurations that you can switch between
  const basicFields: BankField[] = [
    ...REQUIRED_FIELDS,
    'nickName',
    'country_flag',
    'bank_country_code',
    'state',
    'is_allow',
  ];

  const detailedFields: BankField[] = [
    ...REQUIRED_FIELDS, // Essential fields
    'nickName', // Bank nickname
    'country_flag', // Country flag upload
    'bank_country_code', // Country code
    'state', // Status
    'is_allow', // Allow toggle
    'is_default', // Default toggle
    ...CONTACT_FIELDS, // Email and phone
    'account', // Account name
    'account_number', // Account number
    'swift_code', // SWIFT code
    'min_limit', // Min limit
    'max_limit', // Max limit
    'commission', // Commission field
    'note', // Notes field
    'projects', // Projects selector
    'isRestricted', // Agent access control toggle
    'allowedAgents', // Allowed agents selector
    'restrictedAgents', // Restricted agents selector
  ];

  // Choose which field set to use based on state
  const activeFields = fieldSet === 'basic' ? basicFields : detailedFields;

  const handleCreateBank = (data: Record<string, unknown>) => {
    createBankMutation.mutate(data, {
      onSuccess: (result) => {
        if (onSuccess) {
          onSuccess(result);
        }
      },
      onError: () => {
        // Error notification is handled by useBankMutations hook
      },
    });
  };

  // Expose form submission functionality to parent components
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      if (formRef.current) {
        formRef.current.submitForm();
      }
    },
    isSubmitting: createBankMutation.isPending,
  }));

  return (
    <>
      {type === 'create' && (
        <div className="mb-6 flex justify-between">
          <h1 className=" text-base">Create New Bank Account</h1>
          <Button
            variant="solid"
            onClick={() => formRef.current?.submitForm()}
            disabled={createBankMutation.isPending}
            loading={createBankMutation.isPending}
          >
            {createBankMutation.isPending ? 'Creating...' : 'Create Bank'}
          </Button>
        </div>
      )}
      {/* Toggle for switching between field sets */}
      <div className="mb-6 flex items-center space-x-4">
        <span className="text-sm font-medium">Form Type:</span>
        <div className="flex space-x-4">
          <Button
            variant="plain"
            onClick={() => setFieldSet('basic')}
            className={` ${fieldSet === 'basic' ? 'bg-ocean-2 text-white' : 'text-gray-800'}`}
          >
            Basic
          </Button>
          <Button
            variant="plain"
            onClick={() => setFieldSet('detailed')}
            className={` ${fieldSet === 'detailed' ? 'bg-ocean-2 text-white' : 'text-gray-800'}`}
          >
            Detailed
          </Button>
        </div>
      </div>

      <BankForm
        ref={formRef}
        onSubmit={(data) => handleCreateBank(data)}
        loading={createBankMutation.isPending}
        submitLabel="Create Bank"
        fields={activeFields}
        title={fieldSet === 'basic' ? 'Basic Bank Information' : 'Detailed Bank Information'}
        isPage={isPage}
      />
    </>
  );
});

CreateBankFormWrapper.displayName = 'CreateBankFormWrapper';

export default CreateBankFormWrapper;
