'use client';

import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useDeleteUser, useUpdateUser, useChangeUserPassword } from '@/services/hooks/useUsers';
import { Role } from '@/configs/navigation.config/auth.route.config';
import type { User, OtherPlatformCredential } from '@/services/UsersService';
import { zodResolver } from '@hookform/resolvers/zod';
import PasswordInput from '@/components/shared/PasswordInput';
import { useRouter } from 'next/navigation';
import Switcher from '@/components/ui/Switcher';
import { useState, useEffect } from 'react';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useUsersNavigationStore } from '@/stores/navigationStores';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Card from '@/components/ui/Card';
import AgentProjects from './AgentProjects';
import ProviderSources from './ProviderSources';

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

interface UserFormData {
  login: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  voip_extension?: string;
  voip_password?: string;
  voip_enabled?: boolean;
  other_platform_credentials?: OtherPlatformCredential[];
}

const userSchema = z.object({
  login: z.string().min(1, 'Login is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).refine((val) => val !== undefined, {
    message: 'Please select a role',
  }),
  voip_extension: z.string().optional().or(z.literal('')),
  voip_password: z.string().optional().or(z.literal('')),
  voip_enabled: z.boolean().optional(),
  other_platform_credentials: z.array(platformCredentialSchema).optional(),
});

interface UserDetailsProps {
  user: User;
}

