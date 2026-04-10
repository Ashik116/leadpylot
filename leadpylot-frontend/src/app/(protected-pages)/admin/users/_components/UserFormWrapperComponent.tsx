'use client';

import MailServerFormWrapperComponent from '@/app/(protected-pages)/admin/mailservers/_components/MailServerFormWrapperComponent';
import PasswordInput from '@/components/shared/PasswordInput';
import { FormPreloader } from '@/components/shared/loaders';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Segment from '@/components/ui/Segment';
import Select from '@/components/ui/Select';
import Switcher from '@/components/ui/Switcher';
import toast from '@/components/ui/toast';
import { apiCreateUser, apiDecryptCredentialPassword, apiUpdateUser } from '@/services/UsersService';
import { useOffices } from '@/services/hooks/useOffices';
import { useRoles } from '@/services/hooks/useRoles';
import { useMailServers } from '@/services/hooks/useSettings';
import { useUser } from '@/services/hooks/useUsers';
import useGeneratePassword from '@/utils/hooks/useGeneratePassword';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import UserColorPicker from './UserColorPicker';
import UserImageUpload from './UserImageUpload';

// Schema and types
const platformCredentialSchema = z.object({
  platform_type: z.enum(['email', 'telegram', 'discord', 'other']).optional(),
  platform_name: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'Invalid email address',
    }),
  chat_id: z.string().nullable().optional(),
  telegram_username: z.string().nullable().optional(),
  telegram_phone: z.string().nullable().optional(),
  userPass: z.string().optional(),
  link: z
    .string()
    .optional()
    .refine((val) => !val || z.string().url().safeParse(val).success, {
      message: 'Invalid URL',
    }),
});

const userSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  password: z.string().optional(),
  role: z.string().min(1, 'Please select a role'),
  unmask: z.boolean().optional(),
  view_type: z.enum(['listView', 'detailsView']).optional(),
  color_code: z.string().optional(),
  image_id: z.string().optional(),
  voip_extension: z.string().optional().or(z.literal('')),
  voip_password: z.string().optional().or(z.literal('')),
  voip_enabled: z.boolean().optional(),
  other_platform_credentials: z.array(platformCredentialSchema).optional(),
  load: z.number().optional(),
  opening: z.number().optional(),
  offices: z.array(z.string()).optional(),
  primary_office: z.string().optional().nullable(),
  mail_servers: z.array(z.string()).optional(),
});

type UserFormData = z.infer<typeof userSchema>;

const ADD_MAIL_SERVER_VALUE = '__add_new_mail_server__';

interface UserFormWrapperComponentProps {
  type: 'create' | 'edit';
  id?: string;
  isPage?: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
}

// Form field configuration
const FORM_FIELDS = [
  {
    name: 'username',
    label: 'Username',
    type: 'input',
    placeholder: 'johndoe',
    required: true,
  },
  {
    name: 'name',
    label: 'Name',
    type: 'input',
    placeholder: 'John Doe',
    required: true,
  },
  {
    name: 'email',
    label: 'Email (Optional)',
    type: 'input',
    inputType: 'email',
    placeholder: 'john@example.com',
  },
  {
    name: 'phone',
    label: 'Phone (Optional)',
    type: 'input',
    inputType: 'tel',
    placeholder: '+1 (555) 123-4567',
  },
  {
    name: 'load',
    label: 'Commission Load (% Optional)',
    type: 'input',
    inputType: 'number',
    placeholder: '0-100',
  },
  {
    name: 'opening',
    label: 'Commission Opening (% Optional)',
    type: 'input',
    inputType: 'number',
    placeholder: '0-100',
  },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    required: true,
  },
  {
    name: 'view_type',
    label: 'View Type',
    type: 'segment',
  },
] as const;

// Mutation configuration
const MUTATION_CONFIG = {
  create: {
    title: 'User created',
    successMessage: 'User created successfully',
    errorTitle: 'User creation failed',
    errorMessage: 'Failed to create user',
  },
  edit: {
    title: 'User updated',
    successMessage: 'User updated successfully',
    errorTitle: 'User update failed',
    errorMessage: 'Failed to update user',
  },
};

