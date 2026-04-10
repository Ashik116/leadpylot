'use client';

import { CardDetailsLeftPanel } from '@/components/kanban-ui/_components/CardDetailsLeftPanel';
import {
  Member,
  MemberAvatarGroup,
} from '@/components/kanban-ui/_components/MemberComponents/MemberAvatarGroup';
import { KanbanProvider } from '@/components/kanban-ui/_contexts';
import { getCustomFields } from '@/components/kanban-ui/_data/custom-fields-data';
import { getLabels } from '@/components/kanban-ui/_data/labels-data';
import { getMembersByIds } from '@/components/kanban-ui/_data/members-data';
import { useTaskOperations } from '@/components/kanban-ui/_hooks/useTaskOperations';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import ConfirmPopover from '@/components/shared/ConfirmPopover';
import { ColumnDef } from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import TicketForm from '@/components/shared/TicketForm/TicketForm';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useDeleteTask, useTask } from '@/hooks/useTasks';
import { ApiTask } from '@/services/TaskService';
import { TASKS_BY_ENTITY_KEY, useTasksByEntity } from '@/services/hooks/useTasksByEntity';
import { useAuthStore } from '@/stores/authStore';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import { useTableHeader } from '@/utils/hooks/useTableHeader';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

const TaskDeleteAction: React.FC<{
  taskId: string;
  onConfirmDelete: (taskId: string) => void;
  isDeleting: boolean;
}> = ({ taskId, onConfirmDelete, isDeleting }) => {
  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <ConfirmPopover
        title="Delete task"
        description="Are you sure you want to delete this task? This cannot be undone."
        confirmText="Delete"
        onConfirm={() => onConfirmDelete(taskId)}
        isLoading={isDeleting}
        placement="left"
        floatingClassName="!z-[100003]"
      >
        <Button
          onClick={(e) => e.stopPropagation()}
          size="xs"
          variant="plain"
          disabled={isDeleting}
          className="rounded-md bg-white p-1 text-red-500 transition-colors hover:!bg-red-50 hover:!text-red-600"
          title="Delete task"
          icon={<Trash2 className="h-3.5 w-3.5" />}
        />
      </ConfirmPopover>
    </div>
  );
};

interface CreateTicketWrapperProps {
  // offers?: any[];
  // opening?: any;
  // dashboardType?: 'offer' | 'opening' | 'lead';
  // taskType?: string;
  leadId: string;
  viewState: ViewState;
  onViewStateChange: (viewState: ViewState) => void;
  emailId?: string;
  listHeightClass?: string;
}

type ViewState = 'table' | 'details' | 'form';

