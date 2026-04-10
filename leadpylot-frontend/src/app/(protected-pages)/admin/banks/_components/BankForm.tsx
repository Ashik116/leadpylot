'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { useState, forwardRef, useImperativeHandle, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Switcher from '@/components/ui/Switcher';
import LoadProjects from './BankProjects';
import DualAgentSelection from './DualAgentSelection';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { LibraryImageUpload } from '@/components/shared/LibraryImageUpload/LibraryImageUpload';
import { CountryFlagFromCode } from '@/components/shared/CountryFlagFromCode/CountryFlagFromCode';

export type BankField =
  | 'name'
  | 'nickName'
  | 'lei_code'
  | 'country'
  | 'country_flag'
  | 'bank_country_code'
  | 'address'
  | 'note'
  | 'min_limit'
  | 'max_limit'
  | 'state'
  | 'projects'
  | 'is_default'
  | 'is_allow'
  | 'multi_iban'
  | 'phone'
  | 'email'
  | 'account'
  | 'account_number'
  | 'swift_code'
  | 'iban'
  | 'code'
  | 'isRestricted'
  | 'allowedAgents'
  | 'restrictedAgents'
  | 'commission';

export const REQUIRED_FIELDS: BankField[] = ['name', 'lei_code', 'country', 'address'];
export const BASIC_FIELDS: BankField[] = [
  ...REQUIRED_FIELDS,
  'state',
  'note',
  'is_allow',
  'is_default',
];
export const ACCOUNT_FIELDS: BankField[] = [
  'account',
  'account_number',
  'iban',
  'swift_code',
  'code',
];
export const CONTACT_FIELDS: BankField[] = ['phone', 'email'];
export const LIMIT_FIELDS: BankField[] = ['min_limit', 'max_limit'];
export const ALL_FIELDS: BankField[] = [
  ...REQUIRED_FIELDS,
  'nickName',
  'country_flag',
  'bank_country_code',
  ...ACCOUNT_FIELDS,
  ...CONTACT_FIELDS,
  ...LIMIT_FIELDS,
  'state',
  'note',
  'is_allow',
  'is_default',
  'multi_iban',
  'projects',
  'isRestricted',
  'allowedAgents',
  'restrictedAgents',
  'commission',
];

export const BankSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    nickName: z.string().optional(),
    lei_code: z.string().optional(),
    country: z.string().optional(),
    country_flag: z.any().optional(),
    bank_country_code: z.string().optional(),
    address: z.string().optional(),
    note: z.string().optional(),
    min_limit: z.coerce.number().min(0, 'Minimum limit must be 0 or greater').optional(),
    max_limit: z.coerce.number().min(0, 'Maximum limit must be 0 or greater').optional(),
    state: z.string().nullable().optional(),
    projects: z.array(z.string()).optional(),
    is_default: z.boolean().optional(),
    is_allow: z.boolean().optional(),
    multi_iban: z.boolean().optional(),
    phone: z.string().optional(),
    email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
    account: z.string().optional(),
    swift_code: z.string().optional(),
    iban: z.string().optional(),
    code: z.string().optional(),
    account_number: z.string().optional(),
    logo: z.any().optional(),
    isRestricted: z.boolean().optional(),
    allowedAgents: z.array(z.string()).optional(),
    restrictedAgents: z.array(z.string()).optional(),
    commission: z.coerce
      .number()
      .min(0, 'Commission must be between 0 and 100')
      .max(100, 'Commission must be between 0 and 100')
      .optional(),
  })
  .refine((data) => !data.min_limit || !data.max_limit || data.min_limit < data.max_limit, {
    message: 'Min limit must be less than Max limit',
    path: ['min_limit'],
  });

export type BankFormValues = z.infer<typeof BankSchema>;

export interface BankFormRef {
  submitForm: () => void;
  isSubmitting: boolean;
}

type Props = {
  onSubmit: (data: Record<string, unknown>) => void;
  defaultValues?: Partial<BankFormValues>;
  loading?: boolean;
  submitLabel?: string;
  fields?: BankField[];
  title?: string;
  isPage?: boolean;
};

