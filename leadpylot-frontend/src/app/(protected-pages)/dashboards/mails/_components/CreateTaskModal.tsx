'use client';

/**
 * CreateTaskModal Component
 * Modal for creating tasks from emails and assigning to agents
 */

import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import AxiosBase from '@/services/axios/AxiosBase';

import { EmailAttachment, EmailMessage } from '../_types';
import AttachmentSelector from './Shared/AttachmentSelector';

interface Agent {
  _id: string;
  name: string;
  login: string;
}

interface CreateTaskModalProps {
  emailId: string;
  emailSubject: string;
  leadId?: string;
  threadEmails?: EmailMessage[]; // NEW: Thread emails for attachment selection
  onClose: () => void;
}

export default function CreateTaskModal({
  emailId,
  emailSubject,
  leadId,
  threadEmails = [],
  onClose,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const [taskMessage, setTaskMessage] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState(3);
  const [dueDate, setDueDate] = useState('');
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]); // NEW

  // Collect all attachments from thread
  const allThreadAttachments = useMemo(() => {
    const attachments: EmailAttachment[] = [];
    threadEmails.forEach((email) => {
      if (email.attachments && email.attachments.length > 0) {
        attachments.push(...email.attachments);
      }
    });
    return attachments;
  }, [threadEmails]);

  // Auto-select all attachments by default
  useEffect(() => {
    if (allThreadAttachments.length > 0 && selectedAttachmentIds.length === 0) {
      setSelectedAttachmentIds(allThreadAttachments.map((att) => att.document_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allThreadAttachments.length]);

  // Fetch available agents
  const { data: agents = [], isLoading: isLoadingAgents } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await AxiosBase.get('/users/agents');
      return response.data.data || [];
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      await AxiosBase.post(`/email-system/${emailId}/tasks`, {
        message: taskMessage,
        assigned_to: assignedTo || undefined,
        priority,
        due_date: dueDate || undefined,
        lead_id: leadId || undefined,
        attachment_ids: selectedAttachmentIds.length > 0 ? selectedAttachmentIds : undefined, // NEW
      });
    },
    onSuccess: () => {
      toast.push(
        <Notification title="Success" type="success">
          Task created successfully
        </Notification>,

      );
      queryClient.invalidateQueries({ queryKey: ['email-tasks', emailId] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      onClose();
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to create task'}
        </Notification>,

      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskMessage.trim()) {
      toast.push(
        <Notification title="Error" type="warning">
          Please enter a task description
        </Notification>,

      );
      return;
    }

    createTaskMutation.mutate();
  };

  const priorityOptions = [
    { value: 1, label: 'Very Low', color: 'text-gray-500' },
    { value: 2, label: 'Low', color: 'text-blue-500' },
    { value: 3, label: 'Medium', color: 'text-yellow-500' },
    { value: 4, label: 'High', color: 'text-orange-500' },
    { value: 5, label: 'Very High', color: 'text-red-500' },
  ];

  const selectedPriority = priorityOptions.find((p) => p.value === priority);

  return (
    <Dialog isOpen={true} onClose={onClose} width={700}>
      <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col">
        {/* Header - Fixed */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <ApolloIcon name="check-square" className="text-2xl text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">Create Task from Email</h3>
              <p className="mt-1 line-clamp-1 text-sm text-gray-600">{emailSubject}</p>
            </div>
          </div>

          {/* Info indicator */}
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
            <ApolloIcon name="alert-circle" className="text-purple-600" />
            <span>Agent will see full thread with selected attachments</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          {/* Section 1: Task Description */}
          <div className="space-y-3">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-600">
                1
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-900">
                  Task Description <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500">Describe what needs to be done</p>
              </div>
            </div>
            <textarea
              value={taskMessage}
              onChange={(e) => setTaskMessage(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Call the customer back within 24 hours to discuss pricing..."
              required
            />
          </div>

          {/* Section 2: Assign To */}
          <div className="space-y-3">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-600">
                2
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-900">
                  Assign To <span className="text-sm font-normal text-gray-400">(Optional)</span>
                </label>
                <p className="text-xs text-gray-500">Select an agent to handle this task</p>
              </div>
            </div>

            {isLoadingAgents ? (
              <div className="text-sm text-gray-500">Loading agents...</div>
            ) : (
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name} (@{agent.login})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Section 3: Priority & Due Date - Combined Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Priority */}
            <div className="space-y-3">
              <div className="mb-3 flex items-center gap-2">
                <ApolloIcon name="flag" className="text-gray-400" />
                <div>
                  <label className="block text-base font-semibold text-gray-900">Priority</label>
                  <p className="text-xs text-gray-500">Set task importance</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div
                  className={`flex items-center gap-1 rounded-lg border-2 px-3 py-2 ${selectedPriority?.color} ${priority >= 4
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
            </div>

            {/* Due Date */}
            <div className="space-y-3">
              <div className="mb-3 flex items-center gap-2">
                <ApolloIcon name="calendar" className="text-gray-400" />
                <div>
                  <label className="block text-base font-semibold text-gray-900">
                    Due Date <span className="text-sm font-normal text-gray-400">(Optional)</span>
                  </label>
                  <p className="text-xs text-gray-500">Set completion deadline</p>
                </div>
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Section 4: Attachment Selection */}
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
              <AttachmentSelector
                attachments={allThreadAttachments}
                selectedAttachments={selectedAttachmentIds}
                onChange={setSelectedAttachmentIds}
                label=""
                helpText=""
              />
            </div>
          )}

          {/* Summary Box */}
          {assignedTo && (
            <div className="rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <ApolloIcon name="check-circle" className="text-xl text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="mb-3 flex items-center gap-2 text-base font-bold text-green-900">
                    <ApolloIcon name="star-filled" className="text-yellow-500" />
                    Task & Auto-Approval Summary
                  </p>

                  <div className="space-y-2">
                    {/* Task Info */}
                    <div className="rounded-lg border border-green-200 bg-white p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <ApolloIcon name="check-square" className="text-green-600" />
                        <span className="text-sm font-semibold text-gray-700">Task Details</span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-700">
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          <span className="font-medium">
                            {agents.find((a) => a._id === assignedTo)?.name}
                          </span>
                          <span className="text-xs text-gray-500">(Assigned Agent)</span>
                        </p>
                        <p className="ml-4 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-purple-400"></span>
                          <span>Priority: {selectedPriority?.label}</span>
                        </p>
                        {dueDate && (
                          <p className="ml-4 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                            <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Content Access */}
                    <div className="rounded-lg border border-green-200 bg-white p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <ApolloIcon name="mail" className="text-green-600" />
                        <span className="text-sm font-semibold text-gray-700">Agent Will See</span>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-start gap-2">
                          <ApolloIcon name="check" className="mt-0.5 text-xs text-green-600" />
                          <span className="text-gray-700">
                            <strong>Full email thread</strong> ({threadEmails.length} email
                            {threadEmails.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        {allThreadAttachments.length > 0 && (
                          <div className="flex items-start gap-2">
                            <ApolloIcon name="check" className="mt-0.5 text-xs text-green-600" />
                            <span className="text-gray-700">
                              <strong>
                                {selectedAttachmentIds.length} of {allThreadAttachments.length}{' '}
                                attachments
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Auto-Approval Note */}
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-2.5">
                      <p className="flex items-center gap-2 text-xs font-medium text-yellow-800">
                        <ApolloIcon name="star-filled" className="text-yellow-600" />
                        Task and all selected content will be automatically approved
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions - Fixed Footer */}
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
              disabled={createTaskMutation.isPending}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              loading={createTaskMutation.isPending}
              disabled={!taskMessage.trim() || createTaskMutation.isPending}
              icon={<ApolloIcon name="check-circle" />}
              className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 hover:from-purple-700 hover:to-pink-700"
            >
              {createTaskMutation.isPending
                ? 'Creating...'
                : assignedTo
                  ? 'Create & Approve'
                  : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
