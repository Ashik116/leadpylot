'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Drawer from '@/components/ui/Drawer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Form, FormItem } from '@/components/ui/Form';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useCreateRole, useUpdateRole, usePermissionTemplates, useCreateRoleFromTemplate } from '@/services/hooks/useRoles';
import { Role } from '@/services/RolesService';
import UserColorPicker from '../UserColorPicker';

interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  color: string;
  templateKey?: string;
}

interface RoleFormSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role: Role | null;
  isCreating: boolean;
}

const RoleFormSidebar = ({
  isOpen,
  onClose,
  onSuccess,
  role,
  isCreating,
}: RoleFormSidebarProps) => {
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const createFromTemplateMutation = useCreateRoleFromTemplate();
  const { data: templates } = usePermissionTemplates();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoleFormData>({
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      color: '#6366f1',
      templateKey: '',
    },
  });

  const selectedTemplate = watch('templateKey');

  useEffect(() => {
    if (isOpen) {
      if (role && !isCreating) {
        reset({
          name: role.name,
          displayName: role.displayName || role.name,
          description: role.description || '',
          color: role.color || '#6366f1',
          templateKey: '',
        });
      } else {
        reset({
          name: '',
          displayName: '',
          description: '',
          color: '#6366f1',
          templateKey: '',
        });
      }
    }
  }, [isOpen, role, isCreating, reset]);

  const onSubmit = async (data: RoleFormData) => {
    try {
      if (isCreating) {
        if (data.templateKey) {
          await createFromTemplateMutation.mutateAsync({
            templateKey: data.templateKey,
            name: data.name,
            displayName: data.displayName || data.name,
          });
        } else {
          await createRoleMutation.mutateAsync({
            name: data.name,
            displayName: data.displayName || data.name,
            description: data.description,
            color: data.color,
            permissions: [],
          });
        }
      } else if (role) {
        await updateRoleMutation.mutateAsync({
          id: role._id,
          data: {
            name: data.name,
            displayName: data.displayName || data.name,
            description: data.description,
            color: data.color,
          },
        });
      }
      onSuccess();
    } catch {
      // Error is handled by mutation
    }
  };

  const isPending =
    createRoleMutation.isPending ||
    updateRoleMutation.isPending ||
    createFromTemplateMutation.isPending;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      onRequestClose={onClose}
      title={isCreating ? 'Create New Role' : `Edit: ${role?.displayName || role?.name}`}
      width={480}
      headerClass="!px-2 !py-2"
      bodyClass="!p-2 !h-auto min-h-0 overflow-y-auto"
      footerClass="!p-2"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="default" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            size="sm"
            className="!text-gray-900 hover:!text-gray-900"
            onClick={handleSubmit(onSubmit)}
            loading={isPending}
          >
            {isCreating ? 'Create Role' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <Form onSubmit={handleSubmit(onSubmit)}>
        {/* Template Selection (only for creating) */}
        {isCreating && templates && templates.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold mb-4 text-sm text-gray-900">
              Start from Template
            </h4>
            <div className=" grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setValue('templateKey', '')}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${!selectedTemplate
                  ? 'bg-ocean-4 border-ocean-2'
                  : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <ApolloIcon
                    name="plus-circle"
                    className={`text-lg shrink-0 ${!selectedTemplate ? 'text-ocean-2' : 'text-gray-400'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${!selectedTemplate ? 'text-ocean-2' : 'text-gray-900'}`}>
                      Blank Template
                    </p>
                    <p className={`text-xs mt-0.5 ${!selectedTemplate ? 'text-ocean-2/70' : 'text-gray-500'}`}>
                  Start from scratch
                </p>
                  </div>
                  {!selectedTemplate && (
                    <ApolloIcon name="check-circle" className="text-ocean-2 shrink-0" />
                  )}
                </div>
              </button>

              {templates?.map((template) => {
                const isSelected = selectedTemplate === template.key;
                return (
                <button
                  key={template.key}
                  type="button"
                    onClick={() => setValue('templateKey', template.key)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${isSelected
                      ? 'bg-ocean-4 border-ocean-2'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ApolloIcon
                        name="file"
                        className={`text-lg shrink-0 ${isSelected ? 'text-ocean-2' : 'text-gray-400'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${isSelected ? 'text-ocean-2' : 'text-gray-900'}`}>
                    {template.name}
                  </p>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-ocean-2/70' : 'text-gray-500'}`}>
                    {template.permissionCount} permissions
                  </p>
                      </div>
                      {isSelected && (
                        <ApolloIcon name="check-circle" className="text-ocean-2 shrink-0" />
                      )}
                    </div>
                </button>
                );
              })}
            </div>
          </div>
        )}

        <div className='space-y-2'>
          {/* Role Name */}
          <FormItem
            label="Role Name (Internal)"
            invalid={!!errors.name}
            errorMessage={errors.name?.message}
          >
            <Controller
              name="name"
              control={control}
              rules={{
                required: 'Role name is required',
                pattern: {
                  value: /^[A-Za-z][A-Za-z0-9_]*$/,
                  message: 'Must start with letter, only letters/numbers/underscores',
                },
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="e.g., SalesManager"
                  disabled={role?.isSystem}
                  size="sm"
                />
              )}
            />
          </FormItem>

          {/* Display Name */}
          <FormItem
            label="Display Name"
            invalid={!!errors.displayName}
            errorMessage={errors.displayName?.message}
          >
            <Controller
              name="displayName"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="e.g., Sales Manager" size="sm" />
              )}
            />
          </FormItem>

          {/* Description */}
          <FormItem
            label="Description"
            invalid={!!errors.description}
            errorMessage={errors.description?.message}
          >
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  textArea
                  placeholder="What is this role for?"
                  style={{ minHeight: '80px' }}
                  size="sm"
                />
              )}
            />
          </FormItem>

          {/* Color Selection */}
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <UserColorPicker
                value={field.value || ''}
                onChange={(hexColor) => field.onChange(hexColor)}
                disabled={isPending}
                label="Color"
                error={errors.color?.message}
                />
            )}
          />
        </div>

        {role?.isSystem && (
          <div className="mt-2 rounded-lg bg-gray-50 p-2">
            <div className="flex items-center gap-2">
              <ApolloIcon
                name="alert-triangle"
                className=" shrink-0 text-sm text-gray-900 "
              />
              <span className="mt-0.5 text-xs font-medium leading-snug text-gray-800">
                System role - some fields cannot be modified.
              </span>
            </div>
          </div>
        )}
      </Form>
    </Drawer>
  );
};

export default RoleFormSidebar;
