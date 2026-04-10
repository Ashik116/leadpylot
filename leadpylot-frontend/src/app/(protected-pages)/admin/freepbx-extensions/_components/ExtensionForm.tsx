'use client';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { useCreateExtension, useUpdateExtension } from '@/services/hooks/useFreePBXExtensions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Checkbox from '@/components/ui/Checkbox';
import Tabs from '@/components/ui/Tabs';
import type { ExtensionDetails } from '@/services/FreePBXExtensionService';

const ExtensionSchema = z.object({
  extension: z
    .string()
    .min(3, 'Extension must be at least 3 digits')
    .max(5, 'Extension must be at most 5 digits')
    .regex(/^[0-9]+$/, 'Extension must contain only numbers'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  outboundCID: z
    .string()
    .max(20, 'Outbound Caller ID must not exceed 20 characters')
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'agent']),
  features: z.object({
    voicemail: z.boolean().optional(),
    callRecording: z.boolean().optional(),
    callWaiting: z.boolean().optional(),
    callForwarding: z.boolean().optional(),
    findMeFollowMe: z.boolean().optional(),
    doNotDisturb: z.boolean().optional(),
  }).optional(),
});

type ExtensionForm = z.infer<typeof ExtensionSchema>;

interface ExtensionFormProps {
  onSuccess?: (data: any) => void;
  onClose?: () => void;
  isPage?: boolean;
  mode?: 'create' | 'edit';
  initialData?: ExtensionDetails;
}

