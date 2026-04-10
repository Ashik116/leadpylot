'use client';

/**
 * EmailTaskList Component
 * Displays tasks associated with an email
 */

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import AxiosBase from '@/services/axios/AxiosBase';
import { EmailAttachment } from '../../_types/email.types';
import AssignToLeadModal from '../Actions/AssignToLeadModal';
import AttachmentList from '../Shared/AttachmentList';

interface TaskAttachment {
  _id: string;
  filename: string;
  filetype: string;
  size: number;
  path?: string;
  metadata?: {
    original_filename?: string;
    file_hash?: string;
    content_type?: string;
  };
  formattedSize?: string;
  id?: string;
}

interface EmailTask {
  _id: string;
  message: string;
  isDone: boolean;
  priority: number;
  due_date?: string;
  assigned_to?: {
    _id: string;
    name: string;
    login: string;
  };
  creator_id: {
    _id: string;
    name: string;
    login: string;
  };
  attachments?: TaskAttachment[];
  createdAt: string;
}

interface EmailTaskListProps {
  emailId: string;
  onCreateTask?: () => void;
  lead?: { _id: string } | null;
  emailSubject?: string;
  emailFrom?: string;
  onAttachmentClick?: (attachment: EmailAttachment) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function EmailTaskList({ emailId, onCreateTask, lead, emailSubject, emailFrom, onAttachmentClick, isExpanded = false, onToggle }: EmailTaskListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAssignModal, setShowAssignModal] = useState(false);

  const handleTaskAttachmentClick = useCallback(
    (attachment: TaskAttachment) => {
      if (!onAttachmentClick) return;

      if (!attachment?._id) {
        console.error('Task attachment missing _id:', attachment);
        return;
      }

      onAttachmentClick({
        _id: attachment._id,
        document_id: attachment._id,
        filename: attachment.filename,
        mime_type: attachment.filetype,
        size: attachment.size ?? 0,
        approved: true,
        path: attachment.path,
      });
    },
    [onAttachmentClick]
  );

  // Fetch tasks for this email
  const { data: tasks = [], isLoading } = useQuery<EmailTask[]>({
    queryKey: ['email-tasks', emailId],
    queryFn: async () => {
      const response = await AxiosBase.get(`/email-system/${emailId}/tasks`);
      return response.data.data || [];
    },
  });

  // Toggle task completion
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, isDone }: { taskId: string; isDone: boolean }) => {
      await AxiosBase.patch(`/email-system/tasks/${taskId}`, { isDone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-tasks', emailId] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to update task'}
        </Notification>,

      );
    },
  });

  const getPriorityColor = useCallback((priority: number) => {
    if (priority >= 4) return 'text-red-600 bg-red-50';
    if (priority === 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-blue-600 bg-blue-50';
  }, []);

  const getPriorityLabel = useCallback((priority: number) => {
    const labels = ['', 'Very Low', 'Low', 'Medium', 'High', 'Very High'];
    return labels[priority] || 'Medium';
  }, []);

  const isOverdue = useCallback((dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && !tasks.find(t => t.due_date === dueDate)?.isDone;
  }, [tasks]);

  const { pendingTasks, completedTasks } = useMemo(() => ({
    pendingTasks: tasks.filter(t => !t.isDone),
    completedTasks: tasks.filter(t => t.isDone),
  }), [tasks]);

  const hasLead = lead?._id;
  const header = (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={onToggle}>
      <div className="flex items-center gap-2">
        <ApolloIcon name="check-table" className="text-gray-600" />
        <h3 className="text-sm font-semibold text-amber-900">
          Tasks ({tasks.length})
        </h3>
        {pendingTasks.length > 0 && (
          <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded">
            {pendingTasks.length} pending
          </span>
        )}
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {!hasLead ? (
          <Button
            size="xs"
            variant="default"
            onClick={() => setShowAssignModal(true)}
            icon={<ApolloIcon name="user-plus" />}
          >
            Assign
          </Button>
        ) : (
          onCreateTask && (
            <Button
              size="xs"
              variant="plain"
              onClick={onCreateTask}
              icon={<ApolloIcon name="plus" />}
            >
              New Task
            </Button>
          )
        )}
        <ApolloIcon
          name={isExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
          className="text-gray-400"
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="border-t border-gray-200">
        {header}
        {isExpanded && (
          <div className="p-4">
            <div className="text-sm text-gray-500">Loading tasks...</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200">
      {header}
      {isExpanded && (
        <>
          {!hasLead ? (
            <div className="p-4 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                  No Lead Matched
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAssignModal(true)}
                  icon={<ApolloIcon name="user-plus" />}
                >
                  Assign to Lead
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <ApolloIcon name="checklist" className="text-4xl text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 mb-3">No tasks yet</p>
                  {onCreateTask && (
                    <Button
                      size="sm"
                      variant="plain"
                      onClick={onCreateTask}
                      icon={<ApolloIcon name="plus" />}
                    >
                      Create First Task
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Pending Tasks */}
                  {pendingTasks.map((task) => (
                    <div
                      key={task._id}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/dashboards/tasks/${task._id}`)}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={task.isDone}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleTaskMutation.mutate({ taskId: task._id, isDone: !task.isDone });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                          {task.message}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {/* Assigned To */}
                          {task.assigned_to ? (
                            <div className="flex items-center gap-1">
                              <ApolloIcon name="user" className="text-xs" />
                              <span>{task.assigned_to.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-600">
                              <ApolloIcon name="user" className="text-xs" />
                              <span>Unassigned</span>
                            </div>
                          )}

                          {/* Due Date */}
                          {task.due_date && (
                            <div className={`flex items-center gap-1 ${isOverdue(task.due_date) ? 'text-red-600 font-medium' : ''}`}>
                              <ApolloIcon name="calendar" className="text-xs" />
                              <span>
                                {isOverdue(task.due_date) && 'Overdue: '}
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {/* Priority */}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>

                        {/* Attachments */}
                        {task.attachments && (
                          <AttachmentList
                            attachments={task.attachments}
                            onAttachmentClick={handleTaskAttachmentClick}
                            size="xs"
                          />
                        )}
                      </div>

                      {/* Arrow Icon (visible on hover) */}
                      <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}

                  {/* Completed Tasks */}
                  {completedTasks.length > 0 && (
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Completed ({completedTasks.length})
                      </p>
                      {completedTasks.map((task) => (
                        <div
                          key={task._id}
                          className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 opacity-60 hover:opacity-100 cursor-pointer group transition-opacity"
                          onClick={() => router.push(`/dashboards/tasks/${task._id}`)}
                        >
                          <input
                            type="checkbox"
                            checked={true}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleTaskMutation.mutate({ taskId: task._id, isDone: false });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600 line-through group-hover:text-gray-900">
                              {task.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              {task.assigned_to && (
                                <span>{task.assigned_to.name}</span>
                              )}
                              <span>• Completed</span>
                            </div>

                            {/* Attachments */}
                            {task.attachments && (
                              <AttachmentList
                                attachments={task.attachments}
                                onAttachmentClick={handleTaskAttachmentClick}
                                size="xs"
                              />
                            )}
                          </div>
                          <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Assign to Lead Modal */}
      {showAssignModal && (
        <AssignToLeadModal
          emailId={emailId}
          emailSubject={emailSubject}
          emailFrom={emailFrom}
          onClose={() => {
            setShowAssignModal(false);
            // Invalidate queries to refresh the lead data
            queryClient.invalidateQueries({ queryKey: ['email', emailId] });
            queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
          }}
        />
      )}
    </div>
  );
}