const setValueOptions = { shouldValidate: true, shouldDirty: true, shouldTouch: true };

/** First whitespace-separated token of the bank name (for auto-nickname). */
function firstNicknameTokenFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const [first] = trimmed.split(/\s+/);
  return first ?? '';
}

const autoNicknameSetValueOptions = {
  shouldValidate: true,
  shouldDirty: false,
  shouldTouch: false,
} as const;

const BankForm = forwardRef<BankFormRef, Props>(
  (
    {
      onSubmit,
      defaultValues,
      loading,
      submitLabel = 'Save',
      fields = ALL_FIELDS,
      title,
      isPage = true,
    },
    ref
  ) => {
    const {
      register,
      handleSubmit,
      formState: { errors },
      setValue,
      setFocus,
      watch,
      getValues,
    } = useForm<BankFormValues>({
      resolver: zodResolver(BankSchema) as any,
      mode: 'onChange',
      reValidateMode: 'onChange',
      defaultValues: {
        is_allow: true,
        is_default: false,
        multi_iban: false,
        min_limit: 0,
        max_limit: 0,
        state: 'active',
        isRestricted: false,
        allowedAgents: [],
        restrictedAgents: [],
        commission: 0,
        ...defaultValues,
      },
    });

    const nickFollowsNameRef = useRef(true);

    const [allAvailableAgentIds, setAllAvailableAgentIds] = useState<string[]>([]);
    /** Cache public_url from cloudinary upload to avoid /view API call in preview section */
    const [publicUrlCache, setPublicUrlCache] = useState<Record<string, string>>({});

    useImperativeHandle(ref, () => ({
      submitForm: () => handleSubmit(handleFormSubmit)(),
      isSubmitting: loading || false,
    }));

    const selectedProjects = watch('projects') || [];
    const selectedAllowedAgents = watch('allowedAgents') || [];
    const selectedRestrictedAgents = watch('restrictedAgents') || [];
    const allowToggle = watch('is_allow') || false;
    const defaultToggle = watch('is_default') || false;
    const multiIbanToggle = watch('multi_iban') || false;
    const isRestrictedToggle = watch('isRestricted') || false;
    const logoValue = watch('logo');
    const countryFlagValue = watch('country_flag');
    const logoId =
      typeof logoValue === 'object' && logoValue && '_id' in logoValue
        ? (logoValue as { _id: string })._id
        : (logoValue ?? null);
    const countryFlagId =
      typeof countryFlagValue === 'object' && countryFlagValue && '_id' in countryFlagValue
        ? (countryFlagValue as { _id: string })._id
        : (countryFlagValue ?? null);

    const logoIdStr = logoId && typeof logoId === 'string' && logoId.trim() ? logoId : null;
    const countryFlagIdStr =
      countryFlagId && typeof countryFlagId === 'string' && countryFlagId.trim() ? countryFlagId : null;
    const logoPublicUrlFromApi =
      typeof logoValue === 'object' && logoValue?.public_url ? (logoValue as { public_url: string }).public_url : null;
    const flagPublicUrlFromApi =
      typeof countryFlagValue === 'object' && countryFlagValue?.public_url
        ? (countryFlagValue as { public_url: string }).public_url
        : null;
    const logoPreviewSrc = logoPublicUrlFromApi ?? (logoIdStr ? publicUrlCache[logoIdStr] : null);
    const flagPreviewSrc = flagPublicUrlFromApi ?? (countryFlagIdStr ? publicUrlCache[countryFlagIdStr] : null);
    const logoDisplayUrl = logoPreviewSrc;
    const flagDisplayUrl = flagPreviewSrc;

    const hasBankCountryCodeField = fields?.includes('bank_country_code') ?? false;
    const bankCountryCodeRaw = watch('bank_country_code') ?? '';
    const [debouncedBankCountryCode, setDebouncedBankCountryCode] = useState(bankCountryCodeRaw);
    const bankCountryCodeDebounceInitial = useRef(true);

    useEffect(() => {
      if (bankCountryCodeDebounceInitial.current) {
        bankCountryCodeDebounceInitial.current = false;
        setDebouncedBankCountryCode(bankCountryCodeRaw);
        return;
      }
      const id = window.setTimeout(() => setDebouncedBankCountryCode(bankCountryCodeRaw), 2000);
      return () => window.clearTimeout(id);
    }, [bankCountryCodeRaw]);

    const nameValue = watch('name');

    useEffect(() => {
      const nick = (defaultValues?.nickName ?? '').trim();
      const derived = firstNicknameTokenFromName(defaultValues?.name ?? '');
      nickFollowsNameRef.current = nick === '' || nick === derived;
    }, [defaultValues?.name, defaultValues?.nickName]);

    const hasNickNameField = fields?.includes('nickName') ?? false;

    useEffect(() => {
      if (!hasNickNameField) return;
      if (!nickFollowsNameRef.current) return;
      const next = firstNicknameTokenFromName(nameValue ?? '');
      setValue('nickName', next, autoNicknameSetValueOptions);
    }, [nameValue, setValue, hasNickNameField]);

    const handleImageFieldChange = useCallback(
      (field: 'logo' | 'country_flag', prevId: string | null) =>
        (id: string | null, publicUrl?: string) => {
          setValue(field, id ?? null, setValueOptions);
          setPublicUrlCache((prev) => {
            const next = { ...prev };
            if (publicUrl && id) next[id] = publicUrl;
            if (!id && prevId) delete next[prevId];
            return next;
          });
        },
      [setValue]
    );

    const handleFormSubmit: SubmitHandler<BankFormValues> = (data) => {
      const payload: Record<string, unknown> = {};

      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (key === 'logo') {
          if (typeof value === 'object' && value && '_id' in value)
            payload[key] = (value as { _id: string })._id;
          else if (typeof value === 'string' && value.trim()) payload[key] = value;
        } else if (key === 'country_flag') {
          if (typeof value === 'object' && value && '_id' in value)
            payload[key] = (value as { _id: string })._id;
          else if (typeof value === 'string' && value.trim()) payload[key] = value;
        } else if (key === 'commission') {
          payload['commission_percentage'] = value;
        } else {
          payload[key] = value;
        }
      });

      onSubmit(payload);
    };

    useEffect(() => {
      register('projects');
      register('allowedAgents');
      register('restrictedAgents');
      register('logo');
      register('country_flag');
    }, [register]);

    const handleInvalidSubmit = () => {
      const firstErrorField = Object.keys(errors)[0] as keyof BankFormValues | undefined;
      if (firstErrorField) setFocus(firstErrorField as any, { shouldSelect: true });
    };

    const showField = (fieldName: BankField) => fields?.includes(fieldName);
    const handleAgentsLoaded = (agentIds: string[]) => setAllAvailableAgentIds(agentIds);

    const handleRestrictionToggle = (checked: boolean) => {
      setValue('isRestricted', checked, setValueOptions);
      if (checked && allAvailableAgentIds?.length > 0) {
        setValue('allowedAgents', allAvailableAgentIds, setValueOptions);
        setValue('restrictedAgents', [], setValueOptions);
      } else if (!checked) {
        setValue('allowedAgents', [], setValueOptions);
        setValue('restrictedAgents', [], setValueOptions);
      }
    };

    const handleAgentChange = (field: 'allowedAgents' | 'restrictedAgents', ids: string[]) => {
      setValue(field, ids, setValueOptions);
    };

    const renderInputField = (
      name: keyof BankFormValues,
      label: string,
      placeholder: string,
      type?: string
    ) => {
      if (!showField(name as BankField)) return null;
      const error = errors[name];
      return (
        <div>
          <label className="mb-1 block text-sm font-medium opacity-70">{label}</label>
          <Input
            {...register(name as any)}
            type={type || 'text'}
            placeholder={placeholder}
            invalid={!!error}
          />
          {error && <span className="text-sm text-red-500">{error.message as string}</span>}
        </div>
      );
    };

    const renderNickNameField = () => {
      if (!showField('nickName')) return null;
      const error = errors.nickName;
      const { onChange: nickOnChange, ...nickRest } = register('nickName');
      return (
        <div>
          <label className="mb-1 block text-sm font-medium opacity-70">Nickname</label>
          <Input
            {...nickRest}
            type="text"
            placeholder="Bank Nickname"
            invalid={!!error}
            onChange={(e) => {
              nickOnChange(e);
              const v = e.target.value;
              const derived = firstNicknameTokenFromName(getValues('name') ?? '');
              nickFollowsNameRef.current = v.trim() === '' || v === derived;
            }}
          />
          {error && <span className="text-sm text-red-500">{error.message as string}</span>}
        </div>
      );
    };

    const renderBankCountryCodeField = () => {
      if (!showField('bank_country_code')) return null;
      const error = errors.bank_country_code;
      return (
        <div>
          <label className="mb-1 block text-sm font-medium opacity-70">Country Code</label>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Input
                {...register('bank_country_code' as any)}
                type="text"
                placeholder="e.g. GB"
                invalid={!!error}
              />
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
              <CountryFlagFromCode
                countryCode={bankCountryCodeRaw}
                legacySrc={countryFlagId ? flagDisplayUrl : null}
                alt="Country flag"
                width={35}
                height={35}
                className="h-9 w-9 object-cover"
              />
            </div>
          </div>
          {error && <span className="text-sm text-red-500">{error.message as string}</span>}
        </div>
      );
    };

    const renderSwitcher = (
      field: 'is_allow' | 'is_default' | 'multi_iban',
      label: string,
      checked: boolean
    ) => {
      if (!showField(field)) return null;
      return (
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium opacity-70">{label}</label>
          <Switcher
            checked={checked}
            onChange={(value: boolean) => setValue(field, value, setValueOptions)}
          />
        </div>
      );
    };

    return (
      <form
        noValidate
        onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)}
        className="space-y-4 pb-20"
      >
        {Object.keys(errors).length > 0 && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Please fix the highlighted errors below.
          </div>
        )}

        <div className="space-y-2">
          {showField('projects') && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium opacity-70">Projects</label>
              <LoadProjects
                selectedProjectIds={selectedProjects}
                onChange={(ids) => setValue('projects', ids, setValueOptions)}
              />
              {errors.projects && (
                <span className="text-sm text-red-500">{(errors.projects as any)?.message}</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="w-full space-x-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex space-x-4">
                  {showField('isRestricted') && (
                    <>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium opacity-70">
                          Enable Agent Access Control
                        </label>
                        <Switcher checked={isRestrictedToggle} onChange={handleRestrictionToggle} />
                      </div>
                    </>
                  )}
                  {renderSwitcher('is_allow', 'Allow', allowToggle)}
                  {renderSwitcher('is_default', 'As Default', defaultToggle)}
                  {renderSwitcher('multi_iban', 'Multiple IBAN', multiIbanToggle)}
                </div>
                {(logoId || countryFlagId || hasBankCountryCodeField) && (
                  <div className="relative shrink-0 rounded-lg border border-gray-200 bg-gray-50/80 shadow-sm md:ml-4">
                    <div className="flex flex-wrap items-end gap-4">
                      {logoId && (
                        <div className="flex flex-col items-center gap-1">
                          <div className="relative h-14 w-14 overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
                            {logoDisplayUrl ? (
                              <Image
                                src={logoDisplayUrl}
                                alt="Bank logo"
                                fill
                                className="object-contain"
                                sizes="56px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                <ApolloIcon name="picture" className="text-gray-400" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {(countryFlagId || hasBankCountryCodeField) && (
                        <div
                          className={
                            logoId
                              ? 'absolute bottom-0 left-0 flex flex-col items-center gap-1'
                              : 'flex flex-col items-center gap-1'
                          }
                        >
                          <div className="flex h-5 w-7 items-center justify-center overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                            <CountryFlagFromCode
                              countryCode={debouncedBankCountryCode}
                              legacySrc={countryFlagId ? flagDisplayUrl : null}
                              alt="Country flag"
                              width={28}
                              height={20}
                              className="h-5 w-7 object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {isRestrictedToggle &&
                (showField('allowedAgents') || showField('restrictedAgents')) && (
                  <div className="mt-4 rounded-md border border-gray-200 p-2">
                    <label className="mb-3 block text-sm font-medium opacity-70">
                      Agent Access Management
                      <span className="block text-xs text-gray-500">
                        Configure which agents can or cannot access this bank
                      </span>
                    </label>
                    <DualAgentSelection
                      allowedAgentIds={selectedAllowedAgents}
                      restrictedAgentIds={selectedRestrictedAgents}
                      onAllowedChange={(ids) => handleAgentChange('allowedAgents', ids)}
                      onRestrictedChange={(ids) => handleAgentChange('restrictedAgents', ids)}
                      onAllAgentsLoaded={handleAgentsLoaded}
                    />
                  </div>
                )}
            </div>
          </div>
          {/* <h2 className="text-xl font-semibold">Bank Details</h2> */}

          <div className="grid grid-cols-1 gap-4 rounded-md border border-gray-100 p-4 md:grid-cols-2">
            {showField('name') && renderInputField('name', 'Name', 'Bank Name')}

            <LibraryImageUpload
              label="Bank logo"
              value={logoId}
              onChange={handleImageFieldChange('logo', logoId)}
              cachedPreviewUrl={logoPreviewSrc}
              documentType="logo"
              accept=".jpg,.jpeg,.png"
              uploadMethod="cloudinary"
            />
            {renderNickNameField()}
            {renderInputField('lei_code', 'LEI Code', '213800PERENGATFCHD95')}
            {renderInputField('country', 'Bank Country', 'United Kingdom')}
            {/* <LibraryImageUpload
              label="Country flag"
              value={countryFlagId}
              onChange={handleImageFieldChange('country_flag', countryFlagId)}
              cachedPreviewUrl={flagPreviewSrc}
              documentType="country_flag"
              accept=".jpg,.jpeg,.png"
              uploadMethod="cloudinary"
            /> */}
            {renderBankCountryCodeField()}
            {renderInputField('address', 'Bank Address', '123 Bank Street')}
            {renderInputField('phone', 'Phone Number', '+44 123 456 7890')}
            {renderInputField('email', 'Email', 'bank@example.com')}
            {renderInputField('account', 'Account Name', 'Account Name')}
            {renderInputField('account_number', 'Account Number', 'Account Number')}
            {renderInputField('code', 'Bank Code', 'Bank Code')}
            {renderInputField('iban', 'IBAN', 'IBAN Number')}
            {renderInputField('swift_code', 'SWIFT Code', 'SWIFT Code')}
            {renderInputField('min_limit', 'Min Limit', '0.00', 'number')}
            {renderInputField('max_limit', 'Max Limit', '0.00', 'number')}
            {renderInputField('commission', 'Commission (%)', '0-100', 'number')}
            {renderInputField('note', 'Note', 'Additional notes')}

            {showField('state') && (
              <div>
                <label className="mb-1 block text-sm font-medium opacity-70">Status</label>
                <Select
                  instanceId="state"
                  placeholder="Please Select"
                  invalid={!!errors.state}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'stop', label: 'Stop' },
                    { value: 'blocked', label: 'Blocked' },
                  ]}
                  defaultValue={
                    defaultValues?.state
                      ? {
                        value: defaultValues?.state,
                        label:
                          defaultValues?.state.charAt(0).toUpperCase() +
                          defaultValues?.state.slice(1),
                      }
                      : { value: 'active', label: 'Active' }
                  }
                  onChange={(selected) =>
                    setValue('state', selected?.value || null, setValueOptions)
                  }
                />
                {errors.state && (
                  <span className="text-sm text-red-500">{errors.state.message}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="solid"
              icon={<ApolloIcon name="file" className="text-md" />}
              loading={loading}
            >
              {loading ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </div>


      </form>
    );
  }
);

BankForm.displayName = 'BankForm';

export default BankForm;
