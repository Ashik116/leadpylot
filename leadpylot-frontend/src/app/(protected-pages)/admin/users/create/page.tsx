'use client';

import PasswordInput from '@/components/shared/PasswordInput';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Select from '@/components/ui/Select';
import toast from '@/components/ui/toast';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { apiCreateUser } from '@/services/UsersService';
import useClipboard from '@/utils/hooks/useClipboard';
import useGeneratePassword from '@/utils/hooks/useGeneratePassword';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';

const platformCredentialSchema = z.object({
  userName: z.string().optional(),
  userEmail: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'Invalid email address',
    }),
  userPass: z.string().optional(),
  link: z
    .string()
    .optional()
    .refine((val) => !val || z.string().url().safeParse(val).success, {
      message: 'Invalid URL',
    }),
  platform_name: z.string().optional(),
});

const userSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, {
      message: 'Password must be at least 8 characters long',
    })
    .max(18, {
      message: 'Password cannot exceed 18 characters',
    })
    .trim(),
  role: z.nativeEnum(Role).refine((val) => val !== undefined, {
    message: 'Please select a role',
  }),
  accounting: z.string().optional(),
  bank: z.string().optional(),
  dashboard: z.string().optional(),
  administration: z.string().optional(),
  other_platform_credentials: z.array(platformCredentialSchema).optional(),
});

type UserFormData = z.infer<typeof userSchema>;
type PlatformCredential = z.infer<typeof platformCredentialSchema>;

