'use client';

import { FormPreloader } from '@/components/shared/loaders';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useMailServerMutations, useSetting } from '@/services/hooks/useSettings';
import {
  CreateMailServerRequest,
  MailServerInfo,
  apiTestMailServerConnection,
} from '@/services/SettingsService';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useProjects } from '@/services/hooks/useProjects';
import { useUsersByRole } from '@/services/hooks/useUsers';
import Switcher from '@/components/ui/Switcher';

// Schema for project-level agent assignments on mail server
const projectAssignmentSchema = z.object({
  project_id: z.string(),
  assigned: z.array(z.string()).default([]),
});

const MailServerSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    smtp: z.string().min(1, 'SMTP URL is required'),
    imap: z.string().min(1, 'IMAP URL is required'),
    smtp_port: z.number().min(1, 'SMTP Port is required').max(65535, 'Invalid SMTP Port'),
    imap_port: z.number().min(1, 'IMAP Port is required').max(65535, 'Invalid IMAP Port'),
    ssl: z.number().min(0, 'SSL is required').max(2, 'Invalid SSL value'),
    // New email system fields
    admin_email: z.string().email('Valid email is required').min(1, 'Admin email is required'),
    admin_password: z.string().min(1, 'Admin password is required'),
    auto_approve_emails: z.boolean().optional(),
    auto_approve_attachments: z.boolean().optional(),
    // Access control fields
    isRestricted: z.boolean().optional(),
    allowedAgents: z.array(z.string()).optional(),
    // Projects with per-project assigned agents (replaces assigned_users)
    projects: z.array(projectAssignmentSchema).optional().default([]),
  })
  .refine(
    (data) => {
      // If isRestricted is true, at least one of projects or allowedAgents must be provided
      if (data.isRestricted) {
        const hasProjects = data.projects && data.projects.length > 0;
        const hasAgents = data.allowedAgents && data.allowedAgents.length > 0;
        return hasProjects || hasAgents;
      }
      return true;
    },
    {
      message: 'When restricted, you must select at least one project or allowed agent',
      path: ['isRestricted'],
    }
  );