// Password schema for validation
const passwordSchema = z.object({
  newPassword: z.string(),
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export const UserDetails = ({ user }: UserDetailsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const router = useRouter();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser(user._id);
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser(user._id);
  const { mutate: changePassword, isPending: isChangingPassword } = useChangeUserPassword(user._id);

  // Get navigation state and functions from the store
  const getPreviousItem = useUsersNavigationStore((state) => state.getPreviousItem);
  const getNextItem = useUsersNavigationStore((state) => state.getNextItem);
  const getCurrentPosition = useUsersNavigationStore((state) => state.getCurrentPosition);
  const getTotalItems = useUsersNavigationStore((state) => state.getTotalItems);

  // Navigation handlers with fallback for direct page access
  const goToPreviousUser = () => {
    const previousUser = getPreviousItem();
    if (previousUser) {
      router.push(`/admin/users/${previousUser?._id}`);
    } else {
      // Fallback: Navigate to users list if we can't determine previous user
      router.push('/admin/users');
    }
  };

  const goToNextUser = () => {
    const nextUser = getNextItem();
    if (nextUser) {
      router.push(`/admin/users/${nextUser?._id}`);
    } else {
      // Fallback: Navigate to users list if we can't determine next user
      router.push('/admin/users');
    }
  };

  // Get the current position and total users count
  const currentPosition = getCurrentPosition();
  const totalUsers = getTotalItems();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      login: user?.login,
      name: user?.info?.name,
      email: user?.info?.email || undefined,
      phone: user?.info?.phone || undefined,
      role: (user as any)?.role || Role.AGENT,
      voip_extension: (user as any)?.voip_extension || '',
      voip_password: (user as any)?.voip_password || '',
      voip_enabled: (user as any)?.voip_enabled || false,
      other_platform_credentials: (user as any)?.other_platform_credentials || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'other_platform_credentials',
  });

  // Reset form when user data changes
  useEffect(() => {
    reset({
      login: user?.login,
      name: user?.info?.name,
      email: user?.info?.email || undefined,
      phone: user?.info?.phone || undefined,
      role: (user as any)?.role || Role.AGENT,
      voip_extension: (user as any)?.voip_extension || '',
      voip_password: (user as any)?.voip_password || '',
      voip_enabled: (user as any)?.voip_enabled || false,
      other_platform_credentials: (user as any)?.other_platform_credentials || [],
    });
  }, [user, reset]);

  const onSubmit = (data: UserFormData) => {
    // Create a clean update payload with only the necessary fields
    // Cast as any to bypass TypeScript's strict checking since we know what we're sending
    const updatePayload: any = {
      _id: user?._id, // Include the ID for reference
      login: data?.login,
      role: data?.role, // Add role to the update payload
      active: user?.active, // Preserve active status
      info: {
        // Include only the fields we need to update
        name: data?.name,
        email: data?.email || null,
        phone: data?.phone || null,
        // Preserve existing values for fields we're not updating
        lang: user?.info?.lang || '',
      },
      // VoIP fields
      voip_extension: data?.voip_extension || null,
      voip_password: data?.voip_password || null,
      voip_enabled: data?.voip_enabled ?? false,
      // Include platform credentials if provided
      other_platform_credentials:
        data?.other_platform_credentials && data.other_platform_credentials.length > 0
          ? data.other_platform_credentials.filter(
              (cred) =>
                cred.userName || cred.userEmail || cred.userPass || cred.link || cred.platform_name
            )
          : [],
    };

    // Submit the update with the clean payload
    updateUser(updatePayload, {
      onSuccess: () => {
        // Create a complete updated user object for the store
        // This ensures the navigation store has the complete user data
        // Cast as any to bypass TypeScript's strict checking
        const completeUpdatedUser: any = {
          ...user,
          login: updatePayload?.login,
          role: updatePayload?.role, // Update role in the complete user object
          info: {
            ...user?.info,
            name: updatePayload?.info?.name,
            email: updatePayload?.info?.email,
            phone: updatePayload?.info?.phone,
          },
          other_platform_credentials: updatePayload?.other_platform_credentials || [],
        };

        // Update the user in the navigation store
        useUsersNavigationStore.getState().updateItem(completeUpdatedUser);

        setIsEditing(false);
        toast.push(
          <Notification title="User updated" type="success">
            User updated successfully
          </Notification>
        );
      },
      onError: (error: any) => {
        // Show detailed error message if available
        const errorMessage =
          error?.response?.data?.message || 'Failed to update user. Please try again.';
        toast.push(
          <Notification title="Update failed" type="danger">
            {errorMessage}
          </Notification>
        );
      },
    });
  };

  const handleDelete = () => {
    deleteUser(undefined, {
      onSuccess: () => {
        // Remove the user from the navigation store
        useUsersNavigationStore.getState().removeItem(user?._id);

        toast.push(
          <Notification title="User deleted" type="success">
            User deleted successfully
          </Notification>
        );
        router.push('/admin/users');
      },
    });
  };

  // Password change form
  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
    },
  });

  const handlePasswordChange = (data: PasswordFormData) => {
    changePassword(data, {
      onSuccess: () => {
        setIsPasswordDialogOpen(false);
        resetPasswordForm();
        toast.push(
          <Notification title="Password changed" type="success">
            Password changed successfully
          </Notification>
        );
      },
    });
  };

  return (
    <>
      <Card>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1>User Details</h1>
            {/* User position counter */}
            <p className="text-sand-2">
              {currentPosition}/{totalUsers}
            </p>
            {/* Navigation buttons */}
            <div className="flex gap-2">
              <Button
                onClick={goToPreviousUser}
                disabled={currentPosition === 1}
                icon={<ApolloIcon name="arrow-left" className="text-md" />}
              >
                <span>Previous</span>
              </Button>
              <Button
                onClick={goToNextUser}
                disabled={currentPosition === totalUsers}
                icon={<ApolloIcon name="arrow-right" className="text-md" />}
                iconAlignment="end"
              >
                <span>Next</span>
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              icon={<ApolloIcon name="padlock" className="text-md" />}
              onClick={() => setIsPasswordDialogOpen(true)}
            >
              Change Password
            </Button>
            {isEditing ? (
              <Button
                type="button"
                variant="solid"
                icon={<ApolloIcon name="file" className="text-md" />}
                onClick={handleSubmit(onSubmit)}
                loading={isUpdating}
              >
                Save
              </Button>
            ) : (
              <Button
                variant="default"
                icon={<ApolloIcon name="pen" className="text-md" />}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
            <Button
              variant="destructive"
              icon={<ApolloIcon name="trash" className="text-md" />}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>

        <Form
          onSubmit={handleSubmit(onSubmit)}
          containerClassName="grid grid-cols-1 gap-x-8 xl:grid-cols-2"
        >
          <FormItem
            label="Login"
            invalid={Boolean(errors?.login)}
            errorMessage={errors?.login?.message}
          >
            <Controller
              name="login"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  disabled={!isEditing}
                  placeholder="Enter login"
                  className="disabled:opacity-75"
                />
              )}
            />
          </FormItem>

          <FormItem
            label="Name"
            invalid={Boolean(errors?.name)}
            errorMessage={errors?.name?.message}
          >
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  disabled={!isEditing}
                  placeholder="Enter name"
                  className="disabled:opacity-75"
                />
              )}
            />
          </FormItem>

          <FormItem
            label="Email"
            invalid={Boolean(errors?.email)}
            errorMessage={errors?.email?.message}
          >
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="email"
                  disabled={!isEditing}
                  placeholder="Enter email"
                  className="disabled:opacity-75"
                />
              )}
            />
          </FormItem>

          <FormItem
            label="Phone"
            invalid={Boolean(errors?.phone)}
            errorMessage={errors?.phone?.message}
          >
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  disabled={!isEditing}
                  placeholder="Enter phone"
                  className="disabled:opacity-75"
                />
              )}
            />
          </FormItem>

          <FormItem
            label="Role"
            invalid={Boolean(errors?.role)}
            errorMessage={errors?.role?.message}
          >
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  id="role"
                  placeholder="Select a role"
                  invalid={!!errors?.role}
                  className="w-full"
                  options={Object?.values(Role)?.map((role) => ({ value: role, label: role }))}
                  value={field?.value ? { value: field?.value, label: field?.value } : null}
                  onChange={(selectedOption: any) => {
                    field?.onChange(selectedOption ? selectedOption?.value : undefined);
                  }}
                  isDisabled={!isEditing}
                />
              )}
            />
          </FormItem>

          {/* VoIP Settings Section */}
          <div className="xl:col-span-2">
            <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-sm font-medium">VoIP Settings</h2>
                  <p className="text-xs text-gray-500">
                    Assign a single SIP extension for this user
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormItem
                  label="VoIP Extension"
                  invalid={Boolean(errors?.voip_extension)}
                  errorMessage={errors?.voip_extension?.message}
                >
                  <Controller
                    name="voip_extension"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder="e.g. 1001"
                        className="disabled:opacity-75"
                      />
                    )}
                  />
                </FormItem>
                <FormItem
                  label="VoIP Password"
                  invalid={Boolean(errors?.voip_password)}
                  errorMessage={errors?.voip_password?.message}
                >
                  <Controller
                    name="voip_password"
                    control={control}
                    render={({ field }) => (
                      <PasswordInput
                        {...field}
                        disabled={!isEditing}
                        placeholder="SIP password"
                        className="disabled:opacity-75"
                      />
                    )}
                  />
                </FormItem>
                <div className="flex items-end gap-2 pb-1">
                  <span className="text-sm">VoIP Enabled:</span>
                  <Controller
                    name="voip_enabled"
                    control={control}
                    render={({ field }) => (
                      <Switcher
                        checked={field.value || false}
                        onChange={(checked) => field.onChange(checked)}
                        disabled={!isEditing}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Platform Credentials Section */}
          {isEditing && (
            <div className="xl:col-span-2">
              <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-medium">Other Platform Credentials</h2>
                    <p className="text-xs text-gray-500">
                      Add credentials for external platforms (optional)
                    </p>
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
                          <h3 className="text-sm font-medium">Platform {index + 1}</h3>
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
                            <Controller
                              name={`other_platform_credentials.${index}.platform_name`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  placeholder="e.g., Salesforce, HubSpot"
                                  className="w-full"
                                />
                              )}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Username</label>
                            <Controller
                              name={`other_platform_credentials.${index}.userName`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  placeholder="Platform username"
                                  className="w-full"
                                />
                              )}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Email</label>
                            <Controller
                              name={`other_platform_credentials.${index}.userEmail`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="Platform email"
                                  className="w-full"
                                />
                              )}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Password</label>
                            <Controller
                              name={`other_platform_credentials.${index}.userPass`}
                              control={control}
                              render={({ field }) => (
                                <PasswordInput
                                  {...field}
                                  placeholder="Platform password"
                                  className="w-full"
                                />
                              )}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium">Link/URL</label>
                            <Controller
                              name={`other_platform_credentials.${index}.link`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="url"
                                  placeholder="https://platform.example.com"
                                  className="w-full"
                                />
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Display platform credentials in view mode */}
          {!isEditing && (user as any)?.other_platform_credentials?.length > 0 && (
            <div className="xl:col-span-2">
              <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
                <div>
                  <h2 className="text-sm font-medium">Other Platform Credentials</h2>
                  <p className="text-xs text-gray-500">
                    Platform credentials are encrypted and stored securely
                  </p>
                </div>
                <div className="space-y-3">
                  {(user as any).other_platform_credentials.map((cred: OtherPlatformCredential, index: number) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {cred.platform_name && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Platform:</span>
                            <p className="text-sm">{cred.platform_name}</p>
                          </div>
                        )}
                        {cred.userName && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Username:</span>
                            <p className="text-sm">{cred.userName}</p>
                          </div>
                        )}
                        {cred.userEmail && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Email:</span>
                            <p className="text-sm">{cred.userEmail}</p>
                          </div>
                        )}
                        {cred.link && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Link:</span>
                            <p className="text-sm">
                              <a
                                href={cred.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {cred.link}
                              </a>
                            </p>
                          </div>
                        )}
                        {cred.userPass && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Password:</span>
                            <p className="text-sm">••••••••</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="mt-6 flex justify-end xl:col-span-2">
              <Button
                type="submit"
                variant="solid"
                size="sm"
                icon={<ApolloIcon name="file" className="text-md" />}
                loading={isUpdating}
              >
                Save Changes
              </Button>
            </div>
          )}
        </Form>
      </Card>
      {(user as any).role === Role.AGENT && <AgentProjects projects={(user as any).projects} />}
      {(user as any).role === Role.PROVIDER && <ProviderSources sources={(user as any).sources} />}

      <Dialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <h6 className="mb-4 text-lg">Confirm Delete</h6>
        <p>Are you sure you want to delete this user? This action cannot be undone.</p>
        <div className="mt-6 flex gap-2">
          <Button variant="default" onClick={() => setIsDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} loading={isDeleting}>
            Delete
          </Button>
        </div>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog isOpen={isPasswordDialogOpen} onClose={() => setIsPasswordDialogOpen(false)}>
        <h6 className="mb-4 text-lg">Change Password</h6>
        <p className="mb-4">Enter a new password for this user.</p>

        <Form onSubmit={handlePasswordSubmit(handlePasswordChange)}>
          <FormItem
            label="New Password"
            invalid={Boolean(passwordErrors?.newPassword)}
            errorMessage={passwordErrors?.newPassword?.message}
          >
            <Controller
              name="newPassword"
              control={passwordControl}
              render={({ field }) => (
                <Input
                  {...field}
                  type="password"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              )}
            />
          </FormItem>

          <div className="mt-6 flex gap-2">
            <Button variant="default" size="xs" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" size="xs" loading={isChangingPassword}>
              Change Password
            </Button>
          </div>
        </Form>
      </Dialog>
    </>
  );
};