// Custom hook for user mutations
export const useUserMutations = (
  type: 'create' | 'edit',
  id?: string,
  userData?: any,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const config = MUTATION_CONFIG[type];

  const mutation = useMutation<any, Error, UserFormData>({
    mutationFn: (data: UserFormData) => {
      if (type === 'create') {
        const payload: any = {
          login: data?.username,
          password: data.password!,
          role: data?.role,
          info: { name: data?.name, email: data?.email || '' },
          unmask: data?.unmask,
          view_type: data?.view_type || 'listView',
          color_code: data?.color_code || undefined,
          image_id: data?.image_id || undefined,
          ...(data?.offices?.length ? { offices: data.offices } : {}),
          ...(data?.primary_office ? { primary_office: data.primary_office } : {}),
          ...(data?.mail_servers?.length ? { mail_servers: data.mail_servers } : {}),
          ...(data?.voip_extension ? { voip_extension: data.voip_extension } : {}),
          ...(data?.voip_password ? { voip_password: data.voip_password } : {}),
          ...(data?.voip_enabled !== undefined ? { voip_enabled: data.voip_enabled } : {}),
          ...(data?.other_platform_credentials &&
            data?.other_platform_credentials.length > 0
            ? {
              other_platform_credentials: data.other_platform_credentials.filter(
                (cred) =>
                  cred.userName || cred.userEmail || cred.userPass || cred.link || cred.platform_name || cred.platform_type || cred.chat_id || cred.telegram_username || cred.telegram_phone
              ),
            }
            : {}),
        };
        return apiCreateUser(payload);
      } else {
        const payload: any = {
          _id: id!,
          login: data?.username,
          role: data?.role,
          active: userData?.active || true,
          unmask: data?.unmask,
          view_type: data?.view_type || 'listView',
          color_code: data?.color_code || undefined,
          image_id: data?.image_id || undefined,
          commission_percentage_load: data?.load !== undefined && data?.load !== null ? data.load : undefined,
          commission_percentage_opening: data?.opening !== undefined && data?.opening !== null ? data.opening : undefined,
          voip_extension: data?.voip_extension || null,
          voip_password: data?.voip_password || null,
          voip_enabled: data?.voip_enabled ?? false,
          info: {
            name: data?.name,
            email: data?.email || null,
            phone: data?.phone || null,
            lang: userData?.info?.lang || '',
          },
          offices: data?.offices ?? [],
          primary_office: data?.primary_office ?? null,
          mail_servers: data?.mail_servers ?? [],
          other_platform_credentials:
            data?.other_platform_credentials && data.other_platform_credentials.length > 0
              ? data.other_platform_credentials.filter(
                (cred) =>
                  cred.userName || cred.userEmail || cred.userPass || cred.link || cred.platform_name || cred.platform_type || cred.chat_id || cred.telegram_username || cred.telegram_phone
              )
              : [],
        };
        return apiUpdateUser(id!, payload);
      }
    },
    onSuccess: () => {
      toast.push(
        <Notification title={config?.title} type="success">
          {config?.successMessage}
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (type === 'edit') queryClient.invalidateQueries({ queryKey: ['user', id] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.push(
        <Notification title={config?.errorTitle} type="danger">
          {error?.response?.data?.message || error?.response?.data?.error || config?.errorMessage}
        </Notification>
      );
    },
  });

  return mutation;
};

// Permissions Display Component
const PermissionsDisplay = ({ permissions }: { permissions: string[] }) => {
  if (!permissions || permissions.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs text-gray-500">No permissions assigned to this role</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-xs font-medium text-gray-700">Permissions ({permissions.length})</p>
      <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
        {permissions.map((permission) => (
          <span
            key={permission}
            className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700"
          >
            {permission}
          </span>
        ))}
      </div>
    </div>
  );
};

// Generic form field renderer
const renderFormField = (
  field: any,
  register: any,
  control: any,
  errors: any,
  isSubmitting: boolean,
  dynamicOptions?: any[]
) => {
  const { name, label, type, inputType, placeholder, options: fieldOptions } = field;
  const error = errors[name];

  const fieldProps = {
    label,
    invalid: !!error,
    errorMessage: error?.message,
  };

  if (type === 'select') {
    const selectOptions = dynamicOptions || fieldOptions;
    return (
      <FormItem key={name} {...fieldProps} className="text-sm">
        <Controller
          name={name}
          control={control}
          render={({ field: controllerField }) => {
            // Find the option with matching value to get the correct label
            const selectedOption = selectOptions?.find(
              (opt: any) => opt.value === controllerField.value
            );
            return (
              <Select
                id={name}
                placeholder={`Select ${label.toLowerCase()}`}
                invalid={!!error}
                className="w-full"
                options={selectOptions}
                value={
                  selectedOption
                    ? { value: selectedOption.value, label: selectedOption.label }
                    : null
                }
                onChange={(selectedOption: any) => controllerField.onChange(selectedOption?.value)}
                isDisabled={isSubmitting}
              />
            );
          }}
        />
      </FormItem>
    );
  }

  if (type === 'segment') {
    return (
      <div key={name} className="flex items-end justify-start gap-2">
        <span className="text-sm">{label}:</span>
        <Controller
          name={name}
          control={control}
          render={({ field: controllerField }) => {
            const displayValue = controllerField.value || 'listView';
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <Segment
                  value={displayValue}
                  onChange={(value: any) => {
                    const viewType = typeof value === 'string' ? value : value[0] || 'listView';
                    controllerField.onChange(viewType === 'detailsView' ? 'listView' : viewType);
                  }}
                  size="xs"
                  className="m-0 overflow-hidden rounded-md p-0"
                >
                  <Segment.Item
                    value="listView"
                    className="m-0 h-full rounded-none p-1"
                    type="button"
                  >
                    List view
                  </Segment.Item>
                  <Segment.Item
                    value="detailsView"
                    disabled
                    className="m-0 h-full rounded-none p-1"
                    type="button"
                  >
                    Details view
                  </Segment.Item>
                </Segment>
              </div>
            );
          }}
        />
      </div>
    );
  }

  // Handle number inputs with min/max attributes
  const numberInputProps =
    inputType === 'number'
      ? {
        min: 0,
        max: 100,
        step: 1,
      }
      : {};

  return (
    <FormItem key={name} {...fieldProps} className="text-sm">
      <Input
        {...register(name)}
        type={inputType || 'text'}
        placeholder={placeholder}
        disabled={isSubmitting}
        {...numberInputProps}
      />
    </FormItem>
  );
};

// Password field component
const PasswordField = ({ register, errors, isSubmitting, generatePassword }: any) => (
  <FormItem
    label="Password"
    invalid={!!errors.password}
    errorMessage={errors.password?.message}
    className="text-sm"
  >
    <div className="space-y-2">
      <PasswordInput
        {...register('password')}
        placeholder="Enter password"
        disabled={isSubmitting}
      />
      <Button
        type="button"
        variant="plain"
        size="xs"
        onClick={generatePassword}
        icon={<ApolloIcon name="refresh" className="text-sm" />}
      >
        Generate Password
      </Button>
    </div>
  </FormItem>
);

// Platform Credentials Component
const PlatformCredentialsSection = ({
  control,
  register,
  errors,
  isSubmitting,
  fields,
  append,
  remove,
  userId,
  type,
  setValue,
}: any) => {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Decrypt password mutation
  const decryptMutation = useMutation({
    mutationFn: ({ userId, credentialId, adminPassword }: { userId: string; credentialId: string; adminPassword: string }) =>
      apiDecryptCredentialPassword(userId, credentialId, adminPassword),
    onSuccess: (data, variables) => {
      const decryptedPwd = data.data.credential.userPass;
      if (!decryptedPwd) return;

      // Set decrypted password in modal
      setDecryptedPassword(decryptedPwd);
      setIsDecrypting(false);

      toast.push(
        <Notification title="Password Decrypted" type="success">
          {data.message || 'Password decrypted successfully. This action has been logged.'}
        </Notification>
      );
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Decryption Failed" type="danger">
          {error?.response?.data?.message || 'Failed to decrypt password. Please try again.'}
        </Notification>
      );
      setIsDecrypting(false);
    },
  });

  const handleOpenDecryptModal = (credentialId: string) => {
    setSelectedCredentialId(credentialId);
    setAdminPassword('');
    setDecryptedPassword(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCredentialId(null);
    setAdminPassword('');
    setDecryptedPassword(null);
  };

  const handleDecryptPassword = () => {
    if (!userId || !selectedCredentialId || !adminPassword.trim()) {
      toast.push(
        <Notification title="Validation Error" type="danger">
          Please enter admin password.
        </Notification>
      );
      return;
    }
    setIsDecrypting(true);
    decryptMutation.mutate({ userId, credentialId: selectedCredentialId, adminPassword });
  };

  return (
    <div className="mt-4 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-2 shadow-sm">
      {/* Section Header */}
      <div className="mb-2 flex items-center gap-3 border-b border-blue-200 pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <ApolloIcon name="shield" className="text-lg text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-800">Other Platform Credentials</h3>
          <p className="text-xs text-gray-600">
            Store encrypted login credentials for external platforms (e.g., Salesforce, HubSpot)
          </p>
        </div>
        <Button
          type="button"
          variant="default"
          size="xs"
          icon={<ApolloIcon name="plus" className="text-sm" />}
          onClick={() =>
            append({
              platform_type: 'email',
              platform_name: '',
              userName: '',
              userEmail: '',
              userPass: '',
              link: '',
              chat_id: null,
              telegram_username: null,
              telegram_phone: null,
            })
          }
          disabled={isSubmitting}
        // className="bg-blue-600 hover:bg-blue-700"
        >
          Add Platform
        </Button>
      </div>

      {/* Platform Credentials List */}
      {fields.length > 0 ? (
        <div className="space-y-2">
          {fields.map((field: any, index: number) => (
            <div
              key={field.id}
              className="rounded-lg border border-blue-200 bg-white p-2 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                  <ApolloIcon name="link" className="text-sm text-blue-600" />
                  <h4 className="text-sm font-medium text-gray-700">
                    Platform Credential {index + 1}
                  </h4>
                </div>
                <Button
                  type="button"
                  variant="plain"
                  size="xs"
                  icon={<ApolloIcon name="trash" className="text-sm" />}
                  onClick={() => remove(index)}
                  disabled={isSubmitting}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Platform Type Dropdown */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Platform Type</label>
                  <Controller
                    name={`other_platform_credentials.${index}.platform_type`}
                    control={control}
                    render={({ field: platformTypeField }) => (
                      <Select
                        id={`platform_type_${index}`}
                        placeholder="Select platform type"
                        options={[
                          { value: 'email', label: 'Email' },
                          { value: 'telegram', label: 'Telegram' },
                          { value: 'discord', label: 'Discord' },
                          { value: 'other', label: 'Other' },
                        ]}
                        value={
                          platformTypeField.value
                            ? { value: platformTypeField.value, label: platformTypeField.value.charAt(0).toUpperCase() + platformTypeField.value.slice(1) }
                            : null
                        }
                        onChange={(selectedOption: any) => platformTypeField.onChange(selectedOption?.value)}
                        isDisabled={isSubmitting}
                        className="w-full"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Platform Name <span className="text-gray-400">(e.g., Salesforce)</span>
                  </label>
                  <Input
                    {...register(`other_platform_credentials.${index}.platform_name`)}
                    placeholder="Platform name"
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Username</label>
                  <Input
                    {...register(`other_platform_credentials.${index}.userName`)}
                    placeholder="Platform username"
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
                  <Input
                    {...register(`other_platform_credentials.${index}.userEmail`)}
                    type="email"
                    placeholder="Platform email"
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>
                {/* Chat ID - Show only for Telegram platform type */}
                <Controller
                  name={`other_platform_credentials.${index}.platform_type`}
                  control={control}
                  render={({ field: platformTypeField }) =>
                    platformTypeField.value === 'telegram' ? (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">
                            Chat ID <span className="text-gray-400">(Auto-filled when linked via bot)</span>
                          </label>
                          <Input
                            {...register(`other_platform_credentials.${index}.chat_id`)}
                            placeholder="Telegram chat ID"
                            disabled={isSubmitting}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">
                            Telegram Username <span className="text-gray-400">(For bot linking)</span>
                          </label>
                          <Input
                            {...register(`other_platform_credentials.${index}.telegram_username`)}
                            placeholder="@username"
                            disabled={isSubmitting}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">
                            Telegram Phone <span className="text-gray-400">(For bot linking)</span>
                          </label>
                          <Input
                            {...register(`other_platform_credentials.${index}.telegram_phone`)}
                            placeholder="+1234567890"
                            disabled={isSubmitting}
                            className="w-full"
                          />
                        </div>
                      </>
                    ) : (
                      <></>
                    )
                  }
                />
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Password</label>
                  <div className="space-y-2">
                    <Controller
                      name={`other_platform_credentials.${index}.userPass`}
                      control={control}
                      render={({ field: passwordField }) => (
                        <PasswordInput
                          {...passwordField}
                          placeholder="Platform password"
                          disabled={isSubmitting}
                          className="w-full"
                        />
                      )}
                    />
                    {/* Show Decrypt Button for existing credentials in edit mode */}
                    {type === 'edit' && field._id && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="default"
                          size="xs"
                          icon={<ApolloIcon name="eye-filled" className="text-sm" />}
                          onClick={() => {
                            handleOpenDecryptModal(field._id);
                          }}
                          disabled={isSubmitting}
                          className="text-xs"
                        >
                          Show Decrypted Password
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Platform URL</label>
                  <Input
                    {...register(`other_platform_credentials.${index}.link`)}
                    type="url"
                    placeholder="https://platform.example.com"
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-blue-300 bg-blue-50/50 p-2 text-center">
          <ApolloIcon name="info-circle" className="mx-auto mb-2 text-lg text-blue-500" />
          <p className="text-sm text-gray-600">
            No platform credentials added yet. Click &quot;Add Platform&quot; to add credentials for external
            platforms.
          </p>
        </div>
      )}

      {/* Decrypt Password Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        width={500}
        contentClassName="p-6"
      >
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Decrypt Platform Password</h3>
            <p className="text-sm text-gray-600">
              Please enter your admin password to decrypt the platform credential password.
            </p>
          </div>

          {!decryptedPassword ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Admin Password
                </label>
                <PasswordInput
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  disabled={isDecrypting}
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isDecrypting && adminPassword.trim()) {
                      e.preventDefault();
                      handleDecryptPassword();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="plain"
                  onClick={handleCloseModal}
                  disabled={isDecrypting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="solid"
                  onClick={handleDecryptPassword}
                  disabled={isDecrypting || !adminPassword.trim()}
                  icon={
                    isDecrypting ? (
                      <ApolloIcon name="loading" className="text-sm animate-spin" />
                    ) : (
                      <ApolloIcon name="eye-filled" className="text-sm" />
                    )
                  }
                >
                  {isDecrypting ? 'Decrypting...' : 'Decrypt Password'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Decrypted Password
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={decryptedPassword}
                    readOnly
                    className="w-full font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="plain"
                    size="sm"
                    icon={<ApolloIcon name="copy" className="text-sm" />}
                    onClick={() => {
                      navigator.clipboard.writeText(decryptedPassword);
                      toast.push(
                        <Notification title="Copied" type="success">
                          Password copied to clipboard
                        </Notification>
                      );
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-start gap-2">
                  <ApolloIcon name="info-circle" className="text-amber-600 text-sm mt-0.5" />
                  <p className="text-xs text-amber-800">
                    This access has been logged for security purposes.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  variant="solid"
                  onClick={handleCloseModal}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
};

// Form fields component using loops
const UserFormFields = ({
  userId,
  register,
  control,
  errors,
  isSubmitting,
  type,
  generatePassword,
  form,
  setValue,
  roleOptions,
  selectedRole,
  officeOptions = [],
  mailServerOptions = [],
  onAddMailServerRequest,
  addMailServerOptionValue = '__add_new_mail_server__',
  platformFields,
  appendPlatform,
  removePlatform,
}: any) => {
  const viewTypeField = FORM_FIELDS.find((f) => f.name === 'view_type');
  // const loadField = FORM_FIELDS.find((f) => f.name === 'load');
  // const openingField = FORM_FIELDS.find((f) => f.name === 'opening');
  const otherFields = FORM_FIELDS.filter((f) => f.name !== 'view_type' && f.name !== 'load' && f.name !== 'opening');
  const selectedOffices = form.watch('offices') ?? [];
  const primaryOfficeOptions = selectedOffices.length
    ? officeOptions.filter((o: { value: string }) => selectedOffices.includes(o.value))
    : officeOptions;

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Image Upload Field */}
      <div className="">
        <Controller
          name="image_id"
          control={control}
          render={({ field }) => (
            <UserImageUpload
              value={field.value || undefined}
              onChange={(documentId) => field.onChange(documentId || null)}
              disabled={isSubmitting}
              error={errors.image_id?.message}
            />
          )}
        />
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 pt-4'>
        {otherFields.map((field) => {
          const options = field.name === 'role' ? roleOptions : undefined;
          return renderFormField(field, register, control, errors, isSubmitting, options);
        })}
        {/* Color Code Field */}
        <Controller
          name="color_code"
          control={control}
          render={({ field }) => (
            <UserColorPicker
              value={field.value || ''}
              onChange={(hexColor) => field.onChange(hexColor)}
              disabled={isSubmitting}
              error={errors.color_code?.message}
            />
          )}
        />
      </div>

      {/* Display permissions for selected role */}
      {selectedRole && (
        <div className="space-y-2 mt-2">
          <p className="text-sm font-medium text-gray-700">Role: {selectedRole.displayName}</p>
          <PermissionsDisplay permissions={selectedRole.permissions} />
        </div>
      )}

      {/* Offices: multi-select and primary office */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormItem label="Offices (optional)" className="text-sm">
          <Controller
            name="offices"
            control={control}
            render={({ field }) => (
              <Select
                isMulti
                placeholder="Select offices..."
                className="w-full"
                options={officeOptions}
                value={officeOptions.filter((o: { value: string }) => (field.value ?? []).includes(o.value))}
                onChange={(newValue: readonly { value: string; label: string }[] | null, _actionMeta) => {
                  const ids = newValue ? Array.from(newValue, (s) => s.value) : [];
                  field.onChange(ids);
                  const primary = form.getValues('primary_office');
                  if (primary && !ids.includes(primary)) setValue('primary_office', null);
                }}
                isDisabled={isSubmitting}
              />
            )}
          />
        </FormItem>
        <FormItem label="Primary office (optional)" className="text-sm">
          <Controller
            name="primary_office"
            control={control}
            render={({ field }) => {
              const selectedOption = primaryOfficeOptions.find((o: { value: string }) => o.value === field.value);
              return (
                <Select
                  placeholder="Select primary office..."
                  className="w-full"
                  options={primaryOfficeOptions}
                  value={selectedOption ? { value: selectedOption.value, label: selectedOption.label } : null}
                  onChange={(selected: { value: string; label: string } | null) => field.onChange(selected?.value ?? null)}
                  isDisabled={isSubmitting}
                />
              );
            }}
          />
        </FormItem>
      </div>

      {/* Mail Servers: multi-select */}
      {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormItem label="Mail Servers (optional)" className="text-sm">
          <Controller
            name="mail_servers"
            control={control}
            render={({ field }) => {
              const selectedIds = field.value ?? [];
              const displayValue = mailServerOptions.filter((ms: { value: string }) =>
                selectedIds.includes(ms.value)
              );
              return (
                <Select
                  isMulti
                  placeholder="Select mail servers..."
                  className="w-full"
                  options={mailServerOptions}
                  value={displayValue}
                  onChange={(newValue: readonly { value: string; label: string }[] | null) => {
                    const chosen = newValue ? Array.from(newValue) : [];
                    const ids = chosen
                      .map((s) => s.value)
                      .filter((v) => v !== addMailServerOptionValue);
                    if (chosen.some((s) => s.value === addMailServerOptionValue)) {
                      onAddMailServerRequest?.();
                    }
                    field.onChange(ids);
                  }}
                  isDisabled={isSubmitting}
                />
              );
            }}
          />
        </FormItem>
      </div> */}

      {/* Chapcharap and View Type in same row */}
      <div className="flex flex-wrap justify-between my-2">
        <div className="flex items-end justify-start gap-2">
          <span className="text-sm">Chapcharap :</span>
          <Switcher
            checked={form.watch('unmask') || false}
            name="unmask"
            onChange={(checked) => {
              setValue('unmask', checked);
            }}
          />
        </div>
        {viewTypeField && renderFormField(viewTypeField, register, control, errors, isSubmitting)}
      </div>
      {type === 'create' && (
        <PasswordField
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
          generatePassword={generatePassword}
        />
      )}

      {/* VoIP Settings */}
      <div className="mt-4 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/30 p-2 shadow-sm">
        <div className="mb-2 flex items-center gap-3 border-b border-green-200 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <ApolloIcon name="phone" className="text-lg text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-800">VoIP Settings</h3>
            <p className="text-xs text-gray-600">
              Assign a SIP extension for browser-based calling
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FormItem label="VoIP Extension" className="text-sm">
            <Input
              {...register('voip_extension')}
              placeholder="e.g. 1001"
              disabled={isSubmitting}
            />
          </FormItem>
          <FormItem label="VoIP Password" className="text-sm">
            <Controller
              name="voip_password"
              control={control}
              render={({ field }) => (
                <PasswordInput
                  {...field}
                  placeholder="SIP password"
                  disabled={isSubmitting}
                />
              )}
            />
          </FormItem>
          <div className="flex items-end gap-2 pb-2">
            <span className="text-sm">VoIP Enabled:</span>
            <Controller
              name="voip_enabled"
              control={control}
              render={({ field }) => (
                <Switcher
                  checked={field.value || false}
                  onChange={(checked) => field.onChange(checked)}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Platform Credentials Section - Visually Distinct */}
      <PlatformCredentialsSection
        type={type}
        userId={userId}
        control={control}
        register={register}
        errors={errors}
        isSubmitting={isSubmitting}
        fields={platformFields}
        append={appendPlatform}
        remove={removePlatform}
      />
    </div>
  );
};

const UserFormWrapperComponent = ({
  type,
  id,
  isPage = true,
  onSuccess,
  onClose,
}: UserFormWrapperComponentProps) => {
  const { uniqPassword, generatePassword } = useGeneratePassword();
  const { data: userData, isLoading } = useUser(id || '');
  const { data: rolesData, isLoading: rolesLoading } = useRoles({ limit: 100 });
  const { data: officesData } = useOffices({ limit: 200 });
  const { data: mailServersData } = useMailServers();
  const mutation = useUserMutations(type, id, userData, onSuccess);
  const queryClient = useQueryClient();
  const [showAddMailServerDialog, setShowAddMailServerDialog] = useState(false);

  const officeList = officesData?.data ?? [];
  const officeOptions = officeList.map((o: { _id: string; name?: string }) => ({
    value: o._id,
    label: o.name || o._id,
  }));

  const mailServersRaw = mailServersData as any;
  const mailServerList = Array.isArray(mailServersRaw) ? mailServersRaw : mailServersRaw?.data || [];
  const mailServerOptions = useMemo(() => {
    const opts = mailServerList.map((ms: { _id: string; name?: string | { en_US?: string } }) => ({
      value: ms._id,
      label: typeof ms.name === 'string' ? ms.name : (ms.name as any)?.en_US || ms._id,
    }));
    return [...opts, { value: ADD_MAIL_SERVER_VALUE, label: '+ Add New Mail Server' }];
  }, [mailServerList]);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: '', view_type: 'listView', other_platform_credentials: [], offices: [], primary_office: null, mail_servers: [] },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
    reset,
    watch,
  } = form;

  // Platform credentials field array
  const {
    fields: platformFields,
    append: appendPlatform,
    remove: removePlatform,
  } = useFieldArray({
    control,
    name: 'other_platform_credentials',
  });

  // Watch the role field to update selected role
  const currentRole = watch('role');

  // Get roles and create options
  const roles = rolesData?.roles || [];
  const roleOptions = roles
    .filter((role) => role.active)
    .map((role) => ({
      value: role.name,
      label: role.displayName || role.name,
    }));

  // Find the selected role object
  const selectedRole = roles.find((role) => role.name === currentRole);

  // Effects
  useEffect(() => {
    if (type === 'edit' && userData) {
      const userRole = (userData as any)?.role || '';
      // Extract image_id - handle both object and string formats
      const imageId = (userData as any)?.image_id;
      const imageIdValue =
        typeof imageId === 'object' && imageId !== null && imageId._id
          ? imageId._id
          : typeof imageId === 'string'
            ? imageId
            : '';

      // Extract view_type - support both flat and nested API response
      const viewType =
        (userData as any)?.view_type ?? (userData as any)?.data?.view_type;
      const validViewType =
        viewType === 'listView' || viewType === 'detailsView' ? viewType : 'listView';

      const officesRaw = (userData as any)?.offices ?? [];
      const officesIds = Array.isArray(officesRaw)
        ? officesRaw.map((o: { _id?: string } | string) => (typeof o === 'string' ? o : o?._id)).filter(Boolean) as string[]
        : [];
      const primaryRaw = (userData as any)?.primary_office;
      const primaryId =
        primaryRaw === null ? null : typeof primaryRaw === 'string' ? primaryRaw : primaryRaw?._id ?? null;

      const mailServersRaw = (userData as any)?.mail_servers ?? [];
      const mailServerIds = Array.isArray(mailServersRaw)
        ? mailServersRaw.map((ms: { _id?: string } | string) => (typeof ms === 'string' ? ms : ms?._id)).filter(Boolean) as string[]
        : [];

      reset({
        username: userData?.login || '',
        name: userData?.info?.name || '',
        email: userData?.info?.email || '',
        phone: userData?.info?.phone || '',
        role: userRole,
        unmask: userData?.unmask ?? false,
        view_type: validViewType,
        color_code: (userData as any)?.color_code || '',
        image_id: imageIdValue,
        voip_extension: (userData as any)?.voip_extension || '',
        voip_password: (userData as any)?.voip_password || '',
        voip_enabled: (userData as any)?.voip_enabled || false,
        other_platform_credentials: (userData as any)?.other_platform_credentials || [],
        offices: officesIds,
        primary_office: primaryId,
        mail_servers: mailServerIds,
      });
    }
  }, [userData, reset, type]);

  useEffect(() => {
    if (type === 'create' && uniqPassword) {
      setValue('password', uniqPassword);
    }
  }, [uniqPassword, setValue, type]);

  // Display loading state when fetching data in edit mode or roles
  if ((type === 'edit' && isLoading) || rolesLoading) {
    return (
      <FormPreloader
        showTitle={isPage}
        formFields={['Login', 'Name', 'Email', 'Role', 'Chapcharap', 'Status', 'Action']}
        showButtons={true}
        buttonCount={isPage ? 2 : 1}
        className="p-2"
      />
    );
  }

  const handleNewMailServerCreated = (result: any) => {
    const server = result?.server ?? result?.data ?? result;
    const newId = server?._id ?? server?.id;
    if (newId) {
      const current = watch('mail_servers') ?? [];
      if (!current.includes(newId)) setValue('mail_servers', [...current, newId]);
    }
    queryClient.invalidateQueries({ queryKey: ['mailservers'] });
    queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
    setShowAddMailServerDialog(false);
  };

  return (
    <>
      <Form onSubmit={handleSubmit((data: any) => mutation.mutate(data))} className="space-y-6 text-sm">
        <div className="space-y-4">
          {isPage && (
            <p className="text-sm font-medium">{type === 'create' ? 'Create User' : 'Edit User'}</p>
          )}
          <UserFormFields
            register={register}
            control={control}
            errors={errors}
            isSubmitting={mutation.isPending}
            type={type}
            generatePassword={generatePassword}
            form={form}
            setValue={setValue}
            roleOptions={roleOptions}
            selectedRole={selectedRole}
            officeOptions={officeOptions}
            mailServerOptions={mailServerOptions}
            onAddMailServerRequest={() => setShowAddMailServerDialog(true)}
            addMailServerOptionValue={ADD_MAIL_SERVER_VALUE}
            platformFields={platformFields}
            appendPlatform={appendPlatform}
            removePlatform={removePlatform}
            userId={id}
          />
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="secondary" onClick={onClose} size="sm">
            Close
          </Button>
          <Button
            type="submit"
            variant="solid"
            size="sm"
            loading={mutation.isPending}
            icon={<ApolloIcon name={type === 'create' ? 'user-plus' : 'file'} className="text-md" />}
          >
            {type === 'create' ? 'Create User' : 'Update User'}
          </Button>
        </div>
      </Form>

      {showAddMailServerDialog && (
        <Dialog
          isOpen={showAddMailServerDialog}
          onClose={() => setShowAddMailServerDialog(false)}
          width={640}
          contentClassName="flex h-[85vh] max-h-[85vh] min-h-0 flex-col overflow-hidden p-4"
        >
          <MailServerFormWrapperComponent
            type="create"
            isPage={false}
            title="Add Mail Server"
            onSuccess={handleNewMailServerCreated}
            onClose={() => setShowAddMailServerDialog(false)}
            hideProjectAssignments
          />
        </Dialog>
      )}
    </>
  );
};

export default UserFormWrapperComponent;