const ExtensionFormComponent = ({
  onSuccess,
  onClose,
  isPage = true,
  mode = 'create',
  initialData
}: ExtensionFormProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const createExtensionMutation = useCreateExtension();
  const updateExtensionMutation = useUpdateExtension();

  const isEditMode = mode === 'edit';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<ExtensionForm>({
    resolver: zodResolver(ExtensionSchema),
    defaultValues: {
      extension: '',
      name: '',
      outboundCID: '',
      role: 'agent',
      features: {
        voicemail: false,
        callRecording: false,
        callWaiting: true,
        callForwarding: true,
        findMeFollowMe: false,
        doNotDisturb: false,
      },
    },
  });

  // Load initial data in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      setValue('extension', initialData.extension.extension);
      setValue('name', initialData.extension.name);
      setValue('outboundCID', initialData.extension.outboundcid);
      setValue('role', initialData.extension.role);
      setValue('features.voicemail', initialData.features.voicemail || false);
      setValue('features.callRecording', initialData.features.callRecording || false);
    }
  }, [isEditMode, initialData, setValue]);

  const onSubmit = async (data: ExtensionForm) => {
    if (submitting) return;

    setSubmitting(true);

    try {
      if (isEditMode && initialData) {
        // Update existing extension
        const result = await updateExtensionMutation.mutateAsync({
          extension: initialData.extension.extension,
          data: {
            name: data.name,
            outboundCID: data.outboundCID,
            role: data.role,
            features: data.features,
          },
        });

        // Call success callback
        if (onSuccess) {
          onSuccess(result);
        }

        // Close sidebar
        onClose?.();
      } else {
        // Create new extension
        const result = await createExtensionMutation.mutateAsync(data);

        // Show password modal
        setGeneratedPassword(result.data.secret);
        setShowPasswordModal(true);

        // Reset form after successful creation
        reset();

        // Call success callback
        if (onSuccess) {
          onSuccess(result);
        }
      }
    } catch {
      // Error is already handled by the mutation hook
      setSubmitting(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setGeneratedPassword('');

    // Close sidebar if it's in page mode
    if (isPage) {
      onClose?.();
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
  };

  const copySecret = () => {
    if (initialData?.secret) {
      navigator.clipboard.writeText(initialData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 1000);
    }
  };

  return (
    <>
      <Card className='border-none mx-0 p-0 inset-0'>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          {isPage && (
            <div className="flex items-center justify-between">
              <p className="capitalize text-base font-medium">{isEditMode ? 'Edit Extension' : 'Create Extension'}</p>
              <Button
                variant="secondary"
                onClick={onClose}
                size="sm"
                icon={<ApolloIcon name="times" className="text-md" />}
              />
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.TabList className="border-b border-gray-200 mb-4">
              <Tabs.TabNav value="basic">
                <span>Basic</span>
              </Tabs.TabNav>
              <Tabs.TabNav value="details">
                <span>Detailed</span>
              </Tabs.TabNav>
            </Tabs.TabList>

            {/* Basic Tab Content */}
            <Tabs.TabContent value="basic">
              <div className="space-y-4">

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Extension Number <span className="text-rust">*</span>
                  </label>
                  <Input
                    {...register('extension')}
                    placeholder="e.g., 1005"
                    invalid={!!errors.extension}
                    disabled={submitting || isEditMode}
                  />
                  {errors.extension && (
                    <span className="text-rust text-sm">{errors.extension.message}</span>
                  )}
                  <span className="text-xs text-gray-500 mt-1 block">
                    {isEditMode ? 'Extension number cannot be changed' : '3-5 digit extension number'}
                  </span>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Full Name <span className="text-rust">*</span>
                  </label>
                  <Input
                    {...register('name')}
                    placeholder="e.g., John Doe"
                    invalid={!!errors.name}
                    disabled={submitting}
                  />
                  {errors.name && <span className="text-rust text-sm">{errors.name.message}</span>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Outbound Caller ID
                  </label>
                  <Input
                    {...register('outboundCID')}
                    placeholder="e.g., 004921196294880"
                    invalid={!!errors.outboundCID}
                    disabled={submitting}
                  />
                  {errors.outboundCID && (
                    <span className="text-rust text-sm">{errors.outboundCID.message}</span>
                  )}
                  <span className="text-xs text-gray-500 mt-1 block">
                    Optional — CID is set per project for outbound calls
                  </span>
                </div>

                {/* Show Secret in Edit Mode */}
                {isEditMode && initialData?.secret && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Secret
                    </label>
                    <div className="relative">
                      <div
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-pointer relative overflow-hidden"
                        onClick={() => setSecretVisible(!secretVisible)}
                        title="Click to reveal password"
                      >
                        <span
                          className={`font-mono text-sm transition-all duration-300 ${secretVisible ? 'blur-none' : 'blur-sm select-none'
                            }`}
                        >
                          {initialData.secret}
                        </span>
                      </div>
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="plain"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSecretVisible(!secretVisible);
                          }}
                          title={secretVisible ? 'Hide password' : 'Show password'}
                        >

                        </Button>
                        <Button
                          type="button"
                          variant="plain"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            copySecret();
                          }}
                          icon={
                            <ApolloIcon
                              name={secretCopied ? 'check' : 'copy'}
                              className="text-sm"
                            />
                          }
                          title="Copy password"
                          className={secretCopied ? 'text-emerald-6' : ''}
                        />
                      </div>
                    </div>

                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Role <span className="text-rust">*</span>
                  </label>
                  <select
                    {...register('role')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-5"
                    disabled={submitting}
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                  <span className="text-xs text-gray-500 mt-1 block">
                    Admin: Full system access | Agent: Basic calling only
                  </span>
                </div>
              </div>
            </Tabs.TabContent>

            {/* Details Tab Content */}
            <Tabs.TabContent value="details">
              <div className="space-y-4">
                {/* All Basic Information fields repeated */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Extension Number <span className="text-rust">*</span>
                  </label>
                  <Input
                    {...register('extension')}
                    placeholder="e.g., 1005"
                    invalid={!!errors.extension}
                    disabled={submitting || isEditMode}
                  />
                  {errors.extension && (
                    <span className="text-rust text-sm">{errors.extension.message}</span>
                  )}
                  <span className="text-xs text-gray-500 mt-1 block">
                    {isEditMode ? 'Extension number cannot be changed' : '3-5 digit extension number'}
                  </span>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Full Name <span className="text-rust">*</span>
                  </label>
                  <Input
                    {...register('name')}
                    placeholder="e.g., John Doe"
                    invalid={!!errors.name}
                    disabled={submitting}
                  />
                  {errors.name && <span className="text-rust text-sm">{errors.name.message}</span>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Outbound Caller ID
                  </label>
                  <Input
                    {...register('outboundCID')}
                    placeholder="e.g., 004921196294880"
                    invalid={!!errors.outboundCID}
                    disabled={submitting}
                  />
                  {errors.outboundCID && (
                    <span className="text-rust text-sm">{errors.outboundCID.message}</span>
                  )}
                  <span className="text-xs text-gray-500 mt-1 block">
                    Optional — CID is set per project for outbound calls
                  </span>
                </div>

                {/* Show Secret in Edit Mode */}
                {isEditMode && initialData?.secret && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Secret
                    </label>
                    <div className="relative">
                      <div
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-pointer relative overflow-hidden"
                        onClick={() => setSecretVisible(!secretVisible)}
                        title="Click to reveal password"
                      >
                        <span
                          className={`font-mono text-sm transition-all duration-300 ${secretVisible ? 'blur-none' : 'blur-sm select-none'
                            }`}
                        >
                          {initialData.secret}
                        </span>
                      </div>
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="plain"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSecretVisible(!secretVisible);
                          }}
                          title={secretVisible ? 'Hide password' : 'Show password'}
                        >
                        </Button>
                        <Button
                          type="button"
                          variant="plain"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            copySecret();
                          }}
                          icon={
                            <ApolloIcon
                              name={secretCopied ? 'check' : 'copy'}
                              className="text-sm"
                            />
                          }
                          title="Copy password"
                          className={secretCopied ? 'text-emerald-6' : ''}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Role <span className="text-rust">*</span>
                  </label>
                  <select
                    {...register('role')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-5"
                    disabled={submitting}
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                  <span className="text-xs text-gray-500 mt-1 block">
                    Admin: Full system access | Agent: Basic calling only
                  </span>
                </div>

                {/* Features */}
                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                    Features (Optional)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Controller
                      name="features.voicemail"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={field.value}
                            onChange={(checked) => field.onChange(checked)}
                            disabled={submitting}
                          />
                          <span className="text-sm">Voicemail</span>
                        </label>
                      )}
                    />

                    <Controller
                      name="features.callRecording"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={field.value}
                            onChange={(checked) => field.onChange(checked)}
                            disabled={submitting}
                          />
                          <span className="text-sm">Call Recording</span>
                        </label>
                      )}
                    />

                    <Controller
                      name="features.callWaiting"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={field.value}
                            onChange={(checked) => field.onChange(checked)}
                            disabled={submitting}
                          />
                          <span className="text-sm">Call Waiting</span>
                        </label>
                      )}
                    />

                    <Controller
                      name="features.callForwarding"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={field.value}
                            onChange={(checked) => field.onChange(checked)}
                            disabled={submitting}
                          />
                          <span className="text-sm">Call Forwarding</span>
                        </label>
                      )}
                    />

                    <Controller
                      name="features.findMeFollowMe"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={field.value}
                            onChange={(checked) => field.onChange(checked)}
                            disabled={submitting}
                          />
                          <span className="text-sm">Find Me / Follow Me</span>
                        </label>
                      )}
                    />

                    <Controller
                      name="features.doNotDisturb"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={field.value}
                            onChange={(checked) => field.onChange(checked)}
                            disabled={submitting}
                          />
                          <span className="text-sm">Do Not Disturb</span>
                        </label>
                      )}
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-ocean-9 p-3 rounded-md border border-ocean-3 mt-4">
                  <p className="text-sm text-ocean-1 font-medium mb-2">
                    <ApolloIcon name="info-circle" className="mr-2" />
                    Configuration Details
                  </p>
                  <ul className="text-xs text-ocean-2 space-y-1 ml-6 list-disc">
                    <li>Extension will be created with 50 SIP settings</li>
                    <li>WebRTC enabled by default (browser-based calling)</li>
                    <li>Codecs: ulaw, alaw, opus (optimal for web)</li>
                    <li>Secure: DTLS encryption, ICE support</li>
                    <li>FreePBX will be automatically reloaded (~15-20 seconds)</li>
                    <li>Password will be generated and shown only once</li>
                  </ul>
                </div>
              </div>
            </Tabs.TabContent>
          </Tabs>

          <div className="flex justify-end space-x-3">
            {isPage && (
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              variant="solid"
              icon={<ApolloIcon name={isEditMode ? 'check' : 'plus'} className="text-md" />}
              loading={submitting || createExtensionMutation.isPending || updateExtensionMutation.isPending}
            >
              {isEditMode ? 'Update Extension' : 'Create Extension'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-emerald-600">
                  <ApolloIcon name="check-circle" className="mr-2" />
                  Extension Created Successfully!
                </h2>
              </div>

              <div className="bg-amber-9 border border-amber-3 rounded-md p-4">
                <p className="text-sm font-semibold text-amber-1 mb-2">
                  ⚠️ IMPORTANT: Save This Password
                </p>
                <p className="text-xs text-amber-2 mb-3">
                  This password will only be shown once. Copy it now!
                </p>

                <div className="bg-white p-3 rounded border border-amber-3 flex items-center justify-between">
                  <code className="text-sm font-mono text-gray-800 break-all">
                    {generatedPassword}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={copyPassword}
                    icon={<ApolloIcon name="copy" className="text-md" />}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <Button
                variant="solid"
                className="w-full"
                onClick={closePasswordModal}
              >
                I&apos;ve Saved The Password
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default ExtensionFormComponent;