function CreateUserPage() {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const { uniqPassword, generatePassword } = useGeneratePassword();
  const { copied, copyToClipboard } = useClipboard();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    watch,
    control,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      other_platform_credentials: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'other_platform_credentials',
  });

  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => {
      // Transform username to login for the API and structure the request properly
      const createUserRequest = {
        login: data?.username,
        password: data?.password,
        role: data?.role,
        info: {
          name: data?.name,
          email: data?.email,
          phone: data?.phone || null,
        },
        // Include optional fields if provided
        ...(data?.accounting ? { accounting: data?.accounting } : {}),
        ...(data?.bank ? { bank: data?.bank } : {}),
        ...(data?.dashboard ? { dashboard: data?.dashboard } : {}),
        ...(data?.administration ? { administration: data?.administration } : {}),
        // Include platform credentials if provided
        ...(data?.other_platform_credentials &&
        data?.other_platform_credentials.length > 0
          ? {
              other_platform_credentials: data.other_platform_credentials.filter(
                (cred) =>
                  cred.userName || cred.userEmail || cred.userPass || cred.link || cred.platform_name
              ),
            }
          : {}),
      };

      return apiCreateUser(createUserRequest);
    },
    onSuccess: () => {
      toast.push(
        <Notification title="User created" type="success">
          User created successfully
        </Notification>
      );
      router.push('/admin/users');
    },
    onError: (error: any) => {
      // Log error and show notification
      toast.push(
        <Notification title="User creation failed" type="danger">
          {error?.response?.data?.message || 'Failed to create user. Please try again.'}
        </Notification>
      );
    },
  });

  useEffect(() => {
    if (uniqPassword) {
      setValue('password', uniqPassword);
    }
    // Set default role to Agent if not already set
    if (!getValues('role')) {
      setValue('role', Role.AGENT);
    }
  }, [uniqPassword, setValue, getValues]);

  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };
  watch();
  return (
    <Card className="border-none px-4 text-sm">
      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <div>
            <h1 className="text-sm">Create User</h1>
            <p>Add a new user to the system</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Username</label>
              <Input
                {...register('username')}
                placeholder="johndoe"
                invalid={!!errors.username}
                className="w-full"
              />
              {errors.username && (
                <span className="text-sm text-red-500">{errors.username.message}</span>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input
                {...register('name')}
                placeholder="John Doe"
                invalid={!!errors.name}
                className="w-full"
              />
              {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Email Address</label>
              <Input
                {...register('email')}
                type="email"
                placeholder="john@doe.com"
                invalid={!!errors.email}
                className="w-full"
              />
              {errors.email && <span className="text-sm text-red-500">{errors.email.message}</span>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Phone Number (Optional)</label>
              <Input
                {...register('phone')}
                type="tel"
                placeholder="+1 (555) 123-4567"
                invalid={!!errors.phone}
                className="w-full"
              />
              {errors.phone && <span className="text-sm text-red-500">{errors.phone.message}</span>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Role</label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    id="role"
                    placeholder="Select a role"
                    invalid={!!errors.role}
                    className="w-full"
                    options={Object?.values(Role)?.map((role) => ({ value: role, label: role }))}
                    value={field?.value ? { value: field?.value, label: field?.value } : null}
                    onChange={(selectedOption: any) => {
                      field?.onChange(selectedOption ? selectedOption?.value : undefined);
                    }}
                  />
                )}
              />
              {errors.role && <span className="text-sm text-red-500">{errors.role.message}</span>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <div className="flex items-center gap-2">
                <PasswordInput
                  {...register('password')}
                  type="password"
                  placeholder="Password"
                  invalid={!!errors.password}
                  className="w-full"
                />
                <Button
                  variant="default"
                  size="md"
                  className="shrink-0"
                  type="button"
                  onClick={() => generatePassword()}
                  title="Generate Password"
                >
                  <ApolloIcon name="rotate-right" className="text-md" />
                </Button>
                <Button
                  variant="default"
                  size="md"
                  className="shrink-0"
                  type="button"
                  disabled={!getValues().password}
                  onClick={() => {
                    copyToClipboard(getValues('password'));
                  }}
                  title={copied ? 'Copied!' : 'Copy Password'}
                >
                  {copied ? (
                    <ApolloIcon name="check" className="text-lg" />
                  ) : (
                    <ApolloIcon name="copy" className="text-lg" />
                  )}
                </Button>
              </div>
              {errors?.password && (
                <span className="text-sm text-red-500">{errors.password.message}</span>
              )}
              {getValues('password') && (
                <div className="mt-1 text-xs">
                  {getValues('password')?.length < 8 && (
                    <p className="text-rust">• Password must be at least 8 characters long</p>
                  )}
                  {getValues('password')?.length > 18 && (
                    <p className="text-rust">• Password cannot exceed 18 characters</p>
                  )}
                  <p className="text-sand-2 mt-1">
                    Password strength:{' '}
                    {getValues('password')?.length >= 12 ? (
                      <span className="text-evergreen">Strong</span>
                    ) : (
                      <span className="text-ember">Medium</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Platform Credentials Section */}
          <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">Other Platform Credentials</h2>
                <p className="text-xs text-gray-500">Add credentials for external platforms (optional)</p>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                icon={<ApolloIcon name="plus" className="text-md" />}
                onClick={() =>
                  append({
                    userName: '',
                    userEmail: '',
                    userPass: '',
                    link: '',
                    platform_name: '',
                  })
                }
              >
                Add Platform
              </Button>
            </div>

            {fields.length > 0 && (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium">
                        Platform {index + 1}
                      </h3>
                      <Button
                        type="button"
                        variant="plain"
                        size="sm"
                        icon={<ApolloIcon name="trash" className="text-md" />}
                        onClick={() => remove(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium">
                          Platform Name
                        </label>
                        <Input
                          {...register(`other_platform_credentials.${index}.platform_name`)}
                          placeholder="e.g., Salesforce, HubSpot"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Username</label>
                        <Input
                          {...register(`other_platform_credentials.${index}.userName`)}
                          placeholder="Platform username"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Email</label>
                        <Input
                          {...register(`other_platform_credentials.${index}.userEmail`)}
                          type="email"
                          placeholder="Platform email"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Password</label>
                        <PasswordInput
                          {...register(`other_platform_credentials.${index}.userPass`)}
                          placeholder="Platform password"
                          className="w-full"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-medium">Link/URL</label>
                        <Input
                          {...register(`other_platform_credentials.${index}.link`)}
                          type="url"
                          placeholder="https://platform.example.com"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="plain"
            size="sm"
            className="mr-2"
            onClick={() => router.push('/admin/users')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="solid"
            size="sm"
            icon={<ApolloIcon name="user-plus" className="text-lg" />}
            loading={createUserMutation.isPending}
          >
            {createUserMutation.isPending ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </Form>
    </Card>
  );
}

export default CreateUserPage;