export const CreateTicketWrapper: React.FC<CreateTicketWrapperProps> = ({
  leadId,
  // offers = [],
  // opening,
  // dashboardType,
  // taskType,
  viewState,
  onViewStateChange,
  emailId,
  listHeightClass = '60dvh',
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === Role.ADMIN;

  React.useEffect(() => {
    if (viewState === 'table') {
      setSelectedTaskId(null);
    }
  }, [viewState]);

  // Sync view state with external showCreateForm prop
  React.useEffect(() => {
    onViewStateChange(viewState);
  }, [viewState, onViewStateChange]);

  // Fetch tasks list
  const { data: tasksData, isLoading: isLoadingTasks } = useTasksByEntity(
    {
      lead_id: emailId ? undefined : leadId,
      email_id: emailId ? emailId : undefined,
      page: pageIndex,
      limit: pageSize,
    },
    !!leadId || !!emailId
  );

  // Fetch selected task details
  const {
    data: taskData,
    isLoading: isLoadingTask,
    error: taskError,
  } = useTask(selectedTaskId, !!selectedTaskId);

  const tasks = tasksData?.data || [];
  const totalTasks = tasksData?.meta?.total || 0;
  const task = taskData?.data;

  const deleteTaskMutation = useDeleteTask();
  const queryClient = useQueryClient();

  const handleConfirmDelete = useCallback(
    async (taskId: string) => {
      await deleteTaskMutation.mutateAsync(taskId);
      queryClient.invalidateQueries({ queryKey: [TASKS_BY_ENTITY_KEY] });
    },
    [deleteTaskMutation, queryClient]
  );

  const handleCreateTaskDialogClose = useCallback(() => {
    setCreateTaskDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: [TASKS_BY_ENTITY_KEY] });
  }, [queryClient]);
  const renderHeader = useTableHeader();
  // Table columns
  const columns: ColumnDef<ApiTask>[] = useMemo(
    () => [
      {
        id: 'taskTitle',
        header: () => renderHeader('Task Title'),
        accessorKey: 'taskTitle',
        enableSorting: false,
        cell: (props: any) => (
          <span className="font-medium">{props.row.original?.taskTitle || '-'}</span>
        ),
      },
      {
        id: 'assigned',
        header: () => renderHeader('Assigned To'),
        accessorKey: 'assigned',
        enableSorting: false,
        size: 200,
        cell: (props: any) => {
          const assigned = props.row.original?.assigned;

          const members: Member[] = Array.isArray(assigned)
            ? assigned
                .filter((member: any) => member !== null && member !== undefined)
                .map((member: any) => {
                  if (typeof member === 'string') {
                    return {
                      id: member,
                      name: member,
                      login: member,
                    };
                  }
                  return {
                    id: member._id || member.id || '',
                    name: member.name || member.login || member._id || '',
                    login: member.login,
                    email: member.email,
                  };
                })
                .filter((member: Member) => member.id)
            : [];

          if (members.length === 0) {
            return <span className="text-sm whitespace-nowrap text-gray-400">-</span>;
          }

          return <MemberAvatarGroup members={members} size={20} maxCount={3} />;
        },
      },
      {
        id: 'task_type',
        header: () => renderHeader('Task Type'),
        accessorKey: 'task_type',
        enableSorting: false,
        size: 200,
        cell: (props: any) => {
          const taskType = props.row.original?.task_type;
          if (!taskType) {
            return <span className="text-sm whitespace-nowrap text-gray-400">-</span>;
          }
          return (
            <div className="inline-block whitespace-nowrap">
              <StatusBadge status={taskType} />
            </div>
          );
        },
      },
      {
        id: 'createdAt',
        header: () => renderHeader('Created Date'),
        accessorKey: 'createdAt',
        enableSorting: false,
        size: 300,
        cell: (props: any) => (
          <span className="whitespace-nowrap">
            {props.row.original?.createdAt
              ? dateFormateUtils(props.row.original.createdAt, DateFormatType.SHOW_DATE)
              : '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => renderHeader('Actions'),
        enableSorting: false,
        size: 80,
        cell: (props: any) => {
          const taskId = props.row.original?._id;
          if (!taskId) return null;
          return (
            <TaskDeleteAction
              taskId={taskId}
              onConfirmDelete={handleConfirmDelete}
              isDeleting={deleteTaskMutation.isPending}
            />
          );
        },
      },
    ],
    [handleConfirmDelete, renderHeader]
  );

  // Task operations - initialize with selectedTaskId
  const operations = useTaskOperations({
    taskId: selectedTaskId || '',
    boardId: task?.board_id,
    onSuccess: () => {
      // Handle success
    },
    onError: () => {
      // Task operation error handled silently
    },
  });

  // Handle refetch
  const handleRefetch = () => {
    // Refetch task data - useTask hook will handle this automatically
  };

  // Transform task data for CardDetailsLeftPanel - only when task is available
  const transformTaskData = useMemo(() => {
    if (!task) return null;

    const taskLabelIds =
      !task?.labels || !Array.isArray(task.labels)
        ? []
        : task.labels
            .filter((l: any) => l.isSelected !== false)
            .map((l: any) => l._id || l.id)
            .filter(Boolean);

    const allLabels = getLabels();
    const taskLabelObjects =
      !task?.labels || !Array.isArray(task.labels)
        ? []
        : task.labels
            .filter((l: any) => l.isSelected !== false)
            .map((apiLabel: any) => {
              const labelId = apiLabel._id || apiLabel.id;
              const labelTitle = apiLabel.title || apiLabel.name || '';
              const localLabel = allLabels.find((l) => l.id === labelId || l.name === labelTitle);
              if (localLabel) {
                return localLabel;
              }
              return {
                id: labelId || '',
                _id: labelId,
                name: labelTitle,
                title: labelTitle,
                color: apiLabel.color || '#4bce97',
              };
            });

    const taskMemberIds =
      !task?.assigned || !Array.isArray(task.assigned)
        ? []
        : task.assigned
            .map((member: any) => {
              if (typeof member === 'string') {
                return member;
              }
              return member._id || member.id || '';
            })
            .filter(Boolean);

    const taskMemberObjects = getMembersByIds(taskMemberIds);

    const checklists =
      !task?.subTask || !Array.isArray(task.subTask)
        ? []
        : task.subTask.map((st) => ({
            id: st._id || `checklist-${crypto.randomUUID()}`,
            title: st.taskTitle || 'Checklist',
            items: Array.isArray(st.todo)
              ? st.todo.map((todo: any) => ({
                  id: todo._id || `item-${crypto.randomUUID()}`,
                  text: todo.title || '',
                  completed: todo.isCompleted || false,
                  dueDate: todo.dueDate,
                  dueTime: todo.dueTime,
                  assignedMembers: Array.isArray(todo.assigned)
                    ? todo.assigned
                    : Array.isArray(todo.assignedMembers)
                      ? todo.assignedMembers
                      : [],
                  reminder: todo.reminder,
                }))
              : [],
            hideCheckedItems: false,
            assignedMemberId: st.assigned,
            dueDate: st.dueDate,
            dueTime: st.dueTime,
          }));

    const taskCustomFields =
      !task?.custom_fields || !Array.isArray(task.custom_fields)
        ? []
        : task.custom_fields.map((cf) => {
            let value = cf.value;
            if (cf.field_type === 'todo' && Array.isArray(cf.todo)) {
              value = cf.todo.map((todo: any) => ({
                id: todo._id || todo.id,
                title: todo.title || todo.text || '',
                completed:
                  todo.isCompleted !== undefined ? todo.isCompleted : todo.completed || false,
                _id: todo._id,
              }));
            }
            return {
              fieldId: cf._id || cf.field_id || '',
              value: value,
            };
          });

    const attachments =
      !task?.attachment || !Array.isArray(task.attachment)
        ? []
        : task.attachment.map((att: any) => ({
            id: att._id || att.id,
            filename: att.filename || att.name || 'Unknown',
            size: att.size || 0,
            type: att.type || att.mimeType || 'application/octet-stream',
            uploadedBy: att.uploadedBy || att.uploaded_by || 'Unknown',
            uploadedAt: att.uploadedAt || att.uploaded_at || new Date().toISOString(),
            url: att.url || att.url_path,
          }));

    return {
      taskLabelIds,
      taskLabelObjects,
      taskMemberIds,
      taskMemberObjects,
      checklists,
      taskCustomFields,
      attachments,
    };
  }, [task]);

  // Handle row click - navigate to details view
  const handleRowClick = (row: ApiTask) => {
    // Disable clicks when form is open
    if (viewState === 'form') {
      return;
    }
    const taskId = row?._id;
    if (taskId) {
      setSelectedTaskId(taskId);
      onViewStateChange('details');
    }
  };

  // Handle form close
  const handleFormClose = () => {
    onViewStateChange('table');
  };

  // Handle details modal close
  const handleDetailsClose = () => {
    onViewStateChange('table');
    setSelectedTaskId(null);
  };

  // Handle pagination
  const handlePaginationChange = (page: number, newPageSize?: number) => {
    setPageIndex(page);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
  };

  // Get all available data for CardDetailsLeftPanel
  // const allLabels = getLabels();
  // const allMembers = getMembers();
  const allCustomFields = getCustomFields();

  const tasksHeaderContent = (
    <>
      {/* <h2 className="text-base font-medium">Tasks</h2> */}
      <Button
        variant="solid"
        size="xs"
        icon={<ApolloIcon name="plus" className="text-md" />}
        onClick={() => setCreateTaskDialogOpen(true)}
      >
        Create task
      </Button>
    </>
  );

  return (
    <>
      <Card className="relative flex h-full min-h-0 flex-col border-none">
        {/* When not in table view, show Tasks + Create task on their own row */}
        {viewState !== 'table' && (
          <div className="flex items-center gap-5">{tasksHeaderContent}</div>
        )}
        {/* Single scrollable container */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Form View - Show only when viewState is 'form' */}
          {/* {viewState === 'form' && (
                    <div className="border-b border-gray-200 bg-white">
                        <TicketForm
                            leadId={leadId}
                            emailId={emailId}
                            offers={offers}
                            opening={opening}
                            dashboardType={dashboardType}
                            taskType={taskType}
                            onClose={handleFormClose}
                            isOpen={viewState === 'form'}
                            variant="inline"
                        />
                    </div>
                )} */}

          {/* Table View - Show only when viewState is 'table' */}
          {viewState === 'table' && (
            <div className={`overflow-y-auto border-b border-gray-200`}>
              <BaseTable
                tableName="tasks-list"
                data={tasks}
                loading={isLoadingTasks}
                totalItems={totalTasks}
                pageIndex={pageIndex}
                pageSize={pageSize}
                columns={columns}
                showPagination={false}
                showSearchInActionBar={false}
                showActionsDropdown={true}
                showActionComponent={true}
                onRowClick={handleRowClick}
                onPaginationChange={handlePaginationChange}
                fixedHeight={listHeightClass}
                tableLayout="fixed"
                loadingRowSize={10}
                commonActionBarClasses="mt-0 mb-0"
                actionBarLeftContent={tasksHeaderContent}
              />
            </div>
          )}

          {/* Details View - Show in Modal Dialog */}
          {viewState === 'details' && (
            <Dialog
              isOpen={viewState === 'details' && !!selectedTaskId}
              onClose={handleDetailsClose}
              width={1000}
              contentClassName="max-h-[90vh] overflow-y-auto"
            >
              {/* Loading state for task details */}
              {selectedTaskId && isLoadingTask && !task && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">Loading task details...</div>
                </div>
              )}

              {/* Error state for task details */}
              {selectedTaskId && taskError && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-red-500">
                    Error loading task details. Please try again.
                  </div>
                </div>
              )}

              {/* Task Details - Show when task is loaded */}
              {selectedTaskId && task && transformTaskData && (
                <div className="w-full">
                  <KanbanProvider
                    initialBoardData={{
                      columns: {},
                      cards: {},
                      columnOrder: [],
                    }}
                    initialInboxCards={[]}
                  >
                    <CardDetailsLeftPanel
                      task={task}
                      description={task.taskDescription || ''}
                      onDescriptionChange={() => {}}
                      taskLabelObjects={transformTaskData.taskLabelObjects}
                      taskMembers={transformTaskData.taskMemberIds}
                      taskDates={task.dueDate ? { dueDate: task.dueDate } : undefined}
                      checklists={transformTaskData.checklists}
                      taskCustomFields={transformTaskData.taskCustomFields}
                      customFields={allCustomFields}
                      attachments={transformTaskData.attachments}
                      operations={operations}
                      onRefetch={handleRefetch}
                      hideBoardFeatures={false}
                      bodyClassName="border-r-0"
                    />
                  </KanbanProvider>
                </div>
              )}
            </Dialog>
          )}

          {/* Create Task Dialog */}
          <Dialog
            isOpen={createTaskDialogOpen}
            onClose={handleCreateTaskDialogClose}
            width={900}
            contentClassName="max-h-[90vh] overflow-y-auto"
          >
            <div className="flex max-h-[65dvh] flex-col">
              <div className="shrink-0 border-b border-gray-200 px-1 pb-2">
                <h6>Create Task</h6>
              </div>
              <TicketForm
                leadId={leadId}
                emailId={emailId}
                offers={[]}
                dashboardType="lead"
                taskType="lead"
                isOpen={createTaskDialogOpen}
                onClose={handleCreateTaskDialogClose}
                variant="modal"
              />
            </div>
          </Dialog>
        </div>
      </Card>
    </>
  );
};
