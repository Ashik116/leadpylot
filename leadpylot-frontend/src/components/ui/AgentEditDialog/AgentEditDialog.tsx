import ApiService from '@/services/ApiService';
import type { Agent } from '@/services/ProjectsService';
import { toastWithAxiosError } from '@/utils/toastWithAxiosError';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ApolloIcon from '../ApolloIcon';
import { Button } from '../Button';
import Dialog from '../Dialog';
import { Form, FormItem } from '../Form';
import Input from '../Input';
import Notification from '../Notification';
import toast from '../toast';
import ImageUploader from '../Upload/ImageUploader';

export const agentEditSchema = z.object({
  alias_name: z.string().optional(),
  email_address: z.string().email('Invalid email address').or(z.literal('')),
  email_password: z.string().optional(),
  alias_phone_number: z.string().optional(),
  voip_username: z.string().optional(),
  voip_password: z.string().optional(),
  attachment: z.any().optional(),
});

export type AgentEditFormData = z.infer<typeof agentEditSchema>;

export interface AgentEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  projectId: string;
  setSelectedAgent: (agent: Agent | null) => void;
}

const AgentEditDialog = ({
  isOpen,
  onClose,
  agent,
  projectId,
  setSelectedAgent,
}: AgentEditDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<AgentEditFormData>({
    resolver: zodResolver(agentEditSchema),
    values: {
      alias_name: agent.alias_name || agent.user?.name || '',
      email_address: agent.email_address || '',
      email_password: '',
      alias_phone_number: agent.alias_phone_number || '',
      voip_username: agent.voip_username || '',
      voip_password: '',
      attachment: null, // Initialize attachment as null
    },
  });

  const updateAgent = useMutation({
    mutationFn: (data: AgentEditFormData) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // For file input (attachment), handle FileList or File
          if (key === 'attachment') {
            if (value instanceof FileList && value.length > 0) {
              formData.append(key, value[0]);
            } else if (value instanceof File) {
              formData.append(key, value);
            }
          } else {
            formData.append(key, value as string | Blob);
          }
        }
      });
      return ApiService.fetchDataWithAxios({
        url: `/projects/${projectId}/agents/${agent._id}`,
        method: 'put',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.push(
        <Notification title="Agent updated" type="success">
          Agent updated successfully
        </Notification>
      );
      setIsEditing(false);
      setSelectedAgent(data as Agent);
      onClose();
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
        url: `/projects/${projectId}/agents/${agent._id}`,
        method: 'delete',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.push(
        <Notification title="Agent removed" type="success">
          Agent removed successfully
        </Notification>
      );
      onClose();
      setIsDeleteConfirmOpen(false);
      setSelectedAgent(null);
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
    console.log('Submitting agent data:', data);
    updateAgent.mutate(data);
  };

  const handleDelete = () => {
    deleteAgent.mutate();
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    reset();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={600}>
      <h4 className="mb-6">Agent Details</h4>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <FormItem
            label="Alias Name"
            invalid={Boolean(errors.alias_name)}
            errorMessage={errors.alias_name?.message}
            className="md:col-span-2"
          >
            <Input
              {...register('alias_name')}
              disabled={!isEditing}
              placeholder="Sales Representative"
            />
          </FormItem>

          <FormItem
            label="Email Address"
            invalid={Boolean(errors.email_address)}
            errorMessage={errors.email_address?.message}
          >
            <Input
              {...register('email_address')}
              disabled={!isEditing}
              placeholder="agent@company.com"
            />
          </FormItem>

          <FormItem
            label="Email Password"
            invalid={Boolean(errors.email_password)}
            errorMessage={errors.email_password?.message}
          >
            <Input
              {...register('email_password')}
              type="password"
              disabled={!isEditing}
              placeholder="••••••••"
            />
          </FormItem>

          <FormItem
            label="VOIP Username"
            invalid={Boolean(errors.voip_username)}
            errorMessage={errors.voip_username?.message}
          >
            <Input {...register('voip_username')} disabled={!isEditing} placeholder="agent.sales" />
          </FormItem>

          <FormItem
            label="VOIP Password"
            invalid={Boolean(errors.voip_password)}
            errorMessage={errors.voip_password?.message}
          >
            <Input
              {...register('voip_password')}
              type="password"
              disabled={!isEditing}
              placeholder="••••••••"
            />
          </FormItem>

          <FormItem
            label="Phone Number"
            invalid={Boolean(errors.alias_phone_number)}
            errorMessage={errors.alias_phone_number?.message}
          >
            <Input
              {...register('alias_phone_number')}
              disabled={!isEditing}
              placeholder="+1234567890"
              type="number"
            />
          </FormItem>

          <FormItem label="Image Signature" className="md:col-span-2">
            <ImageUploader
              attachmentId={agent?.attachment?._id}
              name="attachment"
              setValue={setValue}
              disabled={!isEditing}
            />
          </FormItem>
        </div>

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
              Delete
            </Button>
          )}
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
    </Dialog>
  );
};

export default AgentEditDialog;
