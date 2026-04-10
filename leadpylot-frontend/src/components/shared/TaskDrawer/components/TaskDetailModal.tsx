'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import Dialog from '@/components/ui/Dialog';
import Notification from '@/components/ui/Notification';
import Spinner from '@/components/ui/Spinner';
import toast from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { useTodoDetails, useUpdateTodoTypes } from '@/hooks/useTodoDetails';
import { apiToggleTodoStatus, type Document } from '@/services/ToDoService';
import { apiFetchDocument } from '@/services/DocumentService';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { getDocumentPreviewType } from '@/utils/documentUtils';
import { CiFileOn, CiImageOn } from 'react-icons/ci';
import { BsFilePdf, BsFileWord, BsFileExcel } from 'react-icons/bs';
import Timer from '@/app/(protected-pages)/dashboards/tickets/_components/Timer';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  onStatusChange?: () => void;
}

export const TaskDetailModal = ({
  isOpen,
  onClose,
  taskId,
  onStatusChange,
}: TaskDetailModalProps) => {
  const queryClient = useQueryClient();

  const { data: todo, isLoading, error } = useTodoDetails(taskId, { enabled: isOpen });

  const documentPreview = useDocumentPreview();
  const updateTodoTypesMutation = useUpdateTodoTypes(taskId);

  const toggleStatusMutation = useMutation({
    mutationFn: (isDone: boolean) => {
      if (!taskId) throw new Error('Task ID is required');
      return apiToggleTodoStatus(taskId, { isDone });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['todoDetails', taskId] });
      queryClient.invalidateQueries({ queryKey: ['emailTasks'] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      onStatusChange?.();

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
    if (todo) {
      toggleStatusMutation.mutate(!todo.isDone);
    }
  };

  const handleNavigateToEmail = () => {
    const emailId = typeof todo?.email_id === 'object' ? todo.email_id?._id : todo?.email_id;
    if (emailId) {
      window.open(`/dashboards/mails?emailId=${emailId}`, '_blank');
    }
  };

  const getDocuments = (): Document[] => {
    if (!todo) return [];

    // If documents array is populated, use it
    if (todo.documents && Array.isArray(todo.documents) && todo.documents.length > 0) {
      return todo.documents;
    }

    // If documents_ids contains Document objects, use them
    if (todo.documents_ids && Array.isArray(todo.documents_ids)) {
      const firstItem = todo.documents_ids[0];
      if (firstItem && typeof firstItem === 'object' && '_id' in firstItem) {
        return todo.documents_ids as Document[];
      }
    }

    return [];
  };

  const handlePreviewDocument = useCallback(
    (doc: Document) => {
      if (!doc._id) {
        console.error('Document missing _id:', doc);
        return;
      }

      const previewType = getDocumentPreviewType(doc.filetype || '', doc.filename) as
        | 'pdf'
        | 'image'
        | 'other';

      documentPreview.openPreview(doc._id, doc.filename, previewType);
    },
    [documentPreview]
  );

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const blob = await apiFetchDocument(doc._id);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.push(
        <Notification title="Success" type="success">
          Document downloaded successfully
        </Notification>,

      );
    } catch (error: any) {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || error.message || 'Failed to download document'}
        </Notification>,

      );
    }
  };

  const getFileIcon = (filetype: string) => {
    if (filetype.includes('pdf')) return <BsFilePdf />;
    if (filetype.includes('image')) return <CiImageOn />;
    if (filetype.includes('word') || filetype.includes('document')) return <BsFileWord />;
    if (filetype.includes('excel') || filetype.includes('spreadsheet')) return <CiFileOn />;
    return <CiFileOn />;
  };

  const handleToggleTodoType = useCallback(
    (todoTypeId: string) => {
      if (!todo?.todoTypesids) return;

      const updatedTodoTypes = todo.todoTypesids.map((type) => {
        if (type._id === todoTypeId) {
          return {
            todoTypeId: typeof type.todoTypeId === 'object' ? type.todoTypeId._id : type.todoTypeId,
            isDone: !type.isDone,
          };
        }
        return {
          todoTypeId: typeof type.todoTypeId === 'object' ? type.todoTypeId._id : type.todoTypeId,
          isDone: type.isDone,
        };
      });

      updateTodoTypesMutation.mutate({
        todoTypesids: updatedTodoTypes,
      });
    },
    [todo, updateTodoTypesMutation]
  );

  // const priorityColors: Record<number, string> = {
  //   1: 'bg-red-100 text-red-800 border-red-300',
  //   2: 'bg-orange-100 text-orange-800 border-orange-300',
  //   3: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  //   4: 'bg-blue-100 text-blue-800 border-blue-300',
  //   5: 'bg-gray-100 text-gray-800 border-gray-300',
  // };

  // const priorityLabels: Record<number, string> = {
  //   1: 'Urgent',
  //   2: 'High',
  //   3: 'Medium',
  //   4: 'Low',
  //   5: 'Very Low',
  // };

  if (!isOpen || !taskId) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={800}>
      <div className="max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Spinner size={40} />
          </div>
        ) : error ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-sm text-red-600">Failed to load task</div>
              <div className="text-sm text-gray-600">{(error as any).message}</div>
            </div>
          </div>
        ) : !todo ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center text-sm text-gray-600">Task not found</div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg">
            {/* Status Header */}
            <div className="border-b border-gray-200 pb-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleStatus}
                    disabled={toggleStatusMutation.isPending}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${todo.isDone
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 bg-white hover:border-green-500'
                      } ${toggleStatusMutation.isPending
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer'
                      }`}
                  >
                    {todo.isDone ? (
                      <ApolloIcon name="check-circle" />
                    ) : (
                      <ApolloIcon name="pointer" className="animate-pulse" />
                    )}
                  </button>
                  <div>
                    <h1
                      className={`text-sm font-semibold ${todo.isDone ? 'text-green-900' : 'text-blue-900'
                        }`}
                    >
                      {todo.isDone ? 'Task Completed' : 'Task Pending'} :{' '}
                      <label className="text-xs text-gray-500">ID: {todo._id}</label>
                    </h1>
                    <p className={`text-sm ${todo.isDone ? 'text-green-700' : 'text-blue-700'}`}>
                      {todo.isDone ? 'Well done!' : 'Click checkbox to mark as complete'}
                    </p>
                  </div>
                </div>
                {/* <div className="space-y-2 flex items-end flex-col"> */}
                {/* {todo.priority && (
                                        <div
                                            className={`px-3 mr-5 rounded-full border w-fit ${priorityColors[todo.priority] || priorityColors[3]
                                                }`}
                                        >
                                            <span className="text-xs font-medium">
                                                {priorityLabels[todo.priority] || 'Medium'} Priority
                                            </span>
                                        </div>
                                    )} */}
                {/* <p className="text-gray-700 max-w-min truncate whitespace-wrap">
                                        ID:{' '}
                                        <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                                            {todo._id}
                                        </span>
                                    </p> */}
                {/* </div> */}
              </div>
            </div>

            {/* Task Details */}
            <div className="space-y-6 py-2">
              {/* Task Message */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">Task Description</h2>
                  {/* Timer positioned at right side */}
                  {todo.createdAt && (
                    <div className="shrink-0">
                      <Timer
                        createdAt={todo.createdAt}
                        closedAt={
                          todo.isDone
                            ? (todo as any).dateOfDoneTime ||
                            (todo as any).dateOfDone ||
                            todo.updatedAt
                            : undefined
                        }
                        autoStart={true}
                        format="human"
                        showControls={false}
                        isDone={todo.isDone}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-900">{todo.message}</p>
              </div>
              {/* Todo Types */}
              {todo.todoTypesids && todo.todoTypesids.length > 0 && (
                <div className="border-t border-gray-200 pt-1">
                  <h2 className="mb-2 text-sm font-semibold text-gray-700">Todo Types</h2>
                  <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                    {todo.todoTypesids.map((todoType) => {
                      const todoTypeName =
                        typeof todoType.todoTypeId === 'object'
                          ? todoType.todoTypeId.name
                          : todoType.todoTypeId;
                      const todoTypeDescription =
                        typeof todoType.todoTypeId === 'object'
                          ? todoType.todoTypeId.description
                          : undefined;

                      return (
                        <div
                          key={todoType._id}
                          className={`inline-flex flex-col gap-1 rounded-md px-3 py-1.5 text-sm ${todoType.isDone
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={todoType.isDone}
                              onChange={() => handleToggleTodoType(todoType._id)}
                              disabled={updateTodoTypesMutation.isPending}
                              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="font-medium">{todoTypeName}</span>
                          </div>
                          {todoTypeDescription && (
                            <span className="pl-6 text-xs opacity-75">{todoTypeDescription}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Related Email */}
              {todo.email_id && typeof todo.email_id === 'object' && (
                <div className="border-t border-gray-200 pt-4">
                  <h2 className="mb-3 text-sm font-semibold text-gray-700">Related Email</h2>
                  <button
                    onClick={handleNavigateToEmail}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="mb-1 font-medium text-gray-900">
                          {todo.email_id.subject || 'Email'}
                        </p>
                        <p className="text-sm text-gray-600">
                          From: {todo.email_id.from || 'Unknown'}
                        </p>
                        {todo.email_id.received_at && (
                          <p className="mt-1 text-sm text-gray-500">
                            {new Date(todo.email_id.received_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <svg
                        className="mt-1 h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                </div>
              )}

              {/* Documents */}
              {getDocuments().length > 0 && (
                <div className="border-t border-gray-200 pt-1">
                  <h2 className="mb-2 text-sm font-semibold text-gray-700">Documents</h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {getDocuments().map((doc) => {
                      const isImage = doc.filetype?.includes('image');
                      return (
                        <div
                          key={doc._id}
                          onClick={() => handlePreviewDocument(doc)}
                          className={`group relative rounded-md border bg-white p-1 transition-all duration-200 hover:border-blue-300 hover:shadow-sm ${isImage ? 'border-blue-200' : 'border-gray-200'
                            }`}
                        >
                          {/* File Icon and Info */}
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${isImage ? 'bg-blue-50' : 'bg-gray-100'
                                }`}
                            >
                              {getFileIcon(doc.filetype)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm leading-tight font-medium text-gray-900">
                                {doc.filename}
                              </p>
                            </div>
                          </div>

                          {/* Size and Actions Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex min-w-0 flex-1 items-center gap-1">
                              <span className="truncate text-sm text-gray-500">
                                {doc.formattedSize}
                              </span>
                              {doc.type && (
                                <span className="truncate rounded bg-blue-100 px-1 py-0.5 text-sm font-medium text-blue-700">
                                  {doc.type}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDownloadDocument(doc);
                              }}
                              className="cursor-pointer rounded p-1 transition-colors hover:bg-blue-50"
                              title="Download"
                            >
                              <ApolloIcon
                                name="download"
                                className="h-3 w-3 text-gray-500 hover:text-blue-600"
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lead Details */}
              <div className="border-t border-gray-200 pt-1">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">Lead Details</h2>
                </div>

                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                  {/* Lead Information */}
                  {todo.lead_id &&
                    typeof todo.lead_id === 'object' &&
                    (todo.lead_id as any)?.contact_name && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <ApolloIcon name="user" className="inline-block text-sm" />
                            Contact Name
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {(todo.lead_id as any).contact_name}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <ApolloIcon name="mail" className="inline-block text-sm" />
                            Email
                          </div>
                          <div className="text-sm text-gray-900">
                            {(todo.lead_id as any).email_from}
                          </div>
                        </div>
                        {(todo.lead_id as any).phone && (
                          <div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <ApolloIcon name="phone" className="inline-block text-sm" />
                              Phone
                            </div>
                            <p className="text-sm text-gray-900">{(todo.lead_id as any).phone}</p>
                          </div>
                        )}
                      </div>
                    )}
                  {/* Meta Information */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-200 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-500">Created By:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {todo.creator_id?.login || 'Unknown'}
                      </span>
                    </div>
                    {todo.assigned_to && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-500">Assigned To:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {todo.assigned_to.login || todo.assigned_to.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-500">Created:</span>
                      <span className="text-sm text-gray-900">
                        {dateFormateUtils(todo.createdAt || '')}
                      </span>
                    </div>
                    {todo.due_date && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-500">Due Date:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(todo.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Document Preview Dialog */}
      <DocumentPreviewDialog {...documentPreview.dialogProps} title="Task Document Preview" />
    </Dialog>
  );
};
