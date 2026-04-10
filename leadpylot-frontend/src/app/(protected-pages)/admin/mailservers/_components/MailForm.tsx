'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { LuSave } from 'react-icons/lu';
import Switcher from '@/components/ui/Switcher';
import LoadProjects from '../../banks/_components/BankProjects';

// Define all possible fields for the bank form
export type MailServerField =
  | 'name'
  | 'smtp_address'
  | 'smtp_port'
  | 'imap_address'
  | 'imap_port'
  | 'imap_tls'
  | 'smtp_tls'
  | 'projects'
  | 'is_allow'
  | 'is_default'
  | 'multi_iban'
  | 'lei_code'
  | 'country'
  | 'address'
  | 'phone'
  | 'email'
  | 'account'
  | 'account_number'
  | 'code'
  | 'iban'
  | 'swift_code'
  | 'min_limit'
  | 'max_limit'
  | 'state'
  | 'note';

// Zod validation schema including all fields with defaults
export const BankSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  smtp_address: z.string().min(1, 'SMTP Address is required'),
  imap_address: z.string().min(1, 'IMAP Address is required'),
  lei_code: z.string().min(1, 'Lei Code is required'),
  country: z.string().min(1, 'Country is required'),
  address: z.string().min(1, 'Bank address is required'),

  phone: z.string().optional(),
  email: z.string().optional(),
  account: z.string().optional(),
  account_number: z.string().optional(),
  code: z.string().optional(),
  iban: z.string().optional(),
  swift_code: z.string().optional(),

  min_limit: z.number().optional(),
  max_limit: z.number().optional(),
  note: z.string().optional(),

  smtp_tls: z.boolean().default(false),
  imap_tls: z.boolean().default(false),
  imap_port: z.number().default(991),
  smtp_port: z.number().default(465),

  projects: z.array(z.string()).default([]),
  is_allow: z.boolean().default(true),
  is_default: z.boolean().default(false),
  multi_iban: z.boolean().default(false),
  state: z.enum(['active', 'stop', 'blocked']).default('active'),
});

export type MailServerFormValues = z.infer<typeof BankSchema>;

type Props = {
  onSubmit: (data: MailServerFormValues) => void;
  defaultValues?: Partial<MailServerFormValues>;
  loading?: boolean;
  submitLabel?: string;
  fields?: MailServerField[];
  title?: string;
};

const MailServerForm = ({
  onSubmit,
  defaultValues,
  loading,
  submitLabel = 'Save',
  fields,
  title,
}: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MailServerFormValues>({
    resolver: zodResolver(BankSchema) as any,
    defaultValues: {
      is_allow: true,
      is_default: false,
      multi_iban: false,
      min_limit: 0,
      max_limit: 0,
      state: 'active',
      ...defaultValues,
    },
  });

  // Watch fields
  const selectedProjects = watch('projects') ?? [];
  const allowToggle = watch('is_allow') ?? false;
  const defaultToggle = watch('is_default') ?? false;
  const multiIbanToggle = watch('multi_iban') ?? false;

  const handleFormSubmit: SubmitHandler<MailServerFormValues> = (data) => {
    onSubmit(data);
  };

  // Check if field should be shown
  const showField = (fieldName: MailServerField) => !fields || fields.includes(fieldName);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {title && <h2 className="mb-4 text-xl font-semibold">{title}</h2>}

      <div className="space-y-4">
        {/* Projects */}
        {showField('projects') && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Projects</label>
            <LoadProjects
              selectedProjectIds={[...selectedProjects]}
              onChange={(newSelectedIds) => setValue('projects', newSelectedIds)}
            />
          </div>
        )}

        {/* Toggles */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {showField('is_allow') && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Allow</label>
              <Switcher
                checked={allowToggle}
                onChange={(checked) => setValue('is_allow', checked)}
              />
            </div>
          )}
          {showField('is_default') && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">As Default</label>
              <Switcher
                checked={defaultToggle}
                onChange={(checked) => setValue('is_default', checked)}
              />
            </div>
          )}
          {showField('multi_iban') && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Multiple IBAN</label>
              <Switcher
                checked={multiIbanToggle}
                onChange={(checked) => setValue('multi_iban', checked)}
              />
            </div>
          )}
        </div>

        <h2 className="text-xl font-semibold">Bank Details</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Render inputs conditionally */}
          {showField('name') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Name*</label>
              <Input {...register('name')} placeholder="Bank Name" invalid={!!errors.name} />
              {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
            </div>
          )}

          {showField('lei_code') && (
            <div>
              <label className="mb-1 block text-sm font-medium">LEI Code*</label>
              <Input
                {...register('lei_code')}
                placeholder="213800PERENGATFCHD95"
                invalid={!!errors.lei_code}
              />
              {errors.lei_code && (
                <span className="text-sm text-red-500">{errors.lei_code.message}</span>
              )}
            </div>
          )}

          {showField('country') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Bank Country*</label>
              <Input
                {...register('country')}
                placeholder="United Kingdom"
                invalid={!!errors.country}
              />
              {errors.country && (
                <span className="text-sm text-red-500">{errors.country.message}</span>
              )}
            </div>
          )}

          {showField('address') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Bank Address*</label>
              <Input
                {...register('address')}
                placeholder="123 Bank Street"
                invalid={!!errors.address}
              />
              {errors.address && (
                <span className="text-sm text-red-500">{errors.address.message}</span>
              )}
            </div>
          )}

          {showField('phone') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Phone Number</label>
              <Input {...register('phone')} placeholder="+44 123 456 7890" />
            </div>
          )}

          {showField('email') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input
                {...register('email')}
                placeholder="bank@example.com"
                invalid={!!errors.email}
              />
              {errors.email && <span className="text-sm text-red-500">{errors.email.message}</span>}
            </div>
          )}

          {showField('account') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Account Name</label>
              <Input {...register('account')} placeholder="Account Name" />
            </div>
          )}

          {showField('account_number') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Account Number</label>
              <Input {...register('account_number')} placeholder="Account Number" />
            </div>
          )}

          {showField('code') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Bank Code</label>
              <Input {...register('code')} placeholder="Bank Code" />
            </div>
          )}

          {showField('iban') && (
            <div>
              <label className="mb-1 block text-sm font-medium">IBAN</label>
              <Input {...register('iban')} placeholder="IBAN Number" />
            </div>
          )}

          {showField('swift_code') && (
            <div>
              <label className="mb-1 block text-sm font-medium">SWIFT Code</label>
              <Input {...register('swift_code')} placeholder="SWIFT Code" />
            </div>
          )}

          {showField('min_limit') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Min Limit</label>
              <Input
                type="number"
                {...register('min_limit', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          )}

          {showField('max_limit') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Max Limit</label>
              <Input
                type="number"
                {...register('max_limit', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          )}

          {showField('state') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <Select
                instanceId="state"
                placeholder="Please Select"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'stop', label: 'Stop' },
                  { value: 'blocked', label: 'Blocked' },
                ]}
                defaultValue={{
                  value: defaultValues?.state ?? 'active',
                  label:
                    (defaultValues?.state ?? 'active').charAt(0).toUpperCase() +
                    (defaultValues?.state ?? 'active').slice(1),
                }}
                onChange={(selected) => {
                  if (selected && ['active', 'stop', 'blocked'].includes(selected.value))
                    setValue('state', selected.value as 'active' | 'stop' | 'blocked');
                }}
              />
            </div>
          )}

          {showField('note') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Note</label>
              <Input {...register('note')} placeholder="Additional notes" />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="solid" size="sm" icon={<LuSave />} loading={loading}>
          {loading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default MailServerForm;
