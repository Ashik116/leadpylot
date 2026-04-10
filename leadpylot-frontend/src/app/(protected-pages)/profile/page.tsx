'use client';

import Avatar from '@/components/ui/Avatar';
import Notification from '@/components/ui/Notification';
import Upload from '@/components/ui/Upload';
import TelegramBotSettings from './_components/TelegramBotSettings';
import toast from '@/components/ui/toast';
import { useSession } from '@/hooks/useSession';
import { apiChangePassword } from '@/services/AuthService';
import { apiUploadLibraryDocuments } from '@/services/DocumentService';
import { apiGetUser, apiUpdateUser } from '@/services/UsersService';
import { useCurrentUserQuery, useInvalidateCurrentUser } from '@/services/hooks/useCurrentUser';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import { useAttachmentPreviewFile } from '@/utils/hooks/useAttachMentPreviewFile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { HiBadgeCheck, HiClock, HiEye, HiEyeOff, HiLockClosed, HiMail, HiOfficeBuilding, HiUser } from 'react-icons/hi';

// Reusable Input Group Component
const InputGroup = ({
  id,
  label,
  type,
  name,
  value,
  onChange,
  placeholder,
  error,
  showPassword,
  onTogglePassword,
  helperText,
}: {
  id: string;
  label: string;
  type: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  error?: string;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  helperText?: string;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        name={name}
        type={onTogglePassword ? (showPassword ? 'text' : 'password') : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${error
          ? 'border-red-300 ring-red-100 focus:border-red-500 focus:ring-red-200'
          : 'border-slate-200 ring-indigo-50 focus:border-indigo-500 focus:ring-indigo-200'
          }`}
      />
      {onTogglePassword && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
        </button>
      )}
    </div>
    {error ? (
      <p className="text-xs font-medium text-red-500">{error}</p>
    ) : helperText ? (
      <p className="text-xs text-slate-500">{helperText}</p>
    ) : null}
  </div>
);

export default function ProfilePage() {
  const { data: session } = useSession();
  const { name, email, role } = session?.user || {};
  const { data: currentUser } = useCurrentUserQuery();
  const queryClient = useQueryClient();
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password state
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Extract data from currentUser
  const officeNames = Array.isArray((currentUser as any)?.office_names)
    ? (currentUser as any).office_names
    : (currentUser as any)?.office_name
      ? [(currentUser as any).office_name]
      : [];

  // Extract image_id from currentUser 
  const imageId = (() => {
    const imageIdValue = (currentUser as any)?.image_id;
    if (!imageIdValue) return undefined;
    if (typeof imageIdValue === 'object' && imageIdValue !== null) {
      return (imageIdValue._id || imageIdValue.id) as string;
    }
    if (typeof imageIdValue === 'string') return imageIdValue;
    return undefined;
  })();

  const { blobUrl: profileImageUrl } = useAttachmentPreviewFile(imageId);

  // Image update mutation
  const updateImageMutation = useMutation({
    mutationFn: async (newImageId: string | null) => {
      if (!currentUser?._id) throw new Error('User ID not found');
      const fullUserData = await apiGetUser(currentUser._id);
      const updatePayload: any = {
        _id: currentUser._id,
        login: fullUserData?.login || currentUser.login,
        role: (fullUserData as any)?.role || currentUser.role,
        active: fullUserData?.active ?? currentUser.active,
        image_id: newImageId || undefined,
        unmask: fullUserData?.unmask,
        view_type: fullUserData?.view_type || currentUser.view_type,
        color_code: fullUserData?.color_code || currentUser.color_code,
        info: fullUserData?.info || {
          name: name || currentUser.login,
          email: email || null,
          phone: null,
          lang: '',
        },
      };
      return apiUpdateUser(currentUser._id, updatePayload);
    },
    onSuccess: () => {
      invalidateCurrentUser();
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.push(
        <Notification title="Success" type="success">
          Profile image updated successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to update profile image';
      toast.push(<Notification title="Error" type="danger">{errorMessage}</Notification>);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!formData.currentPassword) newErrors.currentPassword = 'Current password is required';
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 5) {
      newErrors.newPassword = 'Password must be at least 5 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.confirmPassword !== formData.newPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    return newErrors;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await apiChangePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      toast.push(<Notification title="Success" type="success">Password updated successfully</Notification>);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update password';
      toast.push(<Notification title="Error" type="danger">{errorMessage}</Notification>);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      setIsSubmitting(true);
      const uploadResponse = (await apiUploadLibraryDocuments([file], 'extra')) as any;

      if (uploadResponse?.data?.successful?.[0]?.documentId) {
        const documentId = uploadResponse.data.successful[0].documentId;
        updateImageMutation.mutate(documentId);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to upload image';
      toast.push(<Notification title="Error" type="danger">{errorMessage}</Notification>);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage your profile information and security settings.</p>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left Column: Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative group">
                    {profileImageUrl ? (
                      <Avatar
                        size={100}
                        src={profileImageUrl}
                        alt={name || 'Profile'}
                        shape="circle"
                        className="ring-4 ring-white shadow-lg"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 border-4 border-white text-3xl font-bold text-indigo-600 shadow-lg capitalize">
                        {name?.slice(0, 2) || (currentUser as any)?.login?.slice(0, 2)}
                      </div>
                    )}
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-slate-900">{name || (currentUser as any)?.login}</h2>
                  <div className="mt-1 inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 capitalize">
                    {role || 'User'}
                  </div>

                  <div className="mt-6 w-full space-y-3">
                    <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <HiMail className="h-3.5 w-3.5" />
                        <span>Email</span>
                      </div>
                      <span className="text-xs font-medium text-slate-900 truncate max-w-[140px]">{email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <HiUser className="h-3.5 w-3.5" />
                        <span>Username</span>
                      </div>
                      <span className="text-xs font-medium text-slate-900 capitalize">{(currentUser as any)?.login || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <HiBadgeCheck className="h-3.5 w-3.5" />
                        <span>Account Type</span>
                      </div>
                      <span className="text-xs font-medium text-slate-900 capitalize">{role || 'Standard'}</span>
                    </div>
                    <div className="py-3.5 border-b border-slate-50">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        <HiOfficeBuilding className="h-3.5 w-3.5" />
                        <span>Offices</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {officeNames.length > 0 ? (
                          officeNames.map((office: string, index: number) => (
                            <div
                              key={index}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/60 hover:bg-white hover:border-indigo-300 hover:shadow-sm hover:shadow-indigo-500/5 transition-all duration-200 group cursor-default"
                            >
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40 group-hover:animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                {office}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs font-medium text-slate-400 italic px-1">
                            No active offices
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-2 w-full">
                    <Upload
                      showList={false}
                      onChange={handleFileChange}
                      accept=".png,.jpg,.jpeg"
                    >
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-[0.98]"
                      >
                        Change photo
                      </button>
                    </Upload>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Security & Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Security Section */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <HiLockClosed className="h-5 w-5 text-indigo-500" />
                      <h2 className="text-lg font-bold text-slate-900">Security</h2>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">Update your password to keep your account secure.</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                    <HiClock className="h-3 w-3" />
                    <span>Created {dateFormateUtils(currentUser?.create_date ?? '', DateFormatType.SHOW_DATE)}</span>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5">
                    <InputGroup
                      id="currentPassword"
                      label="Current Password"
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      error={errors.currentPassword}
                      showPassword={showPassword.currentPassword}
                      onTogglePassword={() => setShowPassword(p => ({ ...p, currentPassword: !p.currentPassword }))}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <InputGroup
                        id="newPassword"
                        label="New Password"
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        error={errors.newPassword}
                        showPassword={showPassword.newPassword}
                        onTogglePassword={() => setShowPassword(p => ({ ...p, newPassword: !p.newPassword }))}
                        helperText="Use 5+ characters with a mix of types."
                      />
                      <InputGroup
                        id="confirmPassword"
                        label="Confirm New Password"
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        error={errors.confirmPassword}
                        showPassword={showPassword.confirmPassword}
                        onTogglePassword={() => setShowPassword(p => ({ ...p, confirmPassword: !p.confirmPassword }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                      className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isSubmitting ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* Telegram Bot Settings Section */}
            {currentUser && <TelegramBotSettings user={currentUser as any} />}
          </div>
        </div>
      </div>

    </div>
  );
}

