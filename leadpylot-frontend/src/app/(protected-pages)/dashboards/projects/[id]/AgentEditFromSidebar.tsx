'use client';

import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Form from '@/components/ui/Form/Form';
import FormItem from '@/components/ui/Form/FormItem';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import toast from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import ImageUploader from '@/components/ui/Upload/ImageUploader';
import ApiService from '@/services/ApiService';
import type { Agent, AgentEmailSignature } from '@/services/ProjectsService';
import { useCloudinaryUploadSingle } from '@/services/hooks/useDynamicFileUpload';
import { useSettings } from '@/services/hooks/useSettings';
import { toastWithAxiosError } from '@/utils/toastWithAxiosError';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import MailServerFormWrapperComponent from '../../../admin/mailservers/_components/MailServerFormWrapperComponent';

const ADD_NEW_VALUE = '__add_new__';

export const agentEditSchema = z.object({
  alias_name: z.string().optional(),
  alias_phone_number: z.string().optional(),
  voip_username: z.string().optional(),
  voip_password: z.string().optional(),
  mailserver_id: z
    .object({ label: z.string(), value: z.string() })
    .nullable()
    .optional(),
  attachment: z.any().optional(),
  email_signature: z.string().optional(),
});

export type AgentEditFormData = z.infer<typeof agentEditSchema>;

export interface AgentEditDialogProps {
  agent: Agent;
  projectId: string;
  setSelectedAgent: (agent: Agent | null) => void;
  setShowSidebar?: (show: boolean) => void;
  setSidebarVisible?: (visible: boolean) => void;
  onClose?: () => void;
}

