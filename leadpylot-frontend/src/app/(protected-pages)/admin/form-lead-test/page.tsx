'use client';

import BaseFormComponent from '@/components/shared/form/BaseFormComponent';
import type { FieldDefinition } from '@/components/shared/form/types';
import Card from '@/components/ui/Card';
import Notification from '@/components/ui/Notification';
import { toast } from '@/components/ui/toast';
import { apiSubmitLeadForm } from '@/services/LeadFormService';
import { useState } from 'react';
import { z } from 'zod';

const testLeadFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  investment_amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(z.number().min(0)),
});

const fields: FieldDefinition[] = [
  {
    name: 'first_name',
    label: 'First Name',
    type: 'input',
    placeholder: 'Enter first name',
    className: 'col-span-6',
  },
  {
    name: 'last_name',
    label: 'Last Name',
    type: 'input',
    placeholder: 'Enter last name',
    className: 'col-span-6',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'input',
    inputType: 'email',
    placeholder: 'Enter email address',
    className: 'col-span-6',
  },
  {
    name: 'phone',
    label: 'Phone',
    type: 'input',
    inputType: 'tel',
    placeholder: 'Enter phone number',
    className: 'col-span-6',
  },
  {
    name: 'investment_amount',
    label: 'Investment Amount (€)',
    type: 'input',
    inputType: 'number',
    placeholder: '0',
    className: 'col-span-12',
  },
];

export default function FormLeadTestPage() {
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: z.infer<typeof testLeadFormSchema>) => {
    setIsSubmitting(true);
    try {
      const wpPayload = {
        fields: {
          fisrt_name: { raw_value: data.first_name },
          last_name: { raw_value: data.last_name },
          email: { raw_value: data.email },
          phone: { raw_value: data.phone || '' },
          investment_amount: { raw_value: String(data.investment_amount || 0) },
        },
      };

      const result = await apiSubmitLeadForm(wpPayload);
      setLastResponse(result);
      toast.push(
        <Notification type="success">Lead submitted successfully</Notification>
      );
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Failed to submit lead form';
      setLastResponse({ error: message });
      toast.push(
        <Notification type="danger">{message}</Notification>
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="mb-6">
        <h1 className="mb-2 text-lg font-semibold">Lead Form Test</h1>
        <p className="mb-6 text-sm text-gray-500">
          This simulates a WordPress form submission. The data is sent in the same format as your WordPress site
          (<code className="rounded bg-gray-100 px-1 text-xs">fields.X.raw_value</code>).
          Make sure your site&apos;s origin is added in <strong>Form Lead Config</strong> first.
        </p>

        <BaseFormComponent
          schema={testLeadFormSchema}
          fields={fields}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          defaultValues={{
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            investment_amount: 0,
          }}
          actionButtons={{
            submit: true,
            reset: true,
            text: 'Submit Lead',
            loadingText: 'Submitting...',
          }}
          handleSubmitInternally={true}
          toastConfig={{
            showSuccessToast: false,
            showErrorToast: false,
          }}
        />
      </Card>

      {lastResponse && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Last Response</h2>
          <pre className="max-h-60 overflow-auto rounded bg-gray-50 p-3 text-xs">
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
