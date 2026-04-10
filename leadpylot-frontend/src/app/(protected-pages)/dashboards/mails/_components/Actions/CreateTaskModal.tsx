'use client';

import { useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Dialog from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import DatePicker from '@/components/ui/DatePicker';
import FormItem from '@/components/ui/Form/FormItem';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import AttachmentSelector from '../Shared/AttachmentSelector';
import { EmailMessage } from '../../_types/email.types';
import PrelineFileUpload from '@/components/ui/Upload/PrelineFileUpload';
import { useCreateTask } from '../../_hooks';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useUserAgents } from '@/services/hooks/useUsers';

interface CreateTaskModalProps {
  emailId: string;
  emailSubject: string;
  leadId?: string;
  threadEmails?: EmailMessage[];
  onClose: () => void;
}

interface FormValues {
  message: string;
  assigned_to: string;
  task_type: string;
  priority: number;
  due_date: Date | null;
  attachment_ids: string[];
  attachments: File[];
}

export default function CreateTaskModal({
  emailId,
  emailSubject,
  leadId,
  threadEmails = [],
  onClose,
}: CreateTaskModalProps) {
  const { createTask, isPending } = useCreateTask({ emailId, onSuccess: onClose });
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      message: '',
      assigned_to: '',
      task_type: 'normal',
      priority: 3,
      due_date: null,
      attachment_ids: [],
      attachments: [],
    },
  });

  const assignedTo = watch('assigned_to');
  const taskType = watch('task_type');
  const priority = watch('priority');

  const allThreadAttachments = useMemo(() => {
    const attachments: any[] = [];
    threadEmails.forEach((email) => {
      if (email.attachments?.length) {
        attachments.push(...email.attachments);
      }
    });
    return attachments;
  }, [threadEmails]);

  useEffect(() => {
    if (allThreadAttachments.length > 0) {
      const ids = allThreadAttachments.map((att) => att.document_id);
      setValue('attachment_ids', ids);
    }
  }, [allThreadAttachments.length, setValue]);

  const { data: agents = [], isLoading: isLoadingAgents } = useUserAgents();

  const taskTypeOptions = [
    { value: 'normal', label: 'Normal Task' },
    { value: 'make_draft', label: 'Make Draft' },
  ];

  const priorityOptions = [
    { value: 2, label: 'Low', color: 'text-blue-500' },
    { value: 3, label: 'Medium', color: 'text-yellow-500' },
    { value: 4, label: 'High', color: 'text-orange-500' },
    { value: 5, label: 'Very High', color: 'text-red-500' },
  ];

  const selectedPriority = priorityOptions.find((p) => p.value === priority);

  const agentOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...agents.map((agent) => ({
        value: agent._id,
        label: `${(agent as any)?.info?.name} (@${agent.login})`,
      })),
    ],
    [agents]
  );

  const onSubmit = (data: FormValues) => {
    createTask({
      message: data.message,
      assigned_to: data.assigned_to || undefined,
      task_type: data.task_type,
      priority: data.priority,
      due_date: data.due_date ? data.due_date.toISOString().split('T')[0] : undefined,
      lead_id: leadId,
      attachment_ids: data.attachment_ids.length > 0 ? data.attachment_ids : undefined,
      attachments: data.attachments.length > 0 ? data.attachments : undefined,
    });
  };

  return (
    <Dialog isOpen={true} onClose={onClose} width={700}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[85vh] flex-col">
        <div className="border-b border-gray-200 pt-2 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <ApolloIcon name="check-square" className="text-2xl text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">Create Task from Email</h3>
              <p className="mt-1 line-clamp-1 text-sm text-gray-600">{emailSubject}</p>
            </div>
          </div>
        </div>

        <div className="min-h-[600px] flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <FormItem
            label="Task Description"
            invalid={!!errors.message}
            errorMessage={errors.message?.message}
            asterisk
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-600">
                1
              </div>
              <p className="text-xs text-gray-500">Describe what needs to be done</p>
            </div>
            <textarea
              {...register('message', { required: 'Task description is required' })}
              rows={4}
              className={`w-full resize-none rounded-lg border px-3 py-2 ${
                errors.message
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
              } focus:ring-2`}
              placeholder="e.g., Call the customer back within 24 hours to discuss pricing..."
            />
          </FormItem>

          {user?.role === Role.ADMIN && (
            <div className="grid grid-cols-2 gap-6">
              {/* Assign To */}
              <div className="space-y-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-600">
                    2
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-gray-900">
                      Assign To{' '}
                      <span className="text-sm font-normal text-gray-400">(Optional)</span>
                    </label>
                    <p className="text-xs text-gray-500">Select an agent to handle this task</p>
                  </div>
                </div>
                {isLoadingAgents ? (
                  <div className="text-sm text-gray-500">Loading agents...</div>
                ) : (
                  <Controller
                    name="assigned_to"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={agentOptions}
                        value={agentOptions.find((opt) => opt.value === field.value) || null}
                        onChange={(option) => field.onChange(option?.value || '')}
                        isClearable
                        placeholder="Select an agent..."
                        className="w-full"
                      />
                    )}
                  />
                )}
              </div>

              {/* Task Type */}
              <div className="space-y-3">
                <div className="mb-3 flex items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <ApolloIcon name="check-square" className="text-gray-400" />
                      <label className="block text-base font-semibold text-gray-900">
                        Task Type
                      </label>
                    </div>
                    <p className="pl-6 text-xs text-gray-500">Choose task action type</p>
                  </div>
                </div>
                <Controller
                  name="task_type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={taskTypeOptions}
                      value={taskTypeOptions.find((opt) => opt.value === field.value) || null}
                      onChange={(option) => field.onChange(option?.value || 'normal')}
                      className="w-full"
                    />
                  )}
                />
                <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                  <ApolloIcon
                    name={taskType === 'make_draft' ? 'mail' : 'check-circle'}
                    className={taskType === 'make_draft' ? 'text-blue-600' : 'text-green-600'}
                  />
                  <span className="text-xs text-gray-700">
                    {taskType === 'make_draft'
                      ? 'Agent will create a draft email'
                      : 'Standard task to complete'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="mb-3 flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ApolloIcon name="flag" className="text-gray-400" />
                    <label className="block text-base font-semibold text-gray-900">Priority</label>
                  </div>
                  <p className="pl-6 text-xs text-gray-500">Set task importance</p>
                </div>
              </div>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Select
                        options={priorityOptions}
                        value={priorityOptions.find((opt) => opt.value === field.value) || null}
                        onChange={(option) => field.onChange(option?.value || 3)}
                        className="w-full"
                      />
                    </div>
                    <div
                      className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 ${selectedPriority?.color} ${
                        priority >= 4
                          ? 'border-red-300 bg-red-50'
                          : priority === 3
                            ? 'border-yellow-300 bg-yellow-50'
                            : 'border-blue-300 bg-blue-50'
                      }`}
                    >
                      {priority >= 4 && <ApolloIcon name="alert-triangle" className="text-base" />}
                      {priority === 3 && <ApolloIcon name="alert-circle" className="text-base" />}
                      {priority <= 2 && <ApolloIcon name="check-circle" className="text-base" />}
                    </div>
                  </div>
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="mb-3 flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ApolloIcon name="calendar" className="text-gray-400" />
                    <label className="block text-base font-semibold text-gray-900">
                      Due Date <span className="text-sm font-normal text-gray-400">(Optional)</span>
                    </label>
                  </div>
                  <p className="pl-6 text-xs text-gray-500">Set completion deadline</p>
                </div>
              </div>
              <Controller
                name="due_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={new Date()}
                    placeholder="Select due date"
                    className="w-full"
                    clearable
                  />
                )}
              />
            </div>
          </div>

          {allThreadAttachments.length > 0 && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-600">
                  3
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-900">
                    Select Attachments to Share
                  </label>
                  <p className="text-xs text-gray-500">
                    {assignedTo
                      ? 'All attachments are selected by default. Uncheck to hide specific files.'
                      : 'Select attachments if you plan to assign this task'}
                  </p>
                </div>
              </div>
              <Controller
                name="attachment_ids"
                control={control}
                render={({ field }) => (
                  <AttachmentSelector
                    attachments={allThreadAttachments}
                    selectedAttachments={field.value}
                    onChange={field.onChange}
                    label=""
                    helpText=""
                  />
                )}
              />
            </div>
          )}

          <div className="border">
            <Controller
              name="attachments"
              control={control}
              render={({ field }) => (
                <PrelineFileUpload
                  onChange={(files) => field.onChange(files)}
                  multiple={true}
                  maxFileSize={4 * 1024 * 1024}
                />
              )}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <ApolloIcon name="alert-circle" className="text-gray-400" />
            <span>{assignedTo ? 'Task with auto-approval' : 'Task will be created'}</span>
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="plain"
              onClick={onClose}
              disabled={isPending}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              loading={isPending}
              disabled={isPending}
              icon={<ApolloIcon name="check-circle" />}
            >
              {isPending ? 'Creating...' : assignedTo ? 'Create & Approve' : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