const AgentEditFromSidebar = ({
  agent,
  projectId,
  setSelectedAgent,
  setShowSidebar,
  setSidebarVisible,
  onClose,
}: AgentEditDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [showVoipPassword, setShowVoipPassword] = useState(false);
  const [showAddMailServer, setShowAddMailServer] = useState(false);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const cloudinaryUpload = useCloudinaryUploadSingle({
    showNotifications: false,
    onError: (error) => {
      toast.push(
        <Notification title="Upload failed" type="danger">
          {error?.response?.data?.message || error?.message || 'Failed to upload image'}
        </Notification>
      );
    },
  });

  // Fetch available mail servers
  const { data: mailServersData } = useSettings('mailservers');

  const mailServerOptions = useMemo(() => {
    const servers = mailServersData?.data || [];
    const options = servers.map((ms: any) => ({
      label: typeof ms.name === 'string' ? ms.name : ms.name?.en_US || '',
      value: ms._id,
    }));
    return [...options, { label: '+ Add New Mail Server', value: ADD_NEW_VALUE }];
  }, [mailServersData]);

  const getAgentMailserverOption = () => {
    // Prefer mailserver_id field if present
    if (agent?.mailserver_id) {
      if (typeof agent.mailserver_id === 'object' && agent.mailserver_id !== null) {
        return {
          label: (agent.mailserver_id as { _id: string; name: string }).name || '',
          value: (agent.mailserver_id as { _id: string; name: string })._id || '',
        };
      }
      const found = mailServerOptions.find(
        (opt: any) => opt.value === agent.mailserver_id && opt.value !== ADD_NEW_VALUE
      );
      return found || null;
    }
    // Fall back to mailservers array (first entry)
    const firstMailserver = agent?.mailservers?.[0];
    if (firstMailserver) {
      return {
        label: firstMailserver.name || '',
        value: firstMailserver._id || '',
      };
    }
    return null;
  };

  const existingSignatureUrl = (() => {
    const sig = agent?.email_signature;
    if (sig && typeof sig === 'object') return (sig as AgentEmailSignature).public_url ?? null;
    return null;
  })();

  const existingSignatureId = (() => {
    const sig = agent?.email_signature;
    if (sig && typeof sig === 'object') return (sig as AgentEmailSignature)._id;
    if (typeof sig === 'string') return sig;
    return undefined;
  })();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue: setFormValue,
  } = useForm<AgentEditFormData>({
    resolver: zodResolver(agentEditSchema),
    values: {
      alias_name: agent?.alias_name || agent?.user?.name || '',
      alias_phone_number: agent?.alias_phone_number || '',
      voip_username: agent?.voip_username || '',
      voip_password: '',
      mailserver_id: getAgentMailserverOption(),
      attachment: null,
      email_signature: existingSignatureId || '',
    },
  });

  // Clear upload preview when agent changes
  useEffect(() => {
    setSignaturePreviewUrl(null);
  }, [agent?._id, agent?.email_signature]);

  const updateAgent = useMutation({
    mutationFn: (data: AgentEditFormData) => {
      const formData = new FormData();
      Object?.entries(data)?.forEach(([key, value]) => {
        if (key === 'mailserver_id') {
          const msId = value && typeof value === 'object' ? (value as any).value : value;
          if (msId && msId !== ADD_NEW_VALUE) {
            formData.append('mailserver_id', msId);
          }
        } else if (key === 'attachment') {
          // Skip — image signature handled via Cloudinary URL
        } else if (key === 'email_signature') {
          if (value !== undefined && value !== null && value !== '') {
            formData.append('email_signature', value as string);
          }
        } else if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value as string | Blob);
        }
      });
      return ApiService.fetchDataWithAxios({
        url: `/projects/${projectId}/agents/${agent?._id}`,
        method: 'put',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
      queryClient.invalidateQueries({ queryKey: ['mailservers'] });
      reset();
      onClose?.();
      toast.push(
        <Notification title="Agent updated" type="success">
          Agent updated successfully
        </Notification>
      );
      setIsEditing(false);
      setSignaturePreviewUrl(null);
      setSelectedAgent(data as Agent);
    },
    onError: (error) => {
      const { message } = toastWithAxiosError(error);
      toast.push(
        <Notification title="Update failed" type="danger">
          {message}
        </Notification>
      );
    },
  });

  const deleteAgent = useMutation({
    mutationFn: () =>
      ApiService.fetchDataWithAxios({
        url: `/projects/${projectId}/agents/${agent?._id}`,
        method: 'delete',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
      queryClient.invalidateQueries({ queryKey: ['mailservers'] });
      toast.push(
        <Notification title="Agent removed" type="success">
          Agent removed successfully
        </Notification>
      );
      setIsDeleteConfirmOpen(false);
      setSelectedAgent(null);
      if (setShowSidebar) setShowSidebar(false);
      if (setSidebarVisible) setSidebarVisible(false);
    },
    onError: (error) => {
      const { message } = toastWithAxiosError(error);
      toast.push(
        <Notification title="Delete failed" type="danger">
          {message}
        </Notification>
      );
    },
  });

  const onSubmit = (data: AgentEditFormData) => {
    updateAgent.mutate(data);
  };

  const handleDelete = () => {
    deleteAgent.mutate();
  };

  const handleSignatureUpload = (files: File[]) => {
    if (!files.length) return;
    cloudinaryUpload.mutate(files[0], {
      onSuccess: (result) => {
        if (result?.documentId) {
          setSignaturePreviewUrl(result.public_url);
          setFormValue('email_signature', result.documentId);
        }
      },
    });
  };

  const handleRemoveSignature = () => {
    setSignaturePreviewUrl(null);
    setFormValue('email_signature', '');
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    setShowAddMailServer(false);
    reset();
    if (isEditing) {
      setSignaturePreviewUrl(null);
    }
  };

  const handleMailServerChange = (option: any, fieldOnChange: (val: any) => void) => {
    if (option?.value === ADD_NEW_VALUE) {
      setShowAddMailServer(true);
    } else {
      setShowAddMailServer(false);
      fieldOnChange(option);
    }
  };

  const handleNewMailServerCreated = (result: any) => {
    const newServer = result?.server || result?.data || result;
    if (newServer?._id) {
      const name = typeof newServer.name === 'string' ? newServer.name : newServer.name?.en_US || '';
      setFormValue('mailserver_id', { label: name, value: newServer._id });
    }
    queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
    queryClient.invalidateQueries({ queryKey: ['mailservers'] });
    setShowAddMailServer(false);
  };

  if (showAddMailServer && isEditing) {
    return (
      <div className="pl-2 xl:pl-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold">Register New Mail Server</h4>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowAddMailServer(false)}
            icon={<ApolloIcon name="arrow-left" className="text-sm" />}
          >
            Back
          </Button>
        </div>
        <MailServerFormWrapperComponent
          type="create"
          isPage={false}
          onSuccess={handleNewMailServerCreated}
          onClose={() => setShowAddMailServer(false)}
          hideProjectAssignments
        />
      </div>
    );
  }

  return (
    <div className="pl-2 xl:pl-4">
      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex justify-between">
          <h4 className="mb-6 text-sm">Agent Details</h4>
          <div className="flex justify-end gap-2">
            <Button
              variant={isEditing ? 'default' : 'solid'}
              icon={!isEditing && <ApolloIcon name="pen" />}
              onClick={toggleEditMode}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
            {isEditing ? (
              <Button type="submit" variant="solid" loading={updateAgent.isPending}>
                Save Changes
              </Button>
            ) : (
              <Button
                variant="destructive"
                icon={<ApolloIcon name="trash" />}
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                Delete Agent
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <FormItem
            label="Alias Name"
            invalid={Boolean(errors?.alias_name)}
            errorMessage={errors?.alias_name?.message}
            className="md:col-span-2 text-sm"
          >
            <Input
              {...register('alias_name')}
              disabled={!isEditing}
              placeholder="Sales Representative"
            />
          </FormItem>

          <FormItem
            label="Mail Server"
            invalid={Boolean(errors?.mailserver_id)}
            errorMessage={errors?.mailserver_id?.message as string}
            className="md:col-span-2 text-sm mt-2"
          >
            <Controller
              name="mailserver_id"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={mailServerOptions}
                  isDisabled={!isEditing}
                  isClearable
                  placeholder="Select Mail Server..."
                  noOptionsMessage={() => 'No mail servers available'}
                  value={field.value}
                  onChange={(option: any) => handleMailServerChange(option, field.onChange)}
                  formatOptionLabel={(option: any) =>
                    option.value === ADD_NEW_VALUE ? (
                      <div className="flex items-center text-blue-600 font-medium">
                        <ApolloIcon name="plus" className="mr-2 text-sm" />
                        Add New Mail Server
                      </div>
                    ) : (
                      option.label
                    )
                  }
                />
              )}
            />
          </FormItem>

          <FormItem
            label="VOIP Username"
            invalid={Boolean(errors?.voip_username)}
            errorMessage={errors?.voip_username?.message}
            className="text-sm mt-2"
          >
            <Input {...register('voip_username')} disabled={!isEditing} placeholder="agent.sales" />
          </FormItem>

          <FormItem
            label="VOIP Password"
            invalid={Boolean(errors?.voip_password)}
            errorMessage={errors?.voip_password?.message}
            className="text-sm mt-2"
          >
            <Input
              {...register('voip_password')}
              type={showVoipPassword ? 'text' : 'password'}
              disabled={!isEditing}
              placeholder="••••••••"
              className="text-sm "
              suffix={
                <ApolloIcon
                  name={showVoipPassword ? 'eye-filled' : 'eye-slash'}
                  className="cursor-pointer text-lg transition-colors hover:text-gray-600"
                  onClick={() => setShowVoipPassword(!showVoipPassword)}
                />
              }
            />
          </FormItem>

          <FormItem
            label="Phone Number"
            invalid={Boolean(errors?.alias_phone_number)}
            errorMessage={errors?.alias_phone_number?.message}
            className="text-sm mt-2"
          >
            <Input
              {...register('alias_phone_number')}
              disabled={!isEditing}
              placeholder="+1234567890"
              type="number"
              className="text-sm"
            />
          </FormItem>

          <FormItem label="Image Signature" className="md:col-span-2 text-sm mt-2">
            <div className="relative">
            <ImageUploader
              key={existingSignatureId || 'empty'}
              defaultImageUrl={signaturePreviewUrl || existingSignatureUrl || undefined}
              disabled={!isEditing || cloudinaryUpload.isPending}
              imageSize="object-contain"
              onChange={(fileOrNull) => {
                if (fileOrNull === null) {
                  handleRemoveSignature();
                } else if (fileOrNull instanceof File) {
                  handleSignatureUpload([fileOrNull]);
                }
              }}
            />
              {cloudinaryUpload.isPending && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/50 backdrop-blur-sm">
                  <Spinner size={28} customColorClass="text-white" />
                  <p className="text-xs font-medium text-white">Uploading...</p>
                </div>
              )}
            </div>
          </FormItem>
        </div>
      </Form>

      {isDeleteConfirmOpen && (
        <Dialog isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)}>
          <h6 className="mb-4 text-lg font-semibold">Delete Agent</h6>
          <p className="mb-6">
            Are you sure you want to delete this agent? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="default" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleteAgent.isPending}>
              Delete
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default AgentEditFromSidebar;
