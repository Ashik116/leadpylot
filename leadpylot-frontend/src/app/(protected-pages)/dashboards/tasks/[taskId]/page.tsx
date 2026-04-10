'use client';

import emailApiService from '@/app/(protected-pages)/dashboards/mails/_services/EmailApiService';
import toast from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Notification from '@/components/ui/Notification/Notification';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

interface TaskDetails {
  task: {
    createdAt?: string;
    _id: string;
    message: string;
    priority: number;
    due_date?: string;
    isDone: boolean;
    created_at: string;
    assigned_to?: {
      _id: string;
      name: string;
      login: string;
      email: string;
    };
    creator_id: {
      _id: string;
      name: string;
      login: string;
    };
    email_id?: {
      _id: string;
      subject: string;
      from: string;
      to: string[];
      received_at: string;
    };
    lead_id?: string;
  };
  leadDetails?: {
    _id: string;
    contact_name: string;
    email_from: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lead_status?: string;
    notes?: string;
    canAccessFullLead: boolean;
  };
  canAccessFullLead: boolean;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const taskId = params.taskId as string;

  // Fetch task details
  const { data, isLoading, error } = useQuery<TaskDetails>({
    queryKey: ['taskDetails', taskId],
    queryFn: async () => {
      const response = await emailApiService.getTaskDetails(taskId);
      return response.data;
    },
    enabled: !!taskId,
  });

  // Toggle task status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (isDone: boolean) => emailApiService.updateEmailTask(taskId, isDone),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['taskDetails', taskId] });
      queryClient.invalidateQueries({ queryKey: ['emailTasks'] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });

      toast.push(
        <Notification title="Success" type="success">
          {response.message || 'Task updated successfully'}
        </Notification>,

      );
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || error.message || 'Failed to update task'}
        </Notification>,

      );
    },
  });

  const handleToggleStatus = () => {
    if (data?.task) {
      toggleStatusMutation.mutate(!data.task.isDone);
    }
  };

  const handleNavigateToEmail = () => {
    if (data?.task.email_id?._id) {
      router.push(`/dashboards/mails?emailId=${data.task.email_id._id}`);
    }
  };

  const handleNavigateToLead = () => {
    if (data?.leadDetails?._id) {
      router.push(`/dashboards/leads/view?id=${data.leadDetails._id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">Failed to load task</div>
          <div className="text-gray-600">{(error as any).message}</div>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data?.task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-600">Task not found</div>
      </div>
    );
  }

  const { task, leadDetails, canAccessFullLead } = data;
  const priorityColors: Record<number, string> = {
    1: 'bg-red-100 text-red-800 border-red-300',
    2: 'bg-orange-100 text-orange-800 border-orange-300',
    3: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    4: 'bg-blue-100 text-blue-800 border-blue-300',
    5: 'bg-gray-100 text-gray-800 border-gray-300',
  };
  const priorityLabels: Record<number, string> = {
    1: 'Urgent',
    2: 'High',
    3: 'Medium',
    4: 'Low',
    5: 'Very Low',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* Header */}
      {/* <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Task ID:</span>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">{task._id}</code>
          </div>
        </div> */}

      {/* Task Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Status Header */}
        <div className={`p-4 ${task.isDone ? 'bg-green-50 border-b border-green-200' : 'bg-blue-50 border-b border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleStatus}
                disabled={toggleStatusMutation.isPending}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${task.isDone
                  ? 'bg-green-500 border-green-500'
                  : 'bg-white border-gray-300 hover:border-green-500'
                  } ${toggleStatusMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {task.isDone ? (
                  <ApolloIcon name="check-circle" />
                ) : (
                  <ApolloIcon name="pointer" className="animate-pulse" />
                )}
              </button>
              <div>
                <h1 className={`text-xl font-semibold ${task.isDone ? 'text-green-900' : 'text-blue-900'}`}>
                  {task.isDone ? 'Task Completed' : 'Task Pending'}
                </h1>
                <p className={`text-sm ${task.isDone ? 'text-green-700' : 'text-blue-700'}`}>
                  {task.isDone ? 'Well done!' : 'Click checkbox to mark as complete'}
                </p>
              </div>
            </div>
            <div className="space-y-2 flex items-end flex-col">
              <div className={`px-3 rounded-full border w-fit ${priorityColors[task.priority] || priorityColors[3]}`}>
                <span className="text-xs font-medium">{priorityLabels[task.priority] || 'Medium'} Priority</span>
              </div>
              <p className="text-gray-700  max-w-min truncate whitespace-wrap ">ID: <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">{task._id}</span></p>
            </div>
          </div>
        </div>

        {/* Task Details */}
        <div className="p-6 space-y-6">
          {/* Task Message */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Task Description</h2>
            <p className="text-gray-900 text-lg">{task.message}</p>
          </div>

          {/* Meta Information */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <span className="text-sm text-gray-500">Created By</span>
              <p className="text-gray-900 font-medium">{task.creator_id.name || task.creator_id.login}</p>
            </div>
            {task.assigned_to && (
              <div>
                <span className="text-sm text-gray-500">Assigned To</span>
                <p className="text-gray-900 font-medium">{task.assigned_to.name || task.assigned_to.login}</p>
              </div>
            )}
            <div>
              <span className="text-sm text-gray-500">Created</span>
              <p className="text-gray-900">{dateFormateUtils(task.createdAt || '')}</p>
            </div>
            {task.due_date && (
              <div>
                <span className="text-sm text-gray-500">Due Date</span>
                <p className="text-gray-900">{new Date(task.due_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Related Email */}
          {task.email_id && (
            <div className="pt-4 border-t border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Related Email</h2>
              <button
                onClick={handleNavigateToEmail}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">{task.email_id.subject}</p>
                    <p className="text-sm text-gray-600">From: {task.email_id.from}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(task.email_id.received_at).toLocaleString()}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          )}

          {/* Lead Details (if exists) */}
          {leadDetails && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">Lead Details</h2>
                {!canAccessFullLead && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Read-only (Temporary Access)
                  </span>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4 gap-2">
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-2"> <ApolloIcon name="user" className="inline-block text-sm" />Contact Name</div>
                  <p className="text-gray-900 font-medium">{leadDetails.contact_name}</p>
                </div>
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-2"><ApolloIcon name="mail" className="inline-block text-sm" /> Email</div>
                  <div className="text-gray-900">{leadDetails.email_from}</div>
                </div>
                {leadDetails.phone && (
                  <div>
                    <div className="text-sm text-gray-500 flex items-center gap-2"><ApolloIcon name="phone" className="inline-block text-sm" /> Phone</div>
                    <p className="text-gray-900">{leadDetails.phone}</p>
                  </div>
                )}
                {(leadDetails.address || leadDetails.city || leadDetails.state || leadDetails.zip) && (
                  <div>
                    <span className="text-sm text-gray-500">Address</span>
                    <p className="text-gray-900">
                      {[leadDetails.address, leadDetails.city, leadDetails.state, leadDetails.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}
                {leadDetails.lead_status && (
                  <div>
                    <span className="text-sm text-gray-500">Status</span>
                    <p className="text-gray-900">{leadDetails.lead_status}</p>
                  </div>
                )}
                {leadDetails.notes && (
                  <div>
                    <span className="text-sm text-gray-500">Notes</span>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{leadDetails.notes}</p>
                  </div>
                )}
                {canAccessFullLead && (
                  <button
                    onClick={handleNavigateToLead}
                    className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Open Full Lead
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