type MailServerForm = z.infer<typeof MailServerSchema>;
const MailServerFormWrapperComponent = ({
  type,
  id,
  isPage,
  onSuccess,
  onClose,
  hideProjectAssignments,
  title,
}: {
  type: 'create' | 'edit';
  id?: string;
  isPage?: boolean;
  onSuccess?: (data: any) => void;
  onClose?: () => void;
  hideProjectAssignments?: boolean;
  /** Header title when used in modal/dialog (e.g. "Add Mail Server") */
  title?: string;
}) => {
  // Always call useSetting hook with type and id
  // Use empty strings as default when not in edit mode
  const { data: mailserver, isLoading: isLoadingMailServer } = useSetting(
    'mailservers',
    id ? (id as string) : ''
  );

  // Get mutations for create and update operations
  const { createMailServerMutation, updateMailServerMutation } = useMailServerMutations(
    type === 'edit' && id ? (id as string) : undefined,
    isPage
  );

  // Fetch projects and agents for multi-select
  const { data: projectsData } = useProjects({ limit: 1000 });
  const { data: agentsData } = useUsersByRole('agent', { limit: 1000 });

  // Transform projects data for Select component
  const projectOptions = useMemo(() => {
    const projects = Array.isArray(projectsData) ? projectsData : projectsData?.data || [];
    return projects.map((project: any) => ({
      value: project._id,
      label:
        typeof project.name === 'string'
          ? project.name
          : project.name?.en_US || project.name || 'Unknown',
    }));
  }, [projectsData]);

  // Get agents for a specific project (from project's embedded agents array)
  const getProjectAgentOptions = (projectId: string) => {
    const projects = Array.isArray(projectsData) ? projectsData : (projectsData as any)?.data || [];
    const project = projects.find((p: any) => p._id === projectId);
    if (!project?.agents) return [];
    return project.agents
      .filter((agent: any) => agent.active !== false)
      .map((agent: any) => ({
        value: agent.user?._id || agent.user_id || agent._id,
        label: agent.alias_name || agent.user?.name || agent.user?.login || 'Unknown',
      }));
  };

  // Transform agents data for Select component (for access control)
  const agentOptions = useMemo(() => {
    if (!agentsData) return [];
    const agents = Array.isArray(agentsData) ? agentsData : (agentsData as any)?.data || [];
    return agents
      .filter((user: any) => user.role === 'Agent')
      .map((user: any) => ({
        value: user._id,
        label: `${user.info?.name || user.login || 'Unknown'}`,
      }));
  }, [agentsData]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues,
  } = useForm<MailServerForm>({
    resolver: zodResolver(MailServerSchema) as any,
    defaultValues: {
      name: '',
      smtp: '',
      imap: '',
      ssl: 1,
      smtp_port: 587,
      imap_port: 993,
      admin_email: '',
      admin_password: '',
      auto_approve_emails: false,
      auto_approve_attachments: false,
      isRestricted: false,
      projects: [],
      allowedAgents: [],
    },
  });

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    tested: boolean;
    isValid: boolean;
    message: string;
  }>({
    tested: false,
    isValid: false,
    message: '',
  });

  // Track validated form values for edit mode to detect changes after validation
  const [validatedFormValues, setValidatedFormValues] = useState<MailServerForm | null>(null);

  useEffect(() => {
    if (mailserver && type === 'edit' && id) {
      // Populate form with server data for edit mode
      const serverData = mailserver as any;

      // Load projects with assigned agents from info.projects
      const infoProjects = (serverData.info as any)?.projects;
      const loadedProjects = Array.isArray(infoProjects)
        ? infoProjects.map((p: any) => ({
            project_id: typeof p.project_id === 'string' ? p.project_id : p.project_id?._id || p.project_id?.toString() || '',
            assigned: Array.isArray(p.assigned)
              ? p.assigned.map((a: any) => (typeof a === 'string' ? a : a?._id || a?.toString() || ''))
              : [],
          }))
        : [];

      const formValues = {
        name: typeof serverData.name === 'string' ? serverData.name : serverData.name?.en_US || '',
        smtp: serverData.info?.smtp || '',
        imap: (serverData.info as any)?.imap || '',
        ssl: (serverData.info as any)?.ssl || 1,
        smtp_port: (serverData.info as any)?.smtp_port || 587,
        imap_port: (serverData.info as any)?.imap_port || 993,
        admin_email: (serverData.info as any)?.admin_email || '',
        admin_password: (serverData.info as any)?.admin_password || '',
        auto_approve_emails: (serverData.info as any)?.auto_approve_emails || false,
        auto_approve_attachments: (serverData.info as any)?.auto_approve_attachments || false,
        isRestricted:
          typeof serverData.isRestricted === 'boolean' ? serverData.isRestricted : false,
        projects: loadedProjects,
        allowedAgents: Array.isArray(serverData.allowedAgents) ? serverData.allowedAgents : [],
      };

      reset(formValues);
      // Reset validation status for edit mode - user must validate before updating
      setValidationStatus({
        tested: false,
        isValid: false,
        message: '',
      });
      setValidatedFormValues(null);
    } else if (type === 'create') {
      // Reset to default values for create mode
      reset({
        name: '',
        smtp: 'smtp.gmail.com',
        imap: 'imap.gmail.com',
        ssl: 2,
        smtp_port: 587,
        imap_port: 993,
        admin_email: '',
        admin_password: '',
        auto_approve_emails: false,
        auto_approve_attachments: false,
        isRestricted: false,
        projects: [],
        allowedAgents: [],
      });
      // Reset validation status for create mode
      setValidationStatus({
        tested: false,
        isValid: false,
        message: '',
      });
      setValidatedFormValues(null);
    }
  }, [mailserver, reset, type, id]);

  // Watch form values to detect changes in edit mode
  const currentFormValues = watch();

  // Check if form values have changed after validation
  const hasFormChanged = useMemo(() => {
    if (type !== 'edit' || !validatedFormValues) return false;

    // Compare current values with validated values
    const fieldsToCompare: (keyof MailServerForm)[] = [
      'name',
      'smtp',
      'imap',
      'ssl',
      'smtp_port',
      'imap_port',
      'admin_email',
      'admin_password',
      'auto_approve_emails',
      'auto_approve_attachments',
      'isRestricted',
      'projects',
      'allowedAgents',
    ];

    return fieldsToCompare.some((field) => {
      const current = currentFormValues[field];
      const validated = validatedFormValues[field];

      // Handle array of objects comparison (projects)
      if (Array.isArray(current) && Array.isArray(validated)) {
        if (current.length !== validated.length) return true;
        return JSON.stringify(current) !== JSON.stringify(validated);
      }

      return current !== validated;
    });
  }, [currentFormValues, validatedFormValues, type]);

  // Test/Validate connection handler (used for both create and edit modes)
  const handleTestConnection = async () => {
    const formData = getValues();

    // Validate form data first
    const validationResult = MailServerSchema.safeParse(formData);
    if (!validationResult.success) {
      setValidationStatus({
        tested: true,
        isValid: false,
        message: 'Please fill in all required fields correctly before testing connection.',
      });
      return;
    }

    setIsValidating(true);
    setValidationStatus({
      tested: false,
      isValid: false,
      message: 'Testing connection...',
    });

    try {
      const response = await apiTestMailServerConnection({
        name: formData.name,
        smtp: formData.smtp,
        imap: formData.imap,
        ssl: formData.ssl,
        smtp_port: formData.smtp_port,
        imap_port: formData.imap_port,
        admin_email: formData.admin_email,
        admin_password: formData.admin_password,
        auto_approve_emails: formData.auto_approve_emails || false,
        auto_approve_attachments: formData.auto_approve_attachments || false,
      });

      const isValid = response.is_validate;

      setValidationStatus({
        tested: true,
        isValid,
        message: response.message,
      });

      // In edit mode, store validated form values if validation is successful
      if (type === 'edit' && isValid) {
        setValidatedFormValues({ ...formData });
      } else if (type === 'edit' && !isValid) {
        // Reset validated values if validation fails
        setValidatedFormValues(null);
      }
    } catch (error: any) {
      setValidationStatus({
        tested: true,
        isValid: false,
        message:
          error.response?.data?.message ||
          error.message ||
          'Connection test failed. Please try again.',
      });
      // Reset validated values on error
      if (type === 'edit') {
        setValidatedFormValues(null);
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Reset validation when form values change in edit mode
  useEffect(() => {
    if (type === 'edit' && validatedFormValues && hasFormChanged) {
      // Reset validation status when form values change after validation
      setValidationStatus({
        tested: false,
        isValid: false,
        message: 'Please validate the connection again after making changes.',
      });
      setValidatedFormValues(null);
    }
  }, [hasFormChanged, type, validatedFormValues]);

  const onSubmit = (data: MailServerForm) => {
    const mailServerData: CreateMailServerRequest = {
      name: data.name,
      smtp: data.smtp,
      imap: data.imap,
      ssl: data.ssl,
      smtp_port: data.smtp_port,
      imap_port: data.imap_port,
      admin_email: data.admin_email,
      admin_password: data.admin_password,
      auto_approve_emails: data.auto_approve_emails || false,
      auto_approve_attachments: data.auto_approve_attachments || false,
      isRestricted: data.isRestricted || false,
      projects: data.projects && data.projects.length > 0 ? data.projects : [],
      allowedAgents:
        data.allowedAgents && data.allowedAgents.length > 0 ? data.allowedAgents : undefined,
    };

    if (type === 'create') {
      createMailServerMutation.mutate(mailServerData, {
        onSuccess: (result) => {
          // If onSuccess callback is provided, call it with the result
          if (onSuccess) {
            onSuccess(result);
          }
        },
      });
    } else if (type === 'edit' && id) {
      updateMailServerMutation.mutate(mailServerData, {
        onSuccess: (result) => {
          // If onSuccess callback is provided, call it with the result
          // Ensure the result includes the name from the form data
          if (onSuccess) {
            // Handle different response structures - API might return the server object directly
            // or wrapped in a server property, or in a data property
            const resultAny = result as any;
            const serverData = resultAny?.server || resultAny?.data || resultAny;
            const resultWithName = {
              ...serverData,
              name: serverData?.name || mailServerData.name,
              _id: serverData?._id || serverData?.id || id,
            };
            onSuccess(resultWithName);
          }
        },
      });
    }
  };

  const isLoading = createMailServerMutation.isPending || updateMailServerMutation.isPending;

  // Display loading state when fetching data in edit mode
  if (isLoadingMailServer && type === 'edit') {
    return (
      <FormPreloader
        showTitle={isPage}
        formFields={[
          'Name',
          'SMTP Address',
          'IMAP Address',
          'SSL Encryption',
          'Admin Email',
          'Admin Password',
        ]}
        showButtons={true}
        buttonCount={isPage ? 2 : 1}
        className="p-2"
      />
    );
  }
  const headerTitle =
    title ||
    (isPage
      ? type === 'create'
        ? 'Register Mail Server'
        : `${mailserver && 'name' in mailserver && mailserver?.name ? mailserver?.name : 'Mail'} Server`
      : null);

  const showHeader = isPage || !!title;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <form
        onSubmit={handleSubmit(onSubmit as any)}
        className="flex min-h-0 flex-1 flex-col overflow-hidden text-sm"
      >
        {/* Fixed header - shrink-0 */}
        {showHeader && (
          <div className="shrink-0 border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-medium capitalize text-gray-800">
                {headerTitle}
              </h1>
              {isPage && (
                <Button
                  variant="secondary"
                  onClick={onClose}
                  size="sm"
                  icon={<ApolloIcon name="times" className="text-md" />}
                />
              )}
            </div>
          </div>
        )}

        {/* Scrollable body - flex-1 min-h-0 overflow-y-auto */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2 pt-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input
              {...register('name')}
              placeholder="John Doe"
              invalid={!!errors.name}
              disabled={isLoading}
            />
            {errors.name && <span className="text-rust text-sm">{errors?.name?.message}</span>}
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">SMTP Address</label>
              <Input
                {...register('smtp')}
                placeholder="smtp.example.com"
                invalid={!!errors.smtp}
                disabled={isLoading}
              />
              {errors?.smtp && <span className="text-rust text-sm">{errors?.smtp?.message}</span>}
            </div>
            <div className="w-32">
              <label className="mb-1 block text-sm font-medium">SMTP Port</label>
              <Input
                {...register('smtp_port', { valueAsNumber: true })}
                type="number"
                placeholder="587"
                invalid={!!errors?.smtp_port}
                disabled={isLoading}
              />
              {errors.smtp_port && (
                <span className="text-rust text-sm">{errors?.smtp_port?.message}</span>
              )}
            </div>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">IMAP Address</label>
              <Input
                {...register('imap')}
                placeholder="imap.example.com"
                invalid={!!errors.imap}
                disabled={isLoading}
              />
              {errors.imap && <span className="text-rust text-sm">{errors?.imap?.message}</span>}
            </div>
            <div className="w-32">
              <label className="mb-1 block text-sm font-medium">IMAP Port</label>
              <Input
                {...register('imap_port', { valueAsNumber: true })}
                type="number"
                placeholder="993"
                invalid={!!errors.imap_port}
                disabled={isLoading}
              />
              {errors.imap_port && (
                <span className="text-rust text-sm">{errors?.imap_port?.message}</span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">SSL Encryption</label>
            <Select
              instanceId="ssl-encryption"
              placeholder="Please Select"
              options={[
                { value: 0, label: 'None' },
                { value: 1, label: 'SSL' },
                { value: 2, label: 'TLS' },
              ]}
              defaultValue={
                type === 'edit'
                  ? mailserver
                    ? {
                        value: ((mailserver as unknown as MailServerInfo)?.info as any)?.ssl || 1,
                        label:
                          ((mailserver as unknown as MailServerInfo)?.info as any)?.ssl === 0
                            ? 'None'
                            : ((mailserver as unknown as MailServerInfo)?.info as any)?.ssl === 2
                              ? 'TLS'
                              : 'SSL',
                      }
                    : { value: 1, label: 'SSL' }
                  : { value: 2, label: 'TLS' }
              }
              onChange={(selectedOption) => {
                setValue('ssl', selectedOption?.value || 1);
              }}
              isDisabled={isLoading}
            />
            {errors.ssl && <span className="text-rust text-sm">{errors?.ssl?.message}</span>}
          </div>

          {/* New Email System Configuration */}
          <div className="border-t pt-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">Email System Configuration</h3>

            <div>
              <label className="mb-1 block text-sm font-medium">Admin Email Address</label>
              <Input
                {...register('admin_email')}
                type="email"
                placeholder="admin@example.com"
                invalid={!!errors.admin_email}
                disabled={isLoading}
              />
              {errors.admin_email && (
                <span className="text-rust text-sm">{errors?.admin_email?.message}</span>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Email address for the new email system administration
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">
                Admin Password / App Password
              </label>
              <Input
                {...register('admin_password')}
                type="password"
                placeholder="Enter admin password or app password"
                invalid={!!errors.admin_password}
                disabled={isLoading}
              />
              {errors.admin_password && (
                <span className="text-rust text-sm">{errors?.admin_password?.message}</span>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Password or app-specific password for email system access
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto_approve_emails"
                  {...register('auto_approve_emails')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <label htmlFor="auto_approve_emails" className="text-sm font-medium text-gray-700">
                  Auto-approve email content
                </label>
              </div>
              <p className="ml-6 text-xs text-gray-500">
                Automatically approve email content without manual review
              </p>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto_approve_attachments"
                  {...register('auto_approve_attachments')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <label
                  htmlFor="auto_approve_attachments"
                  className="text-sm font-medium text-gray-700"
                >
                  Auto-approve email attachments
                </label>
              </div>
              <p className="ml-6 text-xs text-gray-500">
                Automatically approve email attachments without manual review
              </p>
            </div>

            {/* Test/Validate Connection Section */}
            <div className="mt-6 border-t pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    {type === 'create' ? 'Connection Test' : 'Validate Connection'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {type === 'create'
                      ? 'Test the IMAP connection before creating the mailserver'
                      : 'Validate the IMAP connection before updating the mailserver. You must validate after making any changes.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestConnection}
                  loading={isValidating}
                  disabled={isLoading || isValidating}
                  size="sm"
                  icon={<ApolloIcon name="check" className="text-md" />}
                >
                  {isValidating
                    ? 'Testing...'
                    : type === 'create'
                      ? 'Test Connection'
                      : 'Validate Connection'}
                </Button>
              </div>

              {/* Validation Status */}
              {validationStatus.tested && (
                <div
                  className={`mt-3 rounded-md p-3 ${
                    validationStatus.isValid
                      ? 'border border-green-200 bg-green-50'
                      : 'border border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start">
                    <ApolloIcon
                      name={validationStatus.isValid ? 'check-circle' : 'times-circle'}
                      className={`mr-2 text-lg ${
                        validationStatus.isValid ? 'text-green-600' : 'text-red-600'
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          validationStatus.isValid ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
                        {validationStatus.isValid ? 'Connection Successful' : 'Connection Failed'}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          validationStatus.isValid ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {validationStatus.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning message in edit mode when form has changed */}
              {type === 'edit' && hasFormChanged && !validationStatus.isValid && (
                <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-start">
                    <ApolloIcon name="info-circle" className="mr-2 text-lg text-yellow-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800">Changes Detected</p>
                      <p className="mt-1 text-xs text-yellow-700">
                        You have made changes to the mailserver configuration. Please validate the
                        connection again before updating.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Projects & Assigned Agents */}
          {!hideProjectAssignments && <div className="mt-6 border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">Projects & Assigned Agents</h3>
            <p className="mb-3 text-xs text-gray-500">
              Add projects to this mail server, then assign agents under each project.
            </p>

            {/* Project Selector */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Projects</label>
              <Select
                instanceId="projects-select"
                placeholder="Select projects..."
                isMulti
                options={projectOptions}
                value={projectOptions.filter((option: { value: string; label: string }) =>
                  (watch('projects') || []).some((p: any) => p.project_id === option.value)
                )}
                onChange={(selectedOptions) => {
                  const selectedIds = Array.isArray(selectedOptions)
                    ? selectedOptions.map((opt: { value: string }) => opt.value)
                    : [];
                  const currentProjects = watch('projects') || [];

                  // Preserve existing assignments for projects that remain selected
                  const updatedProjects = selectedIds.map((id: string) => {
                    const existing = currentProjects.find((p: any) => p.project_id === id);
                    return existing || { project_id: id, assigned: [] };
                  });

                  setValue('projects', updatedProjects);
                }}
                isDisabled={isLoading}
              />
            </div>

            {/* Per-project agent assignments */}
            {(watch('projects') || []).length > 0 && (
              <div className="space-y-3">
                {(watch('projects') || []).map((projectAssignment: any, index: number) => {
                  const projectName = projectOptions.find(
                    (p: { value: string; label: string }) => p.value === projectAssignment.project_id
                  )?.label || 'Unknown Project';
                  const agentOpts = getProjectAgentOptions(projectAssignment.project_id);

                  return (
                    <div key={projectAssignment.project_id} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        {projectName} — Assigned Agents
                      </label>
                      {agentOpts.length > 0 ? (
                        <Select
                          instanceId={`project-agents-${projectAssignment.project_id}`}
                          placeholder="Select agents for this project..."
                          isMulti
                          options={agentOpts}
                          value={agentOpts.filter((opt: { value: string; label: string }) =>
                            (projectAssignment.assigned || []).includes(opt.value)
                          )}
                          onChange={(selectedOptions) => {
                            const values = Array.isArray(selectedOptions)
                              ? selectedOptions.map((opt: { value: string }) => opt.value)
                              : [];
                            const currentProjects = [...(watch('projects') || [])];
                            currentProjects[index] = {
                              ...currentProjects[index],
                              assigned: values,
                            };
                            setValue('projects', currentProjects);
                          }}
                          isDisabled={isLoading}
                        />
                      ) : (
                        <p className="text-xs text-gray-400 italic">No agents in this project</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>}

          {/* Access Control */}
          <div className="mt-6 border-t pt-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Access Control</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Restrict Access</span>
                <Switcher
                  checked={watch('isRestricted') || false}
                  onChange={(checked) => {
                    setValue('isRestricted', checked);
                    if (!checked) {
                      setValue('allowedAgents', []);
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>

            {watch('isRestricted') && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Allowed Agents *</label>
                  <Select
                    instanceId="allowed-agents-select"
                    placeholder="Select agents"
                    isMulti
                    options={agentOptions}
                    value={agentOptions.filter((option: { value: string; label: string }) =>
                      ((watch('allowedAgents') as string[]) || []).includes(option.value)
                    )}
                    onChange={(selectedOptions) => {
                      const values = Array.isArray(selectedOptions)
                        ? selectedOptions.map((opt: { value: string; label: string }) => opt.value)
                        : [];
                      setValue('allowedAgents', values);
                    }}
                    isDisabled={isLoading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Select agents that can access this mail server.
                  </p>
                  {errors.isRestricted && (
                    <span className="text-rust text-sm">{errors.isRestricted.message}</span>
                  )}
                </div>
              </div>
            )}

            {!watch('isRestricted') && (
              <p className="text-sm text-gray-500">
                Enable &quot;Restrict Access&quot; to limit this mail server to specific agents.
              </p>
            )}
          </div>
        </div>

        {/* Fixed footer - shrink-0 */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-white pt-4">
          {isPage === true && (
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Close
            </Button>
          )}
          <Button
            type="submit"
            variant="solid"
            icon={
              type === 'create' ? (
                <ApolloIcon name="file" className="text-md" />
              ) : (
                <ApolloIcon name="file" className="text-md" />
              )
            }
            loading={isLoading}
            disabled={
              type === 'create'
                ? !validationStatus.isValid || isLoading
                : !validationStatus.isValid || isLoading || hasFormChanged
            }
            title={
              type === 'create' && !validationStatus.isValid
                ? 'Please test the connection first before creating'
                : type === 'edit' && !validationStatus.isValid
                  ? 'Please validate the connection before updating'
                  : type === 'edit' && hasFormChanged
                    ? 'Please validate the connection again after making changes'
                    : undefined
            }
          >
            {isLoading ? 'Saving...' : type === 'create' ? 'Create' : 'Update'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MailServerFormWrapperComponent;
